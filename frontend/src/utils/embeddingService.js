import { HfInference } from '@huggingface/inference';

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

// Initialize Hugging Face client
const hf = new HfInference(getEnvVar('VITE_HUGGINGFACE_API_KEY') || getEnvVar('REACT_APP_HUGGINGFACE_API_KEY'));

// Configuration for Hugging Face embeddings
const EMBEDDING_CONFIG = {
  provider: 'huggingface',
  model: 'sentence-transformers/all-MiniLM-L6-v2', // Fast, good quality, 384 dimensions
  dimensions: 384
  // Alternative HF models:
  // 'sentence-transformers/all-mpnet-base-v2' // Better quality, 768 dimensions
  // 'sentence-transformers/multi-qa-MiniLM-L6-cos-v1' // Good for Q&A, 384 dimensions
};

/**
 * Generate simple hash-based embeddings for demo purposes (fallback)
 * @param {string} text - Text to embed
 * @returns {Array<number>} - Simple 384-dimensional embedding
 */
function generateSimpleEmbedding(text) {
  const dimensions = 384;
  const embedding = new Array(dimensions);
  
  // Simple hash-based approach for demo
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Generate pseudo-random but deterministic embedding
  for (let i = 0; i < dimensions; i++) {
    const seed = hash + i * 7919; // Use a prime number
    const value = Math.sin(seed) * 10000;
    embedding[i] = (value - Math.floor(value)) * 2 - 1; // Normalize to [-1, 1]
  }
  
  return embedding;
}

/**
 * Generate embeddings for text using Hugging Face
 * @param {string} text - Text to embed
 * @returns {Promise<Array<number>>} - Vector embedding
 */
export async function generateEmbedding(text) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const cleanText = text.trim();
    const apiKey = getEnvVar('VITE_HUGGINGFACE_API_KEY') || getEnvVar('REACT_APP_HUGGINGFACE_API_KEY');
    
    if (!apiKey || apiKey === 'your_huggingface_api_key_here' || apiKey.trim() === '') {
      // Fallback: Generate simple hash-based embeddings for demo
      console.warn('No Hugging Face API key configured. Using simple hash-based embeddings.');
      return generateSimpleEmbedding(cleanText);
    }
    
    try {
      const response = await hf.featureExtraction({
        model: EMBEDDING_CONFIG.model,
        inputs: cleanText,
      });
      // HF returns different formats, normalize to array
      return Array.isArray(response[0]) ? response[0] : response;
    } catch (apiError) {
      console.warn('Hugging Face API error, falling back to simple embeddings:', apiError.message);
      return generateSimpleEmbedding(cleanText);
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 * Generate embeddings for multiple text chunks in batch using Hugging Face
 * @param {Array<string>} texts - Array of texts to embed
 * @returns {Promise<Array<Array<number>>>} - Array of vector embeddings
 */
export async function generateBatchEmbeddings(texts) {
  try {
    if (!texts || texts.length === 0) {
      return [];
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      return [];
    }

    const apiKey = getEnvVar('VITE_HUGGINGFACE_API_KEY') || getEnvVar('REACT_APP_HUGGINGFACE_API_KEY');
    
    if (!apiKey || apiKey === 'your_huggingface_api_key_here' || apiKey.trim() === '') {
      // Fallback: Generate simple hash-based embeddings for demo
      console.warn('No Hugging Face API key configured. Using simple hash-based embeddings for batch.');
      return validTexts.map(text => generateSimpleEmbedding(text));
    }
    
    // HF doesn't support batch processing in the same way, so process sequentially
    const embeddings = [];
    for (const text of validTexts) {
      try {
        const embedding = await generateEmbedding(text);
        embeddings.push(embedding);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn('Error generating embedding for text chunk, using fallback:', error.message);
        embeddings.push(generateSimpleEmbedding(text));
      }
    }
    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} - Similarity score between -1 and 1
 */
export function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Find most similar chunks to a query
 * @param {string} query - Search query
 * @param {Array<Object>} chunks - Array of {text, embedding, metadata} objects
 * @param {number} topK - Number of top results to return
 * @returns {Promise<Array<Object>>} - Top similar chunks with similarity scores
 */
export async function findSimilarChunks(query, chunks, topK = 5) {
  try {
    if (!query || !chunks || chunks.length === 0) {
      return [];
    }

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarity scores
    const similarities = chunks.map((chunk, index) => ({
      ...chunk,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      index
    }));

    // Sort by similarity and return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  } catch (error) {
    console.error('Error finding similar chunks:', error);
    throw new Error(`Failed to find similar chunks: ${error.message}`);
  }
}

/**
 * Check if Hugging Face embedding provider is configured
 * @returns {boolean} - True if Hugging Face is configured
 */
export function isEmbeddingProviderConfigured() {
  const apiKey = getEnvVar('VITE_HUGGINGFACE_API_KEY') || getEnvVar('REACT_APP_HUGGINGFACE_API_KEY');
  return !!(apiKey && apiKey.trim() && apiKey !== 'your_huggingface_api_key_here');
}

/**
 * Get current embedding provider info
 * @returns {Object} - Provider configuration details
 */
export function getEmbeddingProviderInfo() {
  return {
    provider: EMBEDDING_CONFIG.provider,
    model: EMBEDDING_CONFIG.model,
    configured: isEmbeddingProviderConfigured(),
    dimensions: EMBEDDING_CONFIG.dimensions
  };
}


/**
 * Answer questions based on document context using LangChain (with Hugging Face fallback)
 * @param {string} question - User's question
 * @param {Array<Object>} relevantChunks - Relevant document chunks
 * @returns {Promise<string>} - Answer based on context
 */
export async function answerWithContext(question, relevantChunks) {
  try {
    if (!question || !relevantChunks || relevantChunks.length === 0) {
      throw new Error('Question and relevant chunks are required');
    }

    // Try LangChain first if available
    try {
      const { answerWithLangChain, isLangChainConfigured } = await import('./langchainService.js');
      if (isLangChainConfigured()) {
        console.log('Using LangChain for Q&A');
        return await answerWithLangChain(question, relevantChunks);
      }
    } catch (langchainError) {
      console.warn('LangChain failed, falling back to search results:', langchainError.message);
    }

    // Fallback: return search results with Hugging Face embeddings
    console.log('Using Hugging Face embeddings for document search');
    let response = `Based on your documents, here are the most relevant sections:\n\n`;
    relevantChunks.forEach((chunk, index) => {
      response += `**${chunk.document.metadata.name}** (similarity: ${(chunk.similarity * 100).toFixed(1)}%)\n`;
      response += `${chunk.text.substring(0, 200)}...\n\n`;
    });
    
    response += `💡 *Using Hugging Face embeddings for semantic document search.*`;
    return response;
    
  } catch (error) {
    console.error('Error answering with context:', error);
    throw new Error(`Failed to answer question: ${error.message}`);
  }
}