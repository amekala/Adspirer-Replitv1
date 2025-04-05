-- Create onboarding progress table
CREATE TABLE IF NOT EXISTS "onboarding_progress" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "current_step" INTEGER NOT NULL DEFAULT 1,
  "is_complete" BOOLEAN NOT NULL DEFAULT false,
  "last_updated" TIMESTAMP NOT NULL DEFAULT now(),
  "created_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create business core table
CREATE TABLE IF NOT EXISTS "business_core" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "business_name" TEXT NOT NULL,
  "industry" TEXT NOT NULL,
  "company_size" TEXT NOT NULL,
  "marketplaces" TEXT[],
  "main_goals" TEXT[],
  "monthly_ad_spend" TEXT,
  "website" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create brand identity table
CREATE TABLE IF NOT EXISTS "brand_identity" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "brand_name" TEXT NOT NULL,
  "brand_description" TEXT NOT NULL,
  "brand_voice" TEXT[],
  "target_audience" TEXT[],
  "brand_values" TEXT[],
  "primary_color" TEXT,
  "secondary_color" TEXT,
  "logo_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create products services table
CREATE TABLE IF NOT EXISTS "products_services" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "product_types" TEXT[],
  "competitive_advantage" TEXT[],
  "target_markets" TEXT[],
  "top_selling_products" JSONB,
  "pricing_strategy" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create creative examples table
CREATE TABLE IF NOT EXISTS "creative_examples" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "ad_examples" JSONB,
  "creative_preferences" TEXT[],
  "successful_campaigns" JSONB,
  "competitor_creative_urls" TEXT[],
  "brand_guidelines_url" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create performance context table
CREATE TABLE IF NOT EXISTS "performance_context" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "target_roas" NUMERIC,
  "target_acos" NUMERIC,
  "target_cpa" NUMERIC,
  "monthly_ad_budget" NUMERIC,
  "performance_history" JSONB,
  "key_performance_metrics" TEXT[],
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- Create query cache entries table (referenced in logs but missing)
CREATE TABLE IF NOT EXISTS "query_cache_entries" (
  "id" SERIAL PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id"),
  "query_hash" TEXT NOT NULL,
  "normalized_query" TEXT NOT NULL,
  "response_data" JSONB NOT NULL,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "hit_count" INTEGER NOT NULL DEFAULT 0
);