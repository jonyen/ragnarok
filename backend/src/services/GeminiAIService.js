const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { RunnableSequence } = require('@langchain/core/runnables');
const { Document } = require('@langchain/core/documents');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { MemoryVectorStore } = require('langchain/vectorstores/memory');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const logger = require('../utils/Logger');

class GeminiAIService {
  constructor() {
    this.llm = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      maxOutputTokens: 2048,
      temperature: 0.1,
    });
    
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      modelName: 'embedding-001',
    });
    
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async analyzeDocument(text) {
    try {
      const analysisPrompt = PromptTemplate.fromTemplate(`
        You are an expert document analyst. Analyze the following document and provide a structured analysis.
        
        Document content:
        {document}
        
        Please provide a JSON response with the following structure:
        {{
          "documentType": "type of document (resume, contract, article, etc.)",
          "keyThemes": ["theme1", "theme2", "theme3"],
          "entities": {{
            "names": ["name1", "name2"],
            "dates": ["date1", "date2"],
            "locations": ["location1", "location2"],
            "organizations": ["org1", "org2"]
          }},
          "summary": "brief summary of the document",
          "insights": ["insight1", "insight2", "insight3"],
          "confidence": 0.95
        }}
        
        Be concise and accurate in your analysis.
      `);

      const chain = RunnableSequence.from([
        analysisPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const result = await chain.invoke({
        document: text.substring(0, 8000), // Limit text length
      });
      
      try {
        return JSON.parse(result);
      } catch (parseError) {
        logger.warn('Failed to parse JSON response, returning fallback:', parseError.message);
        return {
          documentType: 'unknown',
          keyThemes: [],
          entities: {
            names: [],
            dates: [],
            locations: [],
            organizations: []
          },
          summary: result,
          insights: [],
          confidence: 0.5
        };
      }
    } catch (error) {
      logger.error('Gemini AI analysis error:', error);
      throw new Error('Failed to analyze document with AI');
    }
  }

  async createVectorStore(documentText) {
    try {
      // Split document into chunks
      const docs = await this.textSplitter.createDocuments([documentText]);
      
      // Create vector store with embeddings
      const vectorStore = await MemoryVectorStore.fromDocuments(
        docs,
        this.embeddings
      );
      
      return vectorStore;
    } catch (error) {
      logger.error('Error creating vector store:', error);
      throw new Error('Failed to create document index');
    }
  }

  async chatWithDocument(documentText, userMessage, conversationHistory = []) {
    try {
      // Create vector store for document retrieval
      const vectorStore = await this.createVectorStore(documentText);
      
      // Retrieve relevant chunks based on user query
      const relevantDocs = await vectorStore.similaritySearch(userMessage, 3);
      const context = relevantDocs.map(doc => doc.pageContent).join('\n\n');
      
      // Build conversation context
      const conversationContext = conversationHistory.length > 0 
        ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      const chatPrompt = PromptTemplate.fromTemplate(`
        You are a helpful AI assistant that helps users understand and interact with their documents.
        
        Document context (relevant sections):
        {context}
        
        {conversationHistory}
        
        User question: {question}
        
        Instructions:
        1. Answer based on the provided document context
        2. If the information is not in the document, say so clearly
        3. Be helpful and informative
        4. Keep responses concise but thorough
        5. If asked about specific details, reference the relevant parts of the document
        
        Response:
      `);

      const chain = RunnableSequence.from([
        chatPrompt,
        this.llm,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        context: context,
        conversationHistory: conversationContext,
        question: userMessage,
      });

      return response;
    } catch (error) {
      logger.error('Gemini AI chat error:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async chatWithDocumentAdvanced(documentText, userMessage, conversationHistory = [], options = {}) {
    try {
      const {
        maxChunks = 5,
        temperature = 0.1,
        includeMetadata = false
      } = options;

      // Create vector store
      const vectorStore = await this.createVectorStore(documentText);
      
      // Retrieve relevant chunks with metadata
      const relevantDocs = await vectorStore.similaritySearchWithScore(userMessage, maxChunks);
      
      // Filter by similarity score (optional)
      const filteredDocs = relevantDocs.filter(([doc, score]) => score < 0.8);
      
      const context = filteredDocs.map(([doc, score]) => {
        const content = doc.pageContent;
        const metadata = includeMetadata ? `[Metadata: ${JSON.stringify(doc.metadata)}]` : '';
        return `${content}${metadata}`;
      }).join('\n\n');

      const conversationContext = conversationHistory.length > 0 
        ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`
        : '';

      const advancedPrompt = PromptTemplate.fromTemplate(`
        You are an advanced AI assistant specialized in document analysis and Q&A.
        
        Document context (most relevant sections):
        {context}
        
        {conversationHistory}
        
        User question: {question}
        
        Guidelines:
        1. Base your response primarily on the document context provided
        2. If the question cannot be answered from the document, clearly state this
        3. Provide specific references to document sections when possible
        4. Maintain conversation continuity
        5. Be accurate, helpful, and professional
        6. If the question is ambiguous, ask for clarification
        
        Response:
      `);

      // Create a new LLM instance with custom temperature
      const customLLM = new ChatGoogleGenerativeAI({
        modelName: 'gemini-pro',
        maxOutputTokens: 2048,
        temperature: temperature,
      });

      const chain = RunnableSequence.from([
        advancedPrompt,
        customLLM,
        new StringOutputParser(),
      ]);

      const response = await chain.invoke({
        context: context,
        conversationHistory: conversationContext,
        question: userMessage,
      });

      return {
        response: response,
        metadata: {
          chunksRetrieved: filteredDocs.length,
          averageSimilarity: filteredDocs.reduce((sum, [_, score]) => sum + score, 0) / filteredDocs.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Advanced chat error:', error);
      throw new Error('Failed to generate advanced AI response');
    }
  }
}

module.exports = GeminiAIService;