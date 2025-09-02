import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';

// Get environment variables with Vite import.meta.env
const getEnvVar = (key, defaultValue = '') => {
  // Try Vite environment variables first
  try {
    if (import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // import.meta not available, continue to fallback
  }
  
  // Fallback for other environments
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // process not available, use default
  }
  
  return defaultValue;
};

// Configuration for LLM providers
const LLM_CONFIG = {
  provider: getEnvVar('VITE_LLM_PROVIDER') || 'google', // Default to Google Gemini
  models: {
    openai: 'gpt-3.5-turbo',
    google: 'gemini-1.5-flash' // Updated to available model
  }
};

/**
 * Initialize the LLM based on configuration
 * @returns {Object} - LangChain LLM instance
 */
function initializeLLM() {
  console.log('LLM_CONFIG:', LLM_CONFIG);
  console.log('Provider:', LLM_CONFIG.provider);
  console.log('Models:', LLM_CONFIG.models);
  
  if (LLM_CONFIG.provider === 'openai') {
    const apiKey = getEnvVar('VITE_OPENAI_API_KEY');
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim() || apiKey === 'your_openai_api_key_here') {
      throw new Error('OpenAI API key not configured');
    }
    
    return new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: LLM_CONFIG.models.openai,
      temperature: 0.1,
    });
  } else if (LLM_CONFIG.provider === 'google') {
    const apiKey = getEnvVar('VITE_GOOGLE_API_KEY');
    console.log('Google API Key:', apiKey ? apiKey.substring(0, 10) + '...' : 'undefined');
    console.log('Model name:', LLM_CONFIG.models.google);
    
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim() || apiKey === 'your_google_api_key_here') {
      throw new Error('Google API key not configured');
    }
    
    // Use correct parameters based on JS LangChain documentation
    return new ChatGoogleGenerativeAI({
      apiKey: apiKey.trim(),
      model: LLM_CONFIG.models.google,
      temperature: 0.1,
    });
  } else {
    throw new Error(`Unsupported LLM provider: ${LLM_CONFIG.provider}`);
  }
}

/**
 * Create a RAG chain using LangChain (similar to resumebot pattern)
 * @param {Array<Object>} relevantChunks - Array of relevant document chunks
 * @returns {Object} - LangChain RAG chain
 */
function createRAGChain(relevantChunks) {
  const llm = initializeLLM();
  
  const ragPrompt = PromptTemplate.fromTemplate(`
You are Ragnarok, an AI assistant that can answer questions using both your general knowledge and provided document context.

Today's date: {date}

Context from uploaded documents:
{context}

Question: {input}

Please provide a helpful answer based on both your general knowledge and the document context above. If the question can be answered using the document context, prioritize that information. If not, use your general knowledge to provide a useful response.

Answer:`);

  const outputParser = new StringOutputParser();
  
  // Create the RAG chain similar to resumebot pattern
  const ragChain = RunnableSequence.from([
    // Step 1: Prepare context from retrieved documents
    {
      context: () => {
        if (relevantChunks && relevantChunks.length > 0) {
          return relevantChunks
            .map((chunk, index) => `[${chunk.document.metadata.name}]\n${chunk.text}`)
            .join('\n\n---\n\n');
        }
        return "No relevant documents found.";
      },
      date: () => new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      input: (input) => input.input || input
    },
    // Step 2: Apply prompt template
    ragPrompt,
    // Step 3: Generate response with LLM
    llm,
    // Step 4: Parse output
    outputParser,
  ]);

  return ragChain;
}

/**
 * Answer questions using RAG chain (similar to resumebot pattern)
 * @param {string} question - User's question
 * @param {Array<Object>} relevantChunks - Relevant document chunks
 * @returns {Promise<string>} - Answer based on context
 */
export async function answerWithLangChain(question, relevantChunks) {
  try {
    if (!question || question.trim().length === 0) {
      throw new Error('Question cannot be empty');
    }

    const ragChain = createRAGChain(relevantChunks);
    
    const result = await ragChain.invoke({
      input: question,
    });

    return result;
  } catch (error) {
    console.error('LangChain Q&A error:', error);
    throw new Error(`Failed to answer question with LangChain: ${error.message}`);
  }
}

/**
 * Generate a summary of document content using LangChain
 * @param {string} text - Text to summarize
 * @param {number} maxLength - Maximum length of summary
 * @returns {Promise<string>} - Summary text
 */
export async function generateSummaryWithLangChain(text, maxLength = 200) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const llm = initializeLLM();
    
    const summaryPrompt = PromptTemplate.fromTemplate(`
Please provide a concise summary of the following text in approximately {maxLength} words or less.
Focus on the key points and main ideas.

Text:
{text}

Summary:`);

    const outputParser = new StringOutputParser();
    
    const chain = RunnableSequence.from([
      summaryPrompt,
      llm,
      outputParser,
    ]);

    const result = await chain.invoke({
      text: text.substring(0, 4000), // Limit input length
      maxLength: maxLength,
    });

    return result;
  } catch (error) {
    console.error('LangChain summary error:', error);
    throw new Error(`Failed to generate summary with LangChain: ${error.message}`);
  }
}

/**
 * Extract key topics and themes from documents using LangChain
 * @param {Array<Object>} documents - Array of document chunks
 * @returns {Promise<Array<string>>} - Array of key topics
 */
export async function extractTopicsWithLangChain(documents) {
  try {
    if (!documents || documents.length === 0) {
      return [];
    }

    const llm = initializeLLM();
    
    // Combine document texts for analysis
    const combinedText = documents
      .slice(0, 5) // Limit to first 5 documents to avoid token limits
      .map(doc => doc.text)
      .join('\n\n')
      .substring(0, 3000); // Limit total length

    const topicsPrompt = PromptTemplate.fromTemplate(`
Analyze the following document content and extract the main topics and themes.
Return a list of 3-7 key topics, separated by commas.
Focus on the most important and relevant themes.

Document Content:
{content}

Key Topics:`);

    const outputParser = new StringOutputParser();
    
    const chain = RunnableSequence.from([
      topicsPrompt,
      llm,
      outputParser,
    ]);

    const result = await chain.invoke({
      content: combinedText,
    });

    // Parse the comma-separated topics
    const topics = result
      .split(',')
      .map(topic => topic.trim())
      .filter(topic => topic.length > 0)
      .slice(0, 7); // Limit to 7 topics

    return topics;
  } catch (error) {
    console.error('LangChain topics extraction error:', error);
    return [];
  }
}

/**
 * Check if LangChain LLM is configured and available
 * @returns {boolean} - True if LLM is configured
 */
export function isLangChainConfigured() {
  try {
    if (LLM_CONFIG.provider === 'openai') {
      const apiKey = getEnvVar('VITE_OPENAI_API_KEY');
      return !!(apiKey && typeof apiKey === 'string' && apiKey.trim() && apiKey !== 'your_openai_api_key_here');
    } else if (LLM_CONFIG.provider === 'google') {
      const apiKey = getEnvVar('VITE_GOOGLE_API_KEY');
      return !!(apiKey && typeof apiKey === 'string' && apiKey.trim() && apiKey !== 'your_google_api_key_here');
    }
    return false;
  } catch (error) {
    console.warn('Error checking LangChain configuration:', error);
    return false;
  }
}

/**
 * Get current LLM provider info
 * @returns {Object} - Provider configuration details
 */
export function getLangChainProviderInfo() {
  return {
    provider: LLM_CONFIG.provider,
    model: LLM_CONFIG.models[LLM_CONFIG.provider],
    configured: isLangChainConfigured(),
  };
}