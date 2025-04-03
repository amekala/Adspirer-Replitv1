-- Create query cache tables
CREATE TABLE IF NOT EXISTS query_cache_entries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  query_hash TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  hit_count INTEGER NOT NULL DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_query_cache_user_id ON query_cache_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_query_cache_hash ON query_cache_entries(query_hash);
