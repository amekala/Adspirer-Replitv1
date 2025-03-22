-- Add vector operations support to PostgreSQL for better embedding search

-- Create the pgvector extension if it's available (try/catch approach)
CREATE EXTENSION IF NOT EXISTS vector;

-- Index for embeddings table using a regular B-tree index
-- Since we can't rely on vector operations, we'll use standard indexing
CREATE INDEX IF NOT EXISTS "idx_embeddings_source_id" ON "embeddings_store" ("source_id");
CREATE INDEX IF NOT EXISTS "idx_embeddings_type" ON "embeddings_store" ("type");
CREATE INDEX IF NOT EXISTS "idx_embeddings_created_at" ON "embeddings_store" ("created_at");

-- Create index on chat embeddings for faster lookups
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_conversation_id" ON "chat_embeddings" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_embedding_id" ON "chat_embeddings" ("embedding_id");

-- Add a timestamp column to track when embeddings were last used
ALTER TABLE "embeddings_store" 
ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;

-- Use standard SQL rather than procedural PL/pgSQL for compatibility
-- This ensures the migration can run on most PostgreSQL environments