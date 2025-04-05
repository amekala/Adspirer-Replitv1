import { pgTable, text, serial, integer, boolean, timestamp, json, uuid, numeric, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema with email-based authentication
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas with proper validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).omit({ id: true, role: true, createdAt: true });

export const loginSchema = insertUserSchema;

export const amazonTokens = pgTable("amazon_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenScope: text("token_scope").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastRefreshed: timestamp("last_refreshed").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  keyValue: text("key_value").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").notNull().default(true),
  requestCount: integer("request_count").notNull().default(0),
});

export const advertiserAccounts = pgTable("advertiser_accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  profileId: text("profile_id").notNull(),
  accountName: text("account_name").notNull(),
  marketplace: text("marketplace").notNull(),
  accountType: text("account_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSynced: timestamp("last_synced").notNull().defaultNow(),
  status: text("status").notNull().default("active"),
});

export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  profileId: text("profile_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  adGroupId: text("ad_group_id").notNull(),
  date: date("date").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  cost: numeric("cost").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tokenRefreshLog = pgTable("token_refresh_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  refreshTimestamp: timestamp("refresh_timestamp").notNull().defaultNow(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
});

export const amazonAdReports = pgTable("amazon_ad_reports", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull(),
  profileId: text("profile_id").notNull(),
  reportType: text("report_type").notNull(),
  status: text("status").notNull().default("PENDING"),
  requestParams: json("request_params"),
  downloadUrl: text("download_url"),
  urlExpiry: timestamp("url_expiry"),
  localFilePath: text("local_file_path"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastCheckedAt: timestamp("last_checked_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
});

export const demoRequests = pgTable("demo_requests", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  companyName: text("company_name").notNull(),
  jobRole: text("job_role").notNull(),
  country: text("country").notNull(),
  monthlyAdSpend: text("monthly_ad_spend").notNull(),
  retailers: text("retailers").array().notNull(),
  solutions: text("solutions").array().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  status: text("status").notNull().default("pending"),
});

// Add Google token management
export const googleTokens = pgTable("google_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  lastRefreshed: timestamp("last_refreshed").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
});

// Google Ads account management
export const googleAdvertiserAccounts = pgTable("google_advertiser_accounts", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  customerId: text("customer_id").notNull(),
  accountName: text("account_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastSynced: timestamp("last_synced").notNull().defaultNow(),
  status: text("status").notNull().default("active"),
});

// Google Ads campaign metrics
export const googleCampaignMetrics = pgTable("google_campaign_metrics", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  customerId: text("customer_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  adGroupId: text("ad_group_id"),
  date: date("date").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  cost: numeric("cost").notNull(),
  conversions: integer("conversions").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
});

export const insertAdvertiserSchema = createInsertSchema(advertiserAccounts, {
  profileId: z.string(),
  accountName: z.string(),
  marketplace: z.string(),
  accountType: z.string(),
}).omit({ id: true, createdAt: true, lastSynced: true, status: true });

export const insertCampaignMetricsSchema = createInsertSchema(campaignMetrics, {
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  cost: z.number().min(0),
}).omit({ id: true, createdAt: true });

export const insertDemoRequestSchema = createInsertSchema(demoRequests, {
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  jobRole: z.string().min(1, "Job role is required"),
  country: z.string().min(1, "Country is required"),
  monthlyAdSpend: z.string().min(1, "Monthly ad spend is required"),
  retailers: z.array(z.string()).min(1, "Select at least one retailer"),
  solutions: z.array(z.string()).min(1, "Select at least one solution"),
}).omit({ id: true, createdAt: true, status: true });

// Export types
export type LoginData = z.infer<typeof loginSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AmazonToken = typeof amazonTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type AdvertiserAccount = typeof advertiserAccounts.$inferSelect;
export type TokenRefreshLog = typeof tokenRefreshLog.$inferSelect;
export type CampaignMetrics = typeof campaignMetrics.$inferSelect;
export type AmazonAdReport = typeof amazonAdReports.$inferSelect;
export type DemoRequest = typeof demoRequests.$inferSelect;
export type InsertDemoRequest = z.infer<typeof insertDemoRequestSchema>;

// Add insert schemas for google tables
export const insertGoogleAdvertiserSchema = createInsertSchema(googleAdvertiserAccounts, {
  customerId: z.string(),
  accountName: z.string(),
}).omit({ id: true, createdAt: true, lastSynced: true, status: true });

export const insertGoogleCampaignMetricsSchema = createInsertSchema(googleCampaignMetrics, {
  impressions: z.number().int().min(0),
  clicks: z.number().int().min(0),
  cost: z.number().min(0),
  conversions: z.number().int().min(0),
}).omit({ id: true, createdAt: true });

// Chat conversations
export const chatConversations = pgTable("chat_conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Chat messages with JSON metadata
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id").notNull().references(() => chatConversations.id),
  role: text("role").notNull(), // 'user', 'assistant', or 'system'
  content: text("content").notNull(),
  metadata: json("metadata").default({}).notNull(), // Store additional message data in JSON format
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Chat schemas
export const insertChatConversationSchema = createInsertSchema(chatConversations, {
  title: z.string().min(1, "Conversation title is required"),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Message content is required"),
  conversationId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
}).omit({ id: true, createdAt: true });

// Export additional types for google tables
export type GoogleToken = typeof googleTokens.$inferSelect;
export type GoogleAdvertiserAccount = typeof googleAdvertiserAccounts.$inferSelect;
export type GoogleCampaignMetrics = typeof googleCampaignMetrics.$inferSelect;

// Export types for chat
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatConversation = z.infer<typeof insertChatConversationSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// Campaign metrics cache and summaries
export const campaignMetricsSummary = pgTable("campaign_metrics_summary", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  timeFrame: text("time_frame").notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  profileId: text("profile_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  totalImpressions: integer("total_impressions").notNull(),
  totalClicks: integer("total_clicks").notNull(),
  totalCost: numeric("total_cost").notNull(),
  ctr: numeric("ctr").notNull(),
  conversions: integer("conversions").default(0),
  roas: numeric("roas"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Google campaign metrics summaries
export const googleCampaignMetricsSummary = pgTable("google_campaign_metrics_summary", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  timeFrame: text("time_frame").notNull(), // 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  customerId: text("customer_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  totalImpressions: integer("total_impressions").notNull(),
  totalClicks: integer("total_clicks").notNull(),
  totalCost: numeric("total_cost").notNull(),
  ctr: numeric("ctr").notNull(),
  conversions: integer("conversions").default(0),
  roas: numeric("roas"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Query cache for common LLM questions
export const queryCacheEntries = pgTable("query_cache_entries", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  queryHash: text("query_hash").notNull(),
  normalizedQuery: text("normalized_query").notNull(),
  responseData: json("response_data").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  hitCount: integer("hit_count").notNull().default(0),
});

// Create insert schemas for the new tables
export const insertCampaignMetricsSummarySchema = createInsertSchema(campaignMetricsSummary, {
  timeFrame: z.string(),
  totalImpressions: z.number().int().min(0),
  totalClicks: z.number().int().min(0),
  totalCost: z.number().min(0),
  ctr: z.number().min(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertGoogleCampaignMetricsSummarySchema = createInsertSchema(googleCampaignMetricsSummary, {
  timeFrame: z.string(),
  totalImpressions: z.number().int().min(0),
  totalClicks: z.number().int().min(0),
  totalCost: z.number().min(0),
  ctr: z.number().min(0),
  conversions: z.number().int().min(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertQueryCacheSchema = createInsertSchema(queryCacheEntries, {
  queryHash: z.string(),
  normalizedQuery: z.string(),
  responseData: z.record(z.any()),
}).omit({ id: true, createdAt: true, hitCount: true });

// Export additional types
export type CampaignMetricsSummary = typeof campaignMetricsSummary.$inferSelect;
export type GoogleCampaignMetricsSummary = typeof googleCampaignMetricsSummary.$inferSelect;
export type QueryCacheEntry = typeof queryCacheEntries.$inferSelect;
export type InsertCampaignMetricsSummary = z.infer<typeof insertCampaignMetricsSummarySchema>;
export type InsertGoogleCampaignMetricsSummary = z.infer<typeof insertGoogleCampaignMetricsSummarySchema>;
export type InsertQueryCache = z.infer<typeof insertQueryCacheSchema>;

// Onboarding tables

// Table to track onboarding progress
export const onboardingProgress = pgTable("onboarding_progress", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  currentStep: integer("current_step").notNull().default(1),
  isComplete: boolean("is_complete").notNull().default(false),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Step 1: Business Core
export const businessCore = pgTable("business_core", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  businessName: text("business_name").notNull(),
  industry: text("industry").notNull(),
  companySize: text("company_size").notNull(),
  marketplaces: text("marketplaces").array(),
  mainGoals: text("main_goals").array(),
  monthlyAdSpend: text("monthly_ad_spend"),
  website: text("website"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Step 3: Brand Identity
export const brandIdentity = pgTable("brand_identity", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  brandName: text("brand_name").notNull(),
  brandDescription: text("brand_description").notNull(),
  brandVoice: text("brand_voice").array(),
  targetAudience: text("target_audience").array(),
  brandValues: text("brand_values").array(),
  primaryColor: text("primary_color"),
  secondaryColor: text("secondary_color"),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Step 4: Products or Services
export const productsServices = pgTable("products_services", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  productTypes: text("product_types").array(),
  topSellingProducts: json("top_selling_products").default([]).notNull(),
  pricingStrategy: text("pricing_strategy"),
  competitiveAdvantage: text("competitive_advantage").array(),
  targetMarkets: text("target_markets").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Step 5: Creative Examples
export const creativeExamples = pgTable("creative_examples", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  adExamples: json("ad_examples").default([]).notNull(),
  preferredAdFormats: text("preferred_ad_formats").array(),
  brandGuidelines: json("brand_guidelines").default({}).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Step 6: Performance Context
export const performanceContext = pgTable("performance_context", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  currentPerformance: json("current_performance").default({}).notNull(),
  keyMetrics: text("key_metrics").array(),
  performanceGoals: json("performance_goals").default({}).notNull(),
  seasonalTrends: json("seasonal_trends").default([]).notNull(),
  benchmarks: json("benchmarks").default({}).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert schemas for onboarding
export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress, {
  currentStep: z.number().int().min(1).max(6),
  isComplete: z.boolean(),
}).omit({ id: true, createdAt: true, lastUpdated: true });

export const insertBusinessCoreSchema = createInsertSchema(businessCore, {
  businessName: z.string().min(1, "Business name is required"),
  industry: z.string().min(1, "Industry is required"),
  companySize: z.string().min(1, "Company size is required"),
  marketplaces: z.array(z.string()).min(1, "At least one marketplace is required"),
  mainGoals: z.array(z.string()).min(1, "At least one main goal is required"),
  monthlyAdSpend: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertBrandIdentitySchema = createInsertSchema(brandIdentity, {
  brandName: z.string().min(1, "Brand name is required"),
  brandDescription: z.string().min(10, "Please provide a more detailed brand description"),
  brandVoice: z.array(z.string()).min(1, "At least one brand voice characteristic is required"),
  targetAudience: z.array(z.string()).min(1, "At least one target audience is required"),
  brandValues: z.array(z.string()).min(1, "At least one brand value is required"),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logoUrl: z.string().url("Please enter a valid URL").optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertProductsServicesSchema = createInsertSchema(productsServices, {
  productTypes: z.array(z.string()).min(1, "At least one product type is required"),
  topSellingProducts: z.array(z.object({
    name: z.string(),
    description: z.string(),
    price: z.string().optional(),
    imageUrl: z.string().optional(),
  })).optional(),
  pricingStrategy: z.string().optional(),
  competitiveAdvantage: z.array(z.string()).optional(),
  targetMarkets: z.array(z.string()).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertCreativeExamplesSchema = createInsertSchema(creativeExamples, {
  adExamples: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    performanceNotes: z.string().optional(),
  })).optional(),
  preferredAdFormats: z.array(z.string()).optional(),
  brandGuidelines: z.record(z.any()).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

export const insertPerformanceContextSchema = createInsertSchema(performanceContext, {
  currentPerformance: z.record(z.any()).optional(),
  keyMetrics: z.array(z.string()).min(1, "At least one key metric is required"),
  performanceGoals: z.record(z.any()).optional(),
  seasonalTrends: z.array(z.object({
    season: z.string(),
    performance: z.string(),
    notes: z.string().optional(),
  })).optional(),
  benchmarks: z.record(z.any()).optional(),
}).omit({ id: true, userId: true, createdAt: true, updatedAt: true });

// Export onboarding types
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type BusinessCore = typeof businessCore.$inferSelect;
export type BrandIdentity = typeof brandIdentity.$inferSelect;
export type ProductsServices = typeof productsServices.$inferSelect;
export type CreativeExamples = typeof creativeExamples.$inferSelect;
export type PerformanceContext = typeof performanceContext.$inferSelect;

export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type InsertBusinessCore = z.infer<typeof insertBusinessCoreSchema>;
export type InsertBrandIdentity = z.infer<typeof insertBrandIdentitySchema>;
export type InsertProductsServices = z.infer<typeof insertProductsServicesSchema>;
export type InsertCreativeExamples = z.infer<typeof insertCreativeExamplesSchema>;
export type InsertPerformanceContext = z.infer<typeof insertPerformanceContextSchema>;

// Campaign management tables
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  profileId: text("profile_id").notNull(),
  campaignId: text("campaign_id").notNull(),
  name: text("name").notNull(),
  campaignType: text("campaign_type").notNull(), // 'sponsoredProducts', 'sponsoredBrands', 'sponsoredDisplay'
  targetingType: text("targeting_type").notNull(), // 'manual', 'automatic'
  dailyBudget: numeric("daily_budget").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  state: text("state").notNull(), // 'enabled', 'paused', 'archived'
  bidding: json("bidding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adGroups = pgTable("ad_groups", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  profileId: text("profile_id").notNull(),
  adGroupId: text("ad_group_id").notNull(),
  name: text("name").notNull(),
  defaultBid: numeric("default_bid").notNull(),
  state: text("state").notNull(), // 'enabled', 'paused', 'archived'
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const productAds = pgTable("product_ads", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  adGroupId: integer("ad_group_id").notNull().references(() => adGroups.id),
  asin: text("asin"),
  sku: text("sku"),
  state: text("state").notNull(), // 'enabled', 'paused', 'archived'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  adGroupId: integer("ad_group_id").notNull().references(() => adGroups.id),
  keywordId: text("keyword_id"),
  keywordText: text("keyword_text").notNull(),
  matchType: text("match_type").notNull(), // 'broad', 'phrase', 'exact', 'negative'
  bid: numeric("bid"),
  state: text("state").notNull(), // 'enabled', 'paused', 'archived'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const negativeKeywords = pgTable("negative_keywords", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  adGroupId: integer("ad_group_id").notNull().references(() => adGroups.id),
  keywordId: text("keyword_id"),
  keywordText: text("keyword_text").notNull(),
  matchType: text("match_type").notNull(), // 'negativePhrase', 'negativeExact'
  state: text("state").notNull(), // 'enabled', 'paused', 'archived'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas with validation
export const insertCampaignSchema = createInsertSchema(campaigns, {
  name: z.string().min(1, "Campaign name is required"),
  campaignType: z.enum(["sponsoredProducts", "sponsoredBrands", "sponsoredDisplay"]),
  targetingType: z.enum(["manual", "automatic"]),
  dailyBudget: z.number().positive("Budget must be greater than 0"),
  startDate: z.coerce.date(),
  state: z.enum(["enabled", "paused", "archived"]),
  bidding: z.record(z.any()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertAdGroupSchema = createInsertSchema(adGroups, {
  name: z.string().min(1, "Ad group name is required"),
  defaultBid: z.number().positive("Default bid must be greater than 0"),
  state: z.enum(["enabled", "paused", "archived"]),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertProductAdSchema = createInsertSchema(productAds, {
  asin: z.string().optional(),
  sku: z.string().optional(),
  state: z.enum(["enabled", "paused", "archived"]),
}).omit({ id: true, createdAt: true })
.refine(data => data.asin || data.sku, {
  message: "Either ASIN or SKU must be provided",
  path: ["asin"],
});

export const insertKeywordSchema = createInsertSchema(keywords, {
  keywordText: z.string().min(1, "Keyword text is required"),
  matchType: z.enum(["broad", "phrase", "exact", "negative"]),
  bid: z.number().positive("Bid must be greater than 0").optional(),
  state: z.enum(["enabled", "paused", "archived"]),
}).omit({ id: true, createdAt: true });

export const insertNegativeKeywordSchema = createInsertSchema(negativeKeywords, {
  keywordText: z.string().min(1, "Keyword text is required"),
  matchType: z.enum(["negativePhrase", "negativeExact"]),
  state: z.enum(["enabled", "paused", "archived"]),
}).omit({ id: true, createdAt: true });

// Export campaign management types
export type Campaign = typeof campaigns.$inferSelect;
export type AdGroup = typeof adGroups.$inferSelect;
export type ProductAd = typeof productAds.$inferSelect;
export type Keyword = typeof keywords.$inferSelect;
export type NegativeKeyword = typeof negativeKeywords.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type InsertAdGroup = z.infer<typeof insertAdGroupSchema>;
export type InsertProductAd = z.infer<typeof insertProductAdSchema>;
export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type InsertNegativeKeyword = z.infer<typeof insertNegativeKeywordSchema>;