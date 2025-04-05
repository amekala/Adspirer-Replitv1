-- Update creative_examples table
ALTER TABLE "creative_examples" 
ADD COLUMN IF NOT EXISTS "preferred_ad_formats" TEXT[],
ADD COLUMN IF NOT EXISTS "ad_examples" JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS "brand_guidelines" JSONB DEFAULT '{}'::jsonb NOT NULL;

-- Update performance_context table
ALTER TABLE "performance_context"
ADD COLUMN IF NOT EXISTS "current_performance" JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS "key_metrics" TEXT[],
ADD COLUMN IF NOT EXISTS "performance_goals" JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS "seasonal_trends" JSONB DEFAULT '[]'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS "benchmarks" JSONB DEFAULT '{}'::jsonb NOT NULL;