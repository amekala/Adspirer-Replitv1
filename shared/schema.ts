import { pgTable, text, serial, integer, boolean, timestamp, json, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  company: text("company"),
  avatarUrl: text("avatar_url"),
});

export const amazonTokens = pgTable("amazon_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const advertisers = pgTable("advertisers", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  profileId: text("profile_id").notNull(),
  marketplaceId: text("marketplace_id").notNull(),
  accountInfo: json("account_info").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  advertiserId: integer("advertiser_id").notNull().references(() => advertisers.id),
  campaignId: text("campaign_id").notNull(),
  name: text("name").notNull(),
  campaignType: text("campaign_type").notNull(),
  targetingType: text("targeting_type").notNull(),
  dailyBudget: decimal("daily_budget").notNull(),
  state: text("state").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const campaignMetrics = pgTable("campaign_metrics", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => campaigns.id),
  date: timestamp("date").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  spend: decimal("spend").notNull(),
  sales: decimal("sales").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
});

export const insertAdvertiserSchema = createInsertSchema(advertisers).pick({
  profileId: true,
  marketplaceId: true,
  accountInfo: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AmazonToken = typeof amazonTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Advertiser = typeof advertisers.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignMetric = typeof campaignMetrics.$inferSelect;