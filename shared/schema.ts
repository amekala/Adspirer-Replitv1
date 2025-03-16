import { pgTable, text, serial, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
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

export const tokenRefreshLog = pgTable("token_refresh_log", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  refreshTimestamp: timestamp("refresh_timestamp").notNull().defaultNow(),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
});

// Insert schemas for API routes
export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  name: true,
});

export const insertAdvertiserSchema = createInsertSchema(advertiserAccounts, {
  profileId: z.string(),
  accountName: z.string(),
  marketplace: z.string(),
  accountType: z.string(),
}).omit({ id: true, createdAt: true, lastSynced: true, status: true });

// Export types
export type LoginData = z.infer<typeof loginSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AmazonToken = typeof amazonTokens.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type AdvertiserAccount = typeof advertiserAccounts.$inferSelect;
export type TokenRefreshLog = typeof tokenRefreshLog.$inferSelect;