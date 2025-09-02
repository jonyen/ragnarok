# LangChain Integration

This document describes the LangChain integration for the Ragnarok document analysis system.

## Overview

The GeminiAIService has been enhanced with LangChain to provide better context handling, document chunking, and semantic search capabilities.

## Key Features

### 1. Document Analysis
- Uses LangChain's PromptTemplate for structured prompts
- Improved JSON parsing with fallback handling
- Better error handling and logging

### 2. Vector Store Integration
- Automatic document chunking using RecursiveCharacterTextSplitter
- Vector embeddings using Google's embedding-001 model
- In-memory vector store for semantic search

### 3. Advanced Chat with Context
- Semantic search to find relevant document chunks
- Conversation history integration
- Configurable parameters (temperature, max chunks, etc.)
- Metadata tracking for debugging

## API Endpoints

### Standard Chat
```
POST /api/chat
{
  "documentId": "string",
  "message": "string",
  "conversationHistory": []
}
```

### Advanced Chat (LangChain)
```
POST /api/chat/advanced
{
  "documentId": "string",
  "message": "string",
  "conversationHistory": [],
  "options": {
    "maxChunks": 5,
    "temperature": 0.1,
    "includeMetadata": false
  }
}
```

## Configuration

### Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key
- `NODE_ENV`: Environment (development/production)

### LangChain Settings
- **Chunk Size**: 1000 characters
- **Chunk Overlap**: 200 characters
- **Max Output Tokens**: 2048
- **Default Temperature**: 0.1

## Benefits

1. **Better Context**: Semantic search finds the most relevant document sections
2. **Improved Responses**: More accurate answers based on document content
3. **Scalability**: Efficient chunking and retrieval for large documents
4. **Debugging**: Metadata provides insights into search performance
5. **Flexibility**: Configurable parameters for different use cases

## Usage Examples

### Basic Document Analysis
```javascript
const aiService = new GeminiAIService();
const analysis = await aiService.analyzeDocument(documentText);
```

### Advanced Chat
```javascript
const result = await aiService.chatWithDocumentAdvanced(
  documentText,
  userMessage,
  conversationHistory,
  {
    maxChunks: 5,
    temperature: 0.1,
    includeMetadata: true
  }
);
```

## Error Handling

The service includes comprehensive error handling:
- API failures fall back gracefully
- Invalid JSON responses are handled
- Detailed logging for debugging
- User-friendly error messages

## Performance Considerations

- Vector store is created per request (consider caching for production)
- Embeddings are generated on-demand
- Chunk size can be adjusted based on document characteristics
- Memory usage scales with document size
