-- Create campaign management tables

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  targeting_type TEXT NOT NULL,
  daily_budget NUMERIC NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  state TEXT NOT NULL,
  bidding JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Ad groups table
CREATE TABLE IF NOT EXISTS ad_groups (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id),
  profile_id TEXT NOT NULL,
  ad_group_id TEXT NOT NULL,
  name TEXT NOT NULL,
  default_bid NUMERIC NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Product ads table
CREATE TABLE IF NOT EXISTS product_ads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id),
  asin TEXT,
  sku TEXT,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Keywords table
CREATE TABLE IF NOT EXISTS keywords (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id),
  keyword_id TEXT,
  keyword_text TEXT NOT NULL,
  match_type TEXT NOT NULL,
  bid NUMERIC,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Negative keywords table
CREATE TABLE IF NOT EXISTS negative_keywords (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  ad_group_id INTEGER NOT NULL REFERENCES ad_groups(id),
  keyword_id TEXT,
  keyword_text TEXT NOT NULL,
  match_type TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_profile_id_idx ON campaigns(profile_id);
CREATE INDEX IF NOT EXISTS campaigns_campaign_id_idx ON campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS ad_groups_campaign_id_idx ON ad_groups(campaign_id);
CREATE INDEX IF NOT EXISTS ad_groups_user_id_idx ON ad_groups(user_id);
CREATE INDEX IF NOT EXISTS product_ads_ad_group_id_idx ON product_ads(ad_group_id);
CREATE INDEX IF NOT EXISTS keywords_ad_group_id_idx ON keywords(ad_group_id);
CREATE INDEX IF NOT EXISTS negative_keywords_ad_group_id_idx ON negative_keywords(ad_group_id); 