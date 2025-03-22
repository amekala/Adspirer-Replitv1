-- Add basic embeddings support to PostgreSQL
-- This is a simplified version without PL/pgSQL procedures

-- Add updated_at column to embeddings_store if it doesn't exist
ALTER TABLE "embeddings_store" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP NOT NULL DEFAULT now();

-- Create basic indices for faster queries
CREATE INDEX IF NOT EXISTS "idx_embeddings_type" ON "embeddings_store" ("type");
CREATE INDEX IF NOT EXISTS "idx_embeddings_source_id" ON "embeddings_store" ("source_id");
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_conversation_id" ON "chat_embeddings" ("conversation_id");