// shared/types.ts
// Pure TypeScript types for sharing between client and server
// NO imports from drizzle-orm here!
import * as z from "zod"; // Changed import style for better compatibility

// Auth types
export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface InsertUser {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Token types
export interface AmazonToken {
  id: number;
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenScope: string;
  expiresAt: Date;
  lastRefreshed: Date;
  isActive: boolean;
}

export interface GoogleToken {
  id: number;
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  lastRefreshed: Date;
  isActive: boolean;
}

// API Key types
export interface ApiKey {
  id: number;
  userId: string;
  keyValue: string;
  name: string;
  createdAt: Date;
  lastUsed: Date | null;
  isActive: boolean;
  requestCount: number;
}

// Advertiser Account types
export interface AdvertiserAccount {
  id: number;
  userId: string;
  profileId: string;
  accountName: string;
  marketplace: string;
  accountType: string;
  createdAt: Date;
  lastSynced: Date;
  status: string;
}

export interface GoogleAdvertiserAccount {
  id: number;
  userId: string;
  customerId: string;
  accountName: string;
  createdAt: Date;
  lastSynced: Date;
  status: string;
}

// Metrics types
export interface CampaignMetrics {
  id: number;
  userId: string;
  profileId: string;
  campaignId: string;
  adGroupId: string;
  date: Date;
  impressions: number;
  clicks: number;
  cost: number;
  createdAt: Date;
}

export interface GoogleCampaignMetrics {
  id: number;
  userId: string;
  customerId: string;
  campaignId: string;
  adGroupId: string | null;
  date: Date;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  createdAt: Date;
}

// Log types
export interface TokenRefreshLog {
  id: number;
  userId: string;
  refreshTimestamp: Date;
  success: boolean;
  errorMessage: string | null;
}

// Report types
export interface AmazonAdReport {
  id: number;
  reportId: string;
  profileId: string;
  reportType: string;
  status: string;
  requestParams: Record<string, any>;
  downloadUrl: string | null;
  urlExpiry: Date | null;
  localFilePath: string | null;
  createdAt: Date;
  lastCheckedAt: Date;
  completedAt: Date | null;
  retryCount: number;
  errorMessage: string | null;
}

// Demo request types
export interface DemoRequest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string;
  jobRole: string;
  country: string;
  monthlyAdSpend: string;
  retailers: string[];
  solutions: string[];
  createdAt: Date;
  status: string;
}

export interface InsertDemoRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName: string;
  jobRole: string;
  country: string;
  monthlyAdSpend: string;
  retailers: string[];
  solutions: string[];
}

// Chat types
export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface InsertChatConversation {
  userId: string;
  title: string;
}

export interface InsertChatMessage {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
}

// Summary types
export interface CampaignMetricsSummary {
  id: number;
  userId: string;
  timeFrame: string;
  startDate: Date;
  endDate: Date;
  profileId: string;
  campaignId: string;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  ctr: number;
  conversions: number | null;
  roas: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleCampaignMetricsSummary {
  id: number;
  userId: string;
  timeFrame: string;
  startDate: Date;
  endDate: Date;
  customerId: string;
  campaignId: string;
  totalImpressions: number;
  totalClicks: number;
  totalCost: number;
  ctr: number;
  conversions: number | null;
  roas: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Cache types
export interface QueryCacheEntry {
  id: number;
  userId: string;
  queryHash: string;
  normalizedQuery: string;
  responseData: Record<string, any>;
  expiresAt: Date;
  createdAt: Date;
  hitCount: number;
}

// Campaign management types
export interface Campaign {
  id: number;
  userId: string;
  profileId: string;
  campaignId: string;
  name: string;
  campaignType: string;
  targetingType: string;
  dailyBudget: number;
  startDate: Date;
  endDate: Date | null;
  state: string;
  bidding: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdGroup {
  id: number;
  userId: string;
  campaignId: number;
  profileId: string;
  adGroupId: string;
  name: string;
  defaultBid: number;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAd {
  id: number;
  userId: string;
  adGroupId: number;
  asin: string | null;
  sku: string | null;
  state: string;
  createdAt: Date;
}

export interface Keyword {
  id: number;
  userId: string;
  adGroupId: number;
  keywordId: string | null;
  keywordText: string;
  matchType: string;
  bid: number | null;
  state: string;
  createdAt: Date;
}

export interface NegativeKeyword {
  id: number;
  userId: string;
  adGroupId: number;
  keywordId: string | null;
  keywordText: string;
  matchType: string;
  state: string;
  createdAt: Date;
}

// Form submission types
export interface InsertCampaign {
  userId: string;
  profileId: string;
  campaignId: string;
  name: string;
  campaignType: 'sponsoredProducts' | 'sponsoredBrands' | 'sponsoredDisplay';
  targetingType: 'manual' | 'automatic';
  dailyBudget: number;
  startDate: Date;
  endDate?: Date;
  state: 'enabled' | 'paused' | 'archived';
  bidding?: Record<string, any>;
}

export interface InsertAdGroup {
  userId: string;
  campaignId: number;
  profileId: string;
  adGroupId: string;
  name: string;
  defaultBid: number;
  state: 'enabled' | 'paused' | 'archived';
}

export interface InsertProductAd {
  userId: string;
  adGroupId: number;
  asin?: string;
  sku?: string;
  state: 'enabled' | 'paused' | 'archived';
}

export interface InsertKeyword {
  userId: string;
  adGroupId: number;
  keywordText: string;
  matchType: 'broad' | 'phrase' | 'exact' | 'negative';
  bid?: number;
  state: 'enabled' | 'paused' | 'archived';
}

export interface InsertNegativeKeyword {
  userId: string;
  adGroupId: number;
  keywordText: string;
  matchType: 'negativePhrase' | 'negativeExact';
  state: 'enabled' | 'paused' | 'archived';
}

// Form validation schemas
export const insertUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = insertUserSchema; 