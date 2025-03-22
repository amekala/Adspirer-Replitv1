-- Create embeddings-related tables if they don't exist
-- This migration adds the necessary tables for vector embeddings storage

-- Create embedding type enum if it doesn't exist
CREATE TYPE IF NOT EXISTS embedding_type AS ENUM ('campaign', 'ad_group', 'keyword', 'chat_message');

-- Create the embeddings_store table if it doesn't exist
CREATE TABLE IF NOT EXISTS "embeddings_store" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_id" varchar(255) NOT NULL,
  "type" embedding_type NOT NULL,
  "vector" jsonb NOT NULL,
  "metadata" jsonb,
  "user_id" varchar(255) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "last_used_at" timestamp
);

-- Create the chat_embeddings relationship table if it doesn't exist
CREATE TABLE IF NOT EXISTS "chat_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "embedding_id" uuid NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "chat_embeddings_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "chat_conversations" ("id") ON DELETE CASCADE,
  CONSTRAINT "chat_embeddings_embedding_id_fkey" FOREIGN KEY ("embedding_id") REFERENCES "embeddings_store" ("id") ON DELETE CASCADE
);

-- Create indices for faster queries
CREATE INDEX IF NOT EXISTS "idx_embeddings_source_id" ON "embeddings_store" ("source_id");
CREATE INDEX IF NOT EXISTS "idx_embeddings_type" ON "embeddings_store" ("type");
CREATE INDEX IF NOT EXISTS "idx_embeddings_created_at" ON "embeddings_store" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_conversation_id" ON "chat_embeddings" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_embedding_id" ON "chat_embeddings" ("embedding_id");