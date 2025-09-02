import { generateEmbedding, generateBatchEmbeddings, findSimilarChunks } from './embeddingService.js';

/**
 * Vector Store for managing document embeddings
 */
class VectorStore {
  constructor() {
    this.documents = new Map(); // fileId -> document data
    this.chunks = new Map(); // chunkId -> chunk data
    this.embeddings = new Map(); // chunkId -> embedding vector
    this.index = []; // Array of {chunkId, embedding, metadata} for search
  }

  /**
   * Add a document with its chunks and embeddings
   * @param {string} fileId - Unique file identifier
   * @param {Object} fileMetadata - File metadata (name, size, type, etc.)
   * @param {Array<string>} textChunks - Array of text chunks
   * @returns {Promise<void>}
   */
  async addDocument(fileId, fileMetadata, textChunks) {
    try {
      // Generate embeddings for all chunks
      const embeddings = await generateBatchEmbeddings(textChunks);
      
      // Store document metadata
      this.documents.set(fileId, {
        id: fileId,
        metadata: fileMetadata,
        chunkIds: [],
        createdAt: new Date(),
        totalChunks: textChunks.length
      });

      // Store chunks and embeddings
      const chunkIds = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunkId = `${fileId}_chunk_${i}`;
        chunkIds.push(chunkId);

        // Store chunk text
        this.chunks.set(chunkId, {
          id: chunkId,
          fileId: fileId,
          text: textChunks[i],
          index: i,
          metadata: {
            ...fileMetadata,
            chunkIndex: i,
            totalChunks: textChunks.length
          }
        });

        // Store embedding
        this.embeddings.set(chunkId, embeddings[i]);

        // Add to search index
        this.index.push({
          chunkId: chunkId,
          embedding: embeddings[i],
          fileId: fileId,
          metadata: {
            ...fileMetadata,
            chunkIndex: i,
            text: textChunks[i].substring(0, 100) + '...' // Preview
          }
        });
      }

      // Update document with chunk IDs
      const doc = this.documents.get(fileId);
      doc.chunkIds = chunkIds;

      console.log(`Added document ${fileId} with ${textChunks.length} chunks`);
    } catch (error) {
      console.error(`Error adding document ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search for similar chunks across all documents
   * @param {string} query - Search query
   * @param {number} topK - Number of results to return
   * @param {string} fileId - Optional: search within specific file only
   * @returns {Promise<Array<Object>>} - Similar chunks with metadata
   */
  async search(query, topK = 5, fileId = null) {
    try {
      let searchIndex = this.index;
      
      // Filter by file if specified
      if (fileId) {
        searchIndex = this.index.filter(item => item.fileId === fileId);
      }

      if (searchIndex.length === 0) {
        return [];
      }

      // Convert index to format expected by findSimilarChunks
      const chunksForSearch = searchIndex.map(item => ({
        text: this.chunks.get(item.chunkId).text,
        embedding: item.embedding,
        metadata: {
          ...item.metadata,
          chunkId: item.chunkId,
          fileId: item.fileId
        }
      }));

      // Find similar chunks
      const results = await findSimilarChunks(query, chunksForSearch, topK);

      // Enhance results with full chunk data
      return results.map(result => ({
        ...result,
        chunk: this.chunks.get(result.metadata.chunkId),
        document: this.documents.get(result.metadata.fileId)
      }));
    } catch (error) {
      console.error('Error searching vector store:', error);
      throw error;
    }
  }

  /**
   * Get all chunks for a specific document
   * @param {string} fileId - File identifier
   * @returns {Array<Object>} - Array of chunks with embeddings
   */
  getDocumentChunks(fileId) {
    const document = this.documents.get(fileId);
    if (!document) {
      return [];
    }

    return document.chunkIds.map(chunkId => ({
      chunk: this.chunks.get(chunkId),
      embedding: this.embeddings.get(chunkId)
    }));
  }

  /**
   * Remove a document and all its chunks from the store
   * @param {string} fileId - File identifier
   */
  removeDocument(fileId) {
    const document = this.documents.get(fileId);
    if (!document) {
      return;
    }

    // Remove all chunks and embeddings
    document.chunkIds.forEach(chunkId => {
      this.chunks.delete(chunkId);
      this.embeddings.delete(chunkId);
    });

    // Remove from search index
    this.index = this.index.filter(item => item.fileId !== fileId);

    // Remove document
    this.documents.delete(fileId);

    console.log(`Removed document ${fileId}`);
  }

  /**
   * Get statistics about the vector store
   * @returns {Object} - Store statistics
   */
  getStats() {
    return {
      totalDocuments: this.documents.size,
      totalChunks: this.chunks.size,
      totalEmbeddings: this.embeddings.size,
      indexSize: this.index.length,
      memoryUsage: {
        documents: this.documents.size,
        chunks: this.chunks.size,
        embeddings: this.embeddings.size * 1536 * 4 // Approximate bytes for ada-002 embeddings
      }
    };
  }

  /**
   * List all documents in the store
   * @returns {Array<Object>} - Array of document metadata
   */
  listDocuments() {
    return Array.from(this.documents.values());
  }

  /**
   * Check if a document exists
   * @param {string} fileId - File identifier
   * @returns {boolean} - True if document exists
   */
  hasDocument(fileId) {
    return this.documents.has(fileId);
  }

  /**
   * Clear all data from the store
   */
  clear() {
    this.documents.clear();
    this.chunks.clear();
    this.embeddings.clear();
    this.index = [];
    console.log('Vector store cleared');
  }

  /**
   * Export store data (for backup/persistence)
   * @returns {Object} - Serializable store data
   */
  export() {
    return {
      documents: Object.fromEntries(this.documents),
      chunks: Object.fromEntries(this.chunks),
      embeddings: Object.fromEntries(this.embeddings),
      index: this.index,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import store data (for restore/persistence)
   * @param {Object} data - Previously exported store data
   */
  import(data) {
    this.documents = new Map(Object.entries(data.documents || {}));
    this.chunks = new Map(Object.entries(data.chunks || {}));
    this.embeddings = new Map(Object.entries(data.embeddings || {}));
    this.index = data.index || [];
    
    console.log(`Imported vector store with ${this.documents.size} documents`);
  }
}

// Create singleton instance
let vectorStoreInstance = null;

/**
 * Get the singleton vector store instance
 * @returns {VectorStore} - Vector store instance
 */
export function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}

export default VectorStore;