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