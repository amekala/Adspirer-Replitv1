-- Update the embeddings_store table to include user_id, update column names to match code

-- Rename 'text' column to 'text_content' for clarity
ALTER TABLE IF EXISTS embeddings_store 
RENAME COLUMN text TO text_content;

-- Rename 'vector' column to 'embedding_vector' to match code
ALTER TABLE IF EXISTS embeddings_store 
RENAME COLUMN vector TO embedding_vector;

-- Add user_id column to link embeddings with users for proper permissions
ALTER TABLE IF EXISTS embeddings_store
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Add index on source_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_embeddings_source_id ON embeddings_store(source_id);

-- Add index on type for filtering by embedding type
CREATE INDEX IF NOT EXISTS idx_embeddings_type ON embeddings_store(type);

-- Add updated_at column for tracking changes
ALTER TABLE IF EXISTS embeddings_store
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;