-- Add preferred_ad_formats column to creative_examples table
ALTER TABLE "creative_examples" ADD COLUMN IF NOT EXISTS "preferred_ad_formats" TEXT[];