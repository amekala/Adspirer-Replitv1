-- Migration script to create cache-related tables

-- Create query_cache_entries table if it doesn't exist
CREATE TABLE IF NOT EXISTS query_cache_entries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query_hash TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  response_data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  hit_count INTEGER NOT NULL DEFAULT 0
);

-- Create campaign_metrics_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_metrics_summary (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  time_frame TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create google_campaign_metrics_summary table if it doesn't exist
CREATE TABLE IF NOT EXISTS google_campaign_metrics_summary (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  time_frame TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_query_cache_user_hash ON query_cache_entries(user_id, query_hash);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_summary_user_timeframe ON campaign_metrics_summary(user_id, time_frame);
CREATE INDEX IF NOT EXISTS idx_google_campaign_metrics_summary_user_timeframe ON google_campaign_metrics_summary(user_id, time_frame);