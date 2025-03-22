-- Fix structure of embeddings-related tables to match schema.ts

-- Add the missing user_id column to embeddings_store if it doesn't exist
ALTER TABLE "embeddings_store" 
ADD COLUMN IF NOT EXISTS "user_id" text;

-- Add last_used_at if it doesn't exist 
ALTER TABLE "embeddings_store" 
ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;

-- Fix the source_id column to be NOT NULL if it's NULL
ALTER TABLE "embeddings_store" 
ALTER COLUMN "source_id" SET NOT NULL;

-- Create indices for faster queries (if they don't exist)
CREATE INDEX IF NOT EXISTS "idx_embeddings_source_id" ON "embeddings_store" ("source_id");
CREATE INDEX IF NOT EXISTS "idx_embeddings_type" ON "embeddings_store" ("type");
CREATE INDEX IF NOT EXISTS "idx_embeddings_created_at" ON "embeddings_store" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_embeddings_user_id" ON "embeddings_store" ("user_id");

-- Create indices on chat_embeddings for faster lookups
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_conversation_id" ON "chat_embeddings" ("chat_conversation_id");
CREATE INDEX IF NOT EXISTS "idx_chat_embeddings_embedding_id" ON "chat_embeddings" ("embedding_id");