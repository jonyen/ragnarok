/**
 * PostgreSQL with pgvector configuration and utilities
 * 
 * Google Cloud SQL for PostgreSQL supports pgvector extension:
 * - Create Cloud SQL PostgreSQL instance (version 13+)
 * - Enable pgvector extension: CREATE EXTENSION vector;
 * - Use vector data type for embeddings: vector(384) or vector(1536)
 */

/**
 * SQL schema for document embeddings with pgvector
 */
export const PGVECTOR_SCHEMA = {
  // Documents table
  documents: `
    CREATE TABLE IF NOT EXISTS documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      file_name TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB,
      total_chunks INTEGER DEFAULT 0,
      processed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `,

  // Document chunks with vector embeddings
  document_chunks: `
    CREATE TABLE IF NOT EXISTS document_chunks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      embedding vector(384), -- Use 384 for HuggingFace, 1536 for OpenAI
      token_count INTEGER,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      UNIQUE(document_id, chunk_index)
    );
  `,

  // Indexes for better performance
  indexes: `
    CREATE INDEX IF NOT EXISTS idx_documents_file_name ON documents(file_name);
    CREATE INDEX IF NOT EXISTS idx_documents_upload_date ON documents(upload_date);
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
    
    -- Vector similarity search index (HNSW for fast approximate search)
    CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
    
    -- Alternative: IVFFlat index for exact search (better for smaller datasets)
    -- CREATE INDEX IF NOT EXISTS idx_chunks_embedding_ivfflat 
    -- ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  `
};

/**
 * SQL queries for vector operations
 */
export const PGVECTOR_QUERIES = {
  // Insert document
  insertDocument: `
    INSERT INTO documents (file_name, file_type, file_size, metadata)
    VALUES ($1, $2, $3, $4)
    RETURNING id;
  `,

  // Insert document chunk with embedding
  insertChunk: `
    INSERT INTO document_chunks (document_id, chunk_index, content, embedding, token_count, metadata)
    VALUES ($1, $2, $3, $4::vector, $5, $6);
  `,

  // Update document as processed
  markDocumentProcessed: `
    UPDATE documents 
    SET processed = TRUE, total_chunks = $2, updated_at = NOW()
    WHERE id = $1;
  `,

  // Semantic search using cosine similarity
  semanticSearch: `
    SELECT 
      dc.id,
      dc.content,
      dc.chunk_index,
      dc.metadata as chunk_metadata,
      d.file_name,
      d.file_type,
      d.metadata as document_metadata,
      1 - (dc.embedding <=> $1::vector) as similarity_score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.processed = TRUE
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $2;
  `,

  // Search within specific document
  searchInDocument: `
    SELECT 
      dc.id,
      dc.content,
      dc.chunk_index,
      dc.metadata as chunk_metadata,
      1 - (dc.embedding <=> $1::vector) as similarity_score
    FROM document_chunks dc
    WHERE dc.document_id = $2
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $3;
  `,

  // Get document with all chunks
  getDocumentWithChunks: `
    SELECT 
      d.*,
      json_agg(
        json_build_object(
          'id', dc.id,
          'chunk_index', dc.chunk_index,
          'content', dc.content,
          'token_count', dc.token_count,
          'metadata', dc.metadata
        ) ORDER BY dc.chunk_index
      ) as chunks
    FROM documents d
    LEFT JOIN document_chunks dc ON d.id = dc.document_id
    WHERE d.id = $1
    GROUP BY d.id;
  `,

  // Delete document and all chunks
  deleteDocument: `
    DELETE FROM documents WHERE id = $1;
  `,

  // Get documents list
  listDocuments: `
    SELECT 
      id,
      file_name,
      file_type,
      file_size,
      upload_date,
      total_chunks,
      processed,
      metadata
    FROM documents
    ORDER BY upload_date DESC
    LIMIT $1 OFFSET $2;
  `
};

/**
 * Google Cloud SQL connection configuration
 */
// Helper function to get environment variables
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

export const GOOGLE_CLOUD_CONFIG = {
  // Connection options for Google Cloud SQL
  getConnectionConfig: () => ({
    // For Cloud SQL Proxy
    host: getEnvVar('VITE_DB_HOST') || getEnvVar('REACT_APP_DB_HOST') || '127.0.0.1',
    port: getEnvVar('VITE_DB_PORT') || getEnvVar('REACT_APP_DB_PORT') || 5432,
    database: getEnvVar('VITE_DB_NAME') || getEnvVar('REACT_APP_DB_NAME'),
    user: getEnvVar('VITE_DB_USER') || getEnvVar('REACT_APP_DB_USER'),
    password: getEnvVar('VITE_DB_PASSWORD') || getEnvVar('REACT_APP_DB_PASSWORD'),
    
    // SSL configuration for Cloud SQL  
    ssl: getEnvVar('NODE_ENV') === 'production' ? {
      rejectUnauthorized: false
    } : false,
    
    // Connection pool settings
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }),

  // Alternative: Unix socket connection for App Engine
  getUnixSocketConfig: () => ({
    host: `/cloudsql/${getEnvVar('GOOGLE_CLOUD_PROJECT_ID')}:${getEnvVar('CLOUD_SQL_REGION')}:${getEnvVar('CLOUD_SQL_INSTANCE_NAME')}`,
    user: getEnvVar('VITE_DB_USER') || getEnvVar('REACT_APP_DB_USER'),
    password: getEnvVar('VITE_DB_PASSWORD') || getEnvVar('REACT_APP_DB_PASSWORD'),
    database: getEnvVar('VITE_DB_NAME') || getEnvVar('REACT_APP_DB_NAME'),
  })
};

/**
 * Vector dimension mapping for different embedding models
 */
export const VECTOR_DIMENSIONS = {
  'text-embedding-ada-002': 1536,          // OpenAI
  'sentence-transformers/all-MiniLM-L6-v2': 384,  // HuggingFace
  'sentence-transformers/all-mpnet-base-v2': 768,  // HuggingFace
  'sentence-transformers/multi-qa-MiniLM-L6-cos-v1': 384, // HuggingFace
};

/**
 * Get the vector dimension for current embedding model
 */
export function getVectorDimension() {
  const provider = getEnvVar('VITE_EMBEDDING_PROVIDER') || getEnvVar('REACT_APP_EMBEDDING_PROVIDER') || 'huggingface';
  if (provider === 'openai') {
    return VECTOR_DIMENSIONS['text-embedding-ada-002'];
  } else if (provider === 'huggingface') {
    const model = getEnvVar('VITE_HUGGINGFACE_MODEL') || getEnvVar('REACT_APP_HUGGINGFACE_MODEL') || 'sentence-transformers/all-MiniLM-L6-v2';
    return VECTOR_DIMENSIONS[model] || 384;
  }
  return 384; // Default
}

/**
 * Database setup instructions for Google Cloud SQL
 */
export const SETUP_INSTRUCTIONS = {
  cloudSQL: `
    -- 1. Create Cloud SQL PostgreSQL instance (version 13+)
    -- 2. Connect to your database and run:
    
    CREATE EXTENSION IF NOT EXISTS vector;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    
    -- 3. Create tables:
    ${PGVECTOR_SCHEMA.documents}
    ${PGVECTOR_SCHEMA.document_chunks}
    ${PGVECTOR_SCHEMA.indexes}
  `,
  
  localDevelopment: `
    -- For local development with PostgreSQL + pgvector:
    -- 1. Install PostgreSQL
    -- 2. Install pgvector extension
    -- 3. Create database and run the same setup commands
  `
};

export default {
  PGVECTOR_SCHEMA,
  PGVECTOR_QUERIES,
  GOOGLE_CLOUD_CONFIG,
  VECTOR_DIMENSIONS,
  getVectorDimension,
  SETUP_INSTRUCTIONS
};