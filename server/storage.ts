import { 
  User, InsertUser, AmazonToken, ApiKey, AdvertiserAccount, 
  CampaignMetrics, amazonAdReports, type AmazonAdReport,
  DemoRequest, InsertDemoRequest, demoRequests,
  GoogleToken, GoogleAdvertiserAccount, GoogleCampaignMetrics,
  ChatConversation, ChatMessage, InsertChatConversation, InsertChatMessage,
  CampaignMetricsSummary, GoogleCampaignMetricsSummary, QueryCacheEntry,
  InsertCampaignMetricsSummary, InsertGoogleCampaignMetricsSummary, InsertQueryCache,
  users, amazonTokens, apiKeys, advertiserAccounts, tokenRefreshLog, 
  campaignMetrics, googleTokens, googleAdvertiserAccounts, googleCampaignMetrics, 
  chatConversations, chatMessages, campaignMetricsSummary, googleCampaignMetricsSummary,
  queryCacheEntries,
  Campaign, AdGroup, ProductAd, Keyword, NegativeKeyword,
  InsertCampaign, InsertAdGroup, InsertProductAd, InsertKeyword, InsertNegativeKeyword,
  campaigns, adGroups, productAds, keywords, negativeKeywords
} from "@shared/schema";
import session from "express-session";
import { and, eq, gte, lte, desc, or, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";
import crypto from "crypto";
import dotenv from "dotenv";
import { db } from "./db";

dotenv.config();

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Amazon token management
  getAmazonToken(userId: string): Promise<AmazonToken | undefined>;
  saveAmazonToken(token: Omit<AmazonToken, "id">): Promise<AmazonToken>;
  deleteAmazonToken(userId: string): Promise<void>;
  logTokenRefresh(userId: string, success: boolean, errorMessage?: string): Promise<void>;

  // API key management
  createApiKey(userId: string, name: string): Promise<ApiKey>;
  getApiKeys(userId: string): Promise<ApiKey[]>;
  deactivateApiKey(id: number, userId: string): Promise<void>;

  // Advertiser management
  createAdvertiserAccount(advertiser: Omit<AdvertiserAccount, "id" | "createdAt" | "lastSynced">): Promise<AdvertiserAccount>;
  getAdvertiserAccounts(userId: string): Promise<AdvertiserAccount[]>;
  deleteAdvertiserAccounts(userId: string): Promise<void>;

  // Campaign metrics management
  saveCampaignMetrics(metrics: Omit<CampaignMetrics, "id" | "createdAt">): Promise<CampaignMetrics>;
  getCampaignMetrics(userId: string, startDate: Date, endDate: Date): Promise<CampaignMetrics[]>;

  // Report tracking methods
  createAdReport(data: Omit<AmazonAdReport, "id" | "createdAt" | "lastCheckedAt">): Promise<AmazonAdReport>;
  updateAdReportStatus(reportId: string, status: string, url?: string): Promise<void>;
  getAdReport(reportId: string): Promise<AmazonAdReport | undefined>;
  getActiveReports(profileId: string): Promise<AmazonAdReport[]>;

  // Add demo request methods
  createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest>;
  getDemoRequest(id: number): Promise<DemoRequest | undefined>;
  getDemoRequests(): Promise<DemoRequest[]>;

  // Google token management
  getGoogleToken(userId: string): Promise<GoogleToken | undefined>;
  saveGoogleToken(token: Omit<GoogleToken, "id">): Promise<GoogleToken>;
  deleteGoogleToken(userId: string): Promise<void>;

  // Google advertiser management
  createGoogleAdvertiserAccount(advertiser: Omit<GoogleAdvertiserAccount, "id" | "createdAt" | "lastSynced">): Promise<GoogleAdvertiserAccount>;
  getGoogleAdvertiserAccounts(userId: string): Promise<GoogleAdvertiserAccount[]>;
  deleteGoogleAdvertiserAccount(userId: string, customerId: string): Promise<void>;

  // Google campaign metrics
  saveGoogleCampaignMetrics(metrics: Omit<GoogleCampaignMetrics, "id" | "createdAt">): Promise<GoogleCampaignMetrics>;
  getGoogleCampaignMetrics(userId: string, startDate: Date, endDate: Date): Promise<GoogleCampaignMetrics[]>;
  
  // Chat management
  createChatConversation(userId: string, title: string): Promise<ChatConversation>;
  getChatConversation(id: string): Promise<ChatConversation | undefined>;
  getChatConversations(userId: string): Promise<ChatConversation[]>;
  updateChatConversationTitle(id: string, title: string): Promise<ChatConversation>;
  deleteChatConversation(id: string): Promise<void>;
  
  // Chat messages
  createChatMessage(message: InsertChatMessage & { conversationId: string }): Promise<ChatMessage>;
  getChatMessages(conversationId: string): Promise<ChatMessage[]>;
  
  // Campaign metrics summary management
  createCampaignMetricsSummary(summary: Omit<CampaignMetricsSummary, "id" | "createdAt" | "updatedAt">): Promise<CampaignMetricsSummary>;
  getCampaignMetricsSummaries(userId: string, timeFrame: string, startDate?: Date, endDate?: Date): Promise<CampaignMetricsSummary[]>;
  updateCampaignMetricsSummary(id: number, summary: Partial<CampaignMetricsSummary>): Promise<CampaignMetricsSummary>;
  generateCampaignMetricsSummaries(userId: string): Promise<void>;
  
  // Google campaign metrics summary management
  createGoogleCampaignMetricsSummary(summary: Omit<GoogleCampaignMetricsSummary, "id" | "createdAt" | "updatedAt">): Promise<GoogleCampaignMetricsSummary>;
  getGoogleCampaignMetricsSummaries(userId: string, timeFrame: string, startDate?: Date, endDate?: Date): Promise<GoogleCampaignMetricsSummary[]>;
  updateGoogleCampaignMetricsSummary(id: number, summary: Partial<GoogleCampaignMetricsSummary>): Promise<GoogleCampaignMetricsSummary>;
  generateGoogleCampaignMetricsSummaries(userId: string): Promise<void>;
  
  // Query cache management
  createQueryCacheEntry(entry: Omit<QueryCacheEntry, "id" | "createdAt" | "hitCount">): Promise<QueryCacheEntry>;
  getQueryCacheEntry(userId: string, queryHash: string): Promise<QueryCacheEntry | undefined>;
  updateQueryCacheHitCount(id: number): Promise<QueryCacheEntry>;
  invalidateQueryCache(userId: string, olderThan?: Date): Promise<void>;
  
  // Campaign management methods
  createCampaign(campaign: Omit<InsertCampaign, "userId"> & { userId: string }): Promise<Campaign>;
  getCampaign(id: number): Promise<Campaign | undefined>;
  getCampaigns(userId: string, profileId?: string): Promise<Campaign[]>;
  updateCampaignState(id: number, state: string): Promise<Campaign>;
  
  // Ad group management methods
  createAdGroup(adGroup: Omit<InsertAdGroup, "userId"> & { userId: string }): Promise<AdGroup>;
  getAdGroup(id: number): Promise<AdGroup | undefined>;
  getAdGroups(campaignId: number): Promise<AdGroup[]>;
  updateAdGroupState(id: number, state: string): Promise<AdGroup>;
  
  // Product ad management methods
  createProductAd(productAd: Omit<InsertProductAd, "userId"> & { userId: string }): Promise<ProductAd>;
  getProductAds(adGroupId: number): Promise<ProductAd[]>;
  
  // Keyword management methods
  createKeyword(keyword: Omit<InsertKeyword, "userId"> & { userId: string }): Promise<Keyword>;
  getKeywords(adGroupId: number): Promise<Keyword[]>;
  
  // Negative keyword management methods
  createNegativeKeyword(negativeKeyword: Omit<InsertNegativeKeyword, "userId"> & { userId: string }): Promise<NegativeKeyword>;
  getNegativeKeywords(adGroupId: number): Promise<NegativeKeyword[]>;
  
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // No longer using session store with JWT authentication
    this.sessionStore = null as any;
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAmazonToken(userId: string): Promise<AmazonToken | undefined> {
    const result = await db.select().from(amazonTokens).where(eq(amazonTokens.userId, userId));
    return result[0];
  }

  async saveAmazonToken(token: Omit<AmazonToken, "id">): Promise<AmazonToken> {
    // First try to update existing token
    const [existingToken] = await db
      .select()
      .from(amazonTokens)
      .where(eq(amazonTokens.userId, token.userId));

    if (existingToken) {
      const [updatedToken] = await db
        .update(amazonTokens)
        .set({
          ...token,
          lastRefreshed: new Date(),
        })
        .where(eq(amazonTokens.userId, token.userId))
        .returning();
      return updatedToken;
    }

    // If no existing token, create new one
    const [newToken] = await db
      .insert(amazonTokens)
      .values({
        ...token,
        lastRefreshed: new Date(),
      })
      .returning();
    return newToken;
  }

  async deleteAmazonToken(userId: string): Promise<void> {
    await db.delete(amazonTokens).where(eq(amazonTokens.userId, userId));
  }

  async logTokenRefresh(userId: string, success: boolean, errorMessage?: string): Promise<void> {
    await db.insert(tokenRefreshLog).values({
      userId,
      success,
      errorMessage,
    });
  }

  async createApiKey(userId: string, name: string): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values({
      userId,
      name,
      keyValue: nanoid(32),
      isActive: true,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async deactivateApiKey(id: number, userId: string): Promise<void> {
    console.log(`Deactivating API key ${id} for user ${userId}`);

    try {
      const result = await db
        .update(apiKeys)
        .set({ isActive: false })
        .where(
          and(
            eq(apiKeys.id, id),
            eq(apiKeys.userId, userId)
          )
        )
        .returning();

      console.log(`Deactivation result:`, result);

      if (!result.length) {
        throw new Error(`API key ${id} not found or not owned by user ${userId}`);
      }
    } catch (error) {
      console.error('Error deactivating API key:', error);
      throw error;
    }
  }

  async createAdvertiserAccount(advertiser: Omit<AdvertiserAccount, "id" | "createdAt" | "lastSynced">): Promise<AdvertiserAccount> {
    const result = await db.insert(advertiserAccounts).values({
      ...advertiser,
      createdAt: new Date(),
      lastSynced: new Date(),
    }).returning();
    return result[0];
  }

  async getAdvertiserAccounts(userId: string): Promise<AdvertiserAccount[]> {
    return await db.select().from(advertiserAccounts).where(eq(advertiserAccounts.userId, userId));
  }

  async deleteAdvertiserAccounts(userId: string): Promise<void> {
    await db.delete(advertiserAccounts).where(eq(advertiserAccounts.userId, userId));
  }

  async saveCampaignMetrics(metrics: Omit<CampaignMetrics, "id" | "createdAt">): Promise<CampaignMetrics> {
    try {
      const result = await db.insert(campaignMetrics)
        .values(metrics)
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error saving campaign metrics:', error);
      throw error;
    }
  }

  async getCampaignMetrics(userId: string, startDate: Date, endDate: Date): Promise<CampaignMetrics[]> {
    try {
      // Convert Date objects to date objects for the database
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(campaignMetrics)
        .where(
          and(
            eq(campaignMetrics.userId, userId),
            gte(campaignMetrics.date, startDateStr),
            lte(campaignMetrics.date, endDateStr)
          )
        )
        .orderBy(desc(campaignMetrics.date));
    } catch (error) {
      console.error('Error fetching campaign metrics:', error);
      throw error;
    }
  }

  async createAdReport(data: Omit<AmazonAdReport, "id" | "createdAt" | "lastCheckedAt">): Promise<AmazonAdReport> {
    const [report] = await db.insert(amazonAdReports)
      .values(data)
      .returning();
    return report;
  }

  async updateAdReportStatus(reportId: string, status: string, url?: string): Promise<void> {
    const updates: Partial<AmazonAdReport> = {
      status,
      lastCheckedAt: new Date(),
      retryCount: sql`retry_count + 1`,
    };

    if (url) {
      updates.downloadUrl = url;
      updates.urlExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    }

    if (status === 'SUCCESS' || status === 'FAILED') {
      updates.completedAt = new Date();
    }

    await db.update(amazonAdReports)
      .set(updates)
      .where(eq(amazonAdReports.reportId, reportId));
  }

  async getAdReport(reportId: string): Promise<AmazonAdReport | undefined> {
    const [report] = await db.select()
      .from(amazonAdReports)
      .where(eq(amazonAdReports.reportId, reportId));
    return report;
  }

  async getActiveReports(profileId: string): Promise<AmazonAdReport[]> {
    return db.select()
      .from(amazonAdReports)
      .where(
        and(
          eq(amazonAdReports.profileId, profileId),
          or(
            eq(amazonAdReports.status, 'PENDING'),
            eq(amazonAdReports.status, 'IN_PROGRESS')
          )
        )
      );
  }

  async createDemoRequest(request: InsertDemoRequest): Promise<DemoRequest> {
    const [demoRequest] = await db.insert(demoRequests)
      .values({
        ...request,
        createdAt: new Date(),
        status: "pending"
      })
      .returning();
    return demoRequest;
  }

  async getDemoRequest(id: number): Promise<DemoRequest | undefined> {
    const [demoRequest] = await db.select()
      .from(demoRequests)
      .where(eq(demoRequests.id, id));
    return demoRequest;
  }

  async getDemoRequests(): Promise<DemoRequest[]> {
    return await db.select().from(demoRequests);
  }

  async getGoogleToken(userId: string): Promise<GoogleToken | undefined> {
    const result = await db.select().from(googleTokens).where(eq(googleTokens.userId, userId));
    return result[0];
  }

  async saveGoogleToken(token: Omit<GoogleToken, "id">): Promise<GoogleToken> {
    // First try to update existing token
    const [existingToken] = await db
      .select()
      .from(googleTokens)
      .where(eq(googleTokens.userId, token.userId));

    if (existingToken) {
      const [updatedToken] = await db
        .update(googleTokens)
        .set({
          ...token,
          lastRefreshed: new Date(),
        })
        .where(eq(googleTokens.userId, token.userId))
        .returning();
      return updatedToken;
    }

    // If no existing token, create new one
    const [newToken] = await db
      .insert(googleTokens)
      .values({
        ...token,
        lastRefreshed: new Date(),
      })
      .returning();
    return newToken;
  }

  async deleteGoogleToken(userId: string): Promise<void> {
    await db.delete(googleTokens).where(eq(googleTokens.userId, userId));
  }

  async createGoogleAdvertiserAccount(advertiser: Omit<GoogleAdvertiserAccount, "id" | "createdAt" | "lastSynced">): Promise<GoogleAdvertiserAccount> {
    const result = await db.insert(googleAdvertiserAccounts).values({
      ...advertiser,
      createdAt: new Date(),
      lastSynced: new Date(),
    }).returning();
    return result[0];
  }

  async getGoogleAdvertiserAccounts(userId: string): Promise<GoogleAdvertiserAccount[]> {
    return await db.select().from(googleAdvertiserAccounts).where(eq(googleAdvertiserAccounts.userId, userId));
  }

  async deleteGoogleAdvertiserAccount(userId: string, customerId: string): Promise<void> {
    await db.delete(googleAdvertiserAccounts)
      .where(
        and(
          eq(googleAdvertiserAccounts.userId, userId),
          eq(googleAdvertiserAccounts.customerId, customerId)
        )
      );
  }

  async saveGoogleCampaignMetrics(metrics: Omit<GoogleCampaignMetrics, "id" | "createdAt">): Promise<GoogleCampaignMetrics> {
    try {
      const result = await db.insert(googleCampaignMetrics)
        .values(metrics)
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error saving Google campaign metrics:', error);
      throw error;
    }
  }

  async getGoogleCampaignMetrics(userId: string, startDate: Date, endDate: Date): Promise<GoogleCampaignMetrics[]> {
    try {
      // Convert Date objects to date strings for the database
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      return await db.select()
        .from(googleCampaignMetrics)
        .where(
          and(
            eq(googleCampaignMetrics.userId, userId),
            gte(googleCampaignMetrics.date, startDateStr),
            lte(googleCampaignMetrics.date, endDateStr)
          )
        )
        .orderBy(desc(googleCampaignMetrics.date));
    } catch (error) {
      console.error('Error fetching Google campaign metrics:', error);
      throw error;
    }
  }
  async deleteGoogleAdvertiserAccounts(userId: string): Promise<void> {
    await db.delete(googleAdvertiserAccounts).where(eq(googleAdvertiserAccounts.userId, userId));
  }
  
  // Chat methods
  async createChatConversation(userId: string, title: string): Promise<ChatConversation> {
    // Generate a UUID for the conversation
    const conversationId = crypto.randomUUID();
    
    const [conversation] = await db.insert(chatConversations)
      .values({
        id: conversationId,
        userId,
        title,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return conversation;
  }
  
  async getChatConversation(id: string): Promise<ChatConversation | undefined> {
    const [conversation] = await db.select()
      .from(chatConversations)
      .where(eq(chatConversations.id, id));
    return conversation;
  }
  
  async getChatConversations(userId: string): Promise<ChatConversation[]> {
    return await db.select()
      .from(chatConversations)
      .where(eq(chatConversations.userId, userId))
      .orderBy(desc(chatConversations.updatedAt));
  }
  
  async updateChatConversationTitle(id: string, title: string): Promise<ChatConversation> {
    const [updatedConversation] = await db.update(chatConversations)
      .set({ 
        title,
        updatedAt: new Date()
      })
      .where(eq(chatConversations.id, id))
      .returning();
    return updatedConversation;
  }
  
  async deleteChatConversation(id: string): Promise<void> {
    // Delete all messages first (cascade delete not automatic)
    await db.delete(chatMessages)
      .where(eq(chatMessages.conversationId, id));
      
    // Then delete the conversation
    await db.delete(chatConversations)
      .where(eq(chatConversations.id, id));
  }
  
  async createChatMessage(message: InsertChatMessage & { conversationId: string }): Promise<ChatMessage> {
    // Update conversation timestamp
    await db.update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, message.conversationId));
    
    // Generate a UUID for the message
    const messageId = crypto.randomUUID();
    
    // Create message
    const [newMessage] = await db.insert(chatMessages)
      .values({
        id: messageId,
        ...message,
        createdAt: new Date()
      })
      .returning();
    return newMessage;
  }
  
  async getChatMessages(conversationId: string): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(chatMessages.createdAt);
  }
  
  // Campaign metrics summary methods
  async createCampaignMetricsSummary(summary: Omit<CampaignMetricsSummary, "id" | "createdAt" | "updatedAt">): Promise<CampaignMetricsSummary> {
    try {
      const now = new Date();
      const [result] = await db.insert(campaignMetricsSummary)
        .values({
          ...summary,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating campaign metrics summary:', error);
      throw error;
    }
  }
  
  async getCampaignMetricsSummaries(userId: string, timeFrame: string, startDate?: Date, endDate?: Date): Promise<CampaignMetricsSummary[]> {
    try {
      // Build the base query conditions
      const conditions = [
        eq(campaignMetricsSummary.userId, userId),
        eq(campaignMetricsSummary.timeFrame, timeFrame)
      ];

      // Add date filters if provided, converting to string format
      if (startDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        conditions.push(gte(campaignMetricsSummary.startDate, startDateStr));
      }
      
      if (endDate) {
        const endDateStr = endDate.toISOString().split('T')[0];
        conditions.push(lte(campaignMetricsSummary.endDate, endDateStr));
      }
      
      return await db.select()
        .from(campaignMetricsSummary)
        .where(and(...conditions))
        .orderBy(desc(campaignMetricsSummary.endDate));
    } catch (error) {
      console.error('Error fetching campaign metrics summaries:', error);
      throw error;
    }
  }
  
  async updateCampaignMetricsSummary(id: number, summary: Partial<CampaignMetricsSummary>): Promise<CampaignMetricsSummary> {
    try {
      const [result] = await db.update(campaignMetricsSummary)
        .set({
          ...summary,
          updatedAt: new Date()
        })
        .where(eq(campaignMetricsSummary.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating campaign metrics summary:', error);
      throw error;
    }
  }
  
  async generateCampaignMetricsSummaries(userId: string): Promise<void> {
    try {
      // Get all advertiser accounts for this user
      const accounts = await this.getAdvertiserAccounts(userId);
      
      if (!accounts.length) {
        return; // No accounts to summarize
      }
      
      // Define time frame ranges
      const timeFrames = [
        { name: 'daily', days: 1 },
        { name: 'weekly', days: 7 },
        { name: 'monthly', days: 30 },
        { name: 'quarterly', days: 90 },
      ];
      
      const now = new Date();
      
      // For each account + time frame, generate summaries
      for (const account of accounts) {
        for (const timeFrame of timeFrames) {
          // For each campaign in the account
          // First get distinct campaigns
          const campaigns = await db.selectDistinct({ campaignId: campaignMetrics.campaignId })
            .from(campaignMetrics)
            .where(
              and(
                eq(campaignMetrics.userId, userId), 
                eq(campaignMetrics.profileId, account.profileId)
              )
            );
            
          for (const campaign of campaigns) {
            // Set date range for this time frame
            const endDate = new Date(now);
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - timeFrame.days);
            
            // Convert dates to ISO strings for database queries
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Calculate aggregate metrics
            const metrics = await db.select({
              totalImpressions: sql`SUM(${campaignMetrics.impressions})`,
              totalClicks: sql`SUM(${campaignMetrics.clicks})`,
              totalCost: sql`SUM(${campaignMetrics.cost})`
            })
            .from(campaignMetrics)
            .where(
              and(
                eq(campaignMetrics.userId, userId),
                eq(campaignMetrics.profileId, account.profileId),
                eq(campaignMetrics.campaignId, campaign.campaignId),
                gte(campaignMetrics.date, startDateStr),
                lte(campaignMetrics.date, endDateStr)
              )
            );
            
            if (metrics.length && metrics[0].totalImpressions) {
              const { totalImpressions, totalClicks, totalCost } = metrics[0];
              
              // Calculate CTR
              const ctr = totalImpressions > 0 
                ? (Number(totalClicks) / Number(totalImpressions)) * 100 
                : 0;
              
              // Check if summary exists for this time frame + campaign
              const existingSummaries = await db.select()
                .from(campaignMetricsSummary)
                .where(
                  and(
                    eq(campaignMetricsSummary.userId, userId),
                    eq(campaignMetricsSummary.profileId, account.profileId),
                    eq(campaignMetricsSummary.campaignId, campaign.campaignId),
                    eq(campaignMetricsSummary.timeFrame, timeFrame.name),
                    gte(campaignMetricsSummary.startDate, startDateStr),
                    lte(campaignMetricsSummary.endDate, endDateStr)
                  )
                );
                
              if (existingSummaries.length) {
                // Update existing summary
                await this.updateCampaignMetricsSummary(existingSummaries[0].id, {
                  totalImpressions: Number(totalImpressions),
                  totalClicks: Number(totalClicks),
                  totalCost: Number(totalCost),
                  ctr
                });
              } else {
                // Create new summary
                await this.createCampaignMetricsSummary({
                  userId,
                  timeFrame: timeFrame.name,
                  startDate: startDateStr,
                  endDate: endDateStr,
                  profileId: account.profileId,
                  campaignId: campaign.campaignId,
                  totalImpressions: Number(totalImpressions),
                  totalClicks: Number(totalClicks),
                  totalCost: Number(totalCost),
                  ctr,
                  conversions: 0 // Default value
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating campaign metrics summaries:', error);
      throw error;
    }
  }
  
  // Google campaign metrics summary methods
  async createGoogleCampaignMetricsSummary(summary: Omit<GoogleCampaignMetricsSummary, "id" | "createdAt" | "updatedAt">): Promise<GoogleCampaignMetricsSummary> {
    try {
      const now = new Date();
      const [result] = await db.insert(googleCampaignMetricsSummary)
        .values({
          ...summary,
          createdAt: now,
          updatedAt: now
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating Google campaign metrics summary:', error);
      throw error;
    }
  }
  
  async getGoogleCampaignMetricsSummaries(userId: string, timeFrame: string, startDate?: Date, endDate?: Date): Promise<GoogleCampaignMetricsSummary[]> {
    try {
      // Build the base query conditions
      const conditions = [
        eq(googleCampaignMetricsSummary.userId, userId),
        eq(googleCampaignMetricsSummary.timeFrame, timeFrame)
      ];
      
      // Add date filters if provided, converting to string format
      if (startDate) {
        const startDateStr = startDate.toISOString().split('T')[0];
        conditions.push(gte(googleCampaignMetricsSummary.startDate, startDateStr));
      }
      
      if (endDate) {
        const endDateStr = endDate.toISOString().split('T')[0];
        conditions.push(lte(googleCampaignMetricsSummary.endDate, endDateStr));
      }
      
      return await db.select()
        .from(googleCampaignMetricsSummary)
        .where(and(...conditions))
        .orderBy(desc(googleCampaignMetricsSummary.endDate));
    } catch (error) {
      console.error('Error fetching Google campaign metrics summaries:', error);
      throw error;
    }
  }
  
  async updateGoogleCampaignMetricsSummary(id: number, summary: Partial<GoogleCampaignMetricsSummary>): Promise<GoogleCampaignMetricsSummary> {
    try {
      const [result] = await db.update(googleCampaignMetricsSummary)
        .set({
          ...summary,
          updatedAt: new Date()
        })
        .where(eq(googleCampaignMetricsSummary.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating Google campaign metrics summary:', error);
      throw error;
    }
  }
  
  async generateGoogleCampaignMetricsSummaries(userId: string): Promise<void> {
    try {
      // Get all Google advertiser accounts for this user
      const accounts = await this.getGoogleAdvertiserAccounts(userId);
      
      if (!accounts.length) {
        return; // No accounts to summarize
      }
      
      // Define time frame ranges
      const timeFrames = [
        { name: 'daily', days: 1 },
        { name: 'weekly', days: 7 },
        { name: 'monthly', days: 30 },
        { name: 'quarterly', days: 90 },
      ];
      
      const now = new Date();
      
      // For each account + time frame, generate summaries
      for (const account of accounts) {
        for (const timeFrame of timeFrames) {
          // For each campaign in the account
          // First get distinct campaigns
          const campaigns = await db.selectDistinct({ campaignId: googleCampaignMetrics.campaignId })
            .from(googleCampaignMetrics)
            .where(
              and(
                eq(googleCampaignMetrics.userId, userId), 
                eq(googleCampaignMetrics.customerId, account.customerId)
              )
            );
            
          for (const campaign of campaigns) {
            // Set date range for this time frame
            const endDate = new Date(now);
            const startDate = new Date(now);
            startDate.setDate(now.getDate() - timeFrame.days);
            
            // Convert dates to ISO strings for database queries
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Calculate aggregate metrics
            const metrics = await db.select({
              totalImpressions: sql`SUM(${googleCampaignMetrics.impressions})`,
              totalClicks: sql`SUM(${googleCampaignMetrics.clicks})`,
              totalCost: sql`SUM(${googleCampaignMetrics.cost})`,
              conversions: sql`SUM(${googleCampaignMetrics.conversions})`
            })
            .from(googleCampaignMetrics)
            .where(
              and(
                eq(googleCampaignMetrics.userId, userId),
                eq(googleCampaignMetrics.customerId, account.customerId),
                eq(googleCampaignMetrics.campaignId, campaign.campaignId),
                gte(googleCampaignMetrics.date, startDateStr),
                lte(googleCampaignMetrics.date, endDateStr)
              )
            );
            
            if (metrics.length && metrics[0].totalImpressions) {
              const { totalImpressions, totalClicks, totalCost, conversions } = metrics[0];
              
              // Calculate CTR
              const ctr = totalImpressions > 0 
                ? (Number(totalClicks) / Number(totalImpressions)) * 100 
                : 0;
              
              // Check if summary exists for this time frame + campaign
              const existingSummaries = await db.select()
                .from(googleCampaignMetricsSummary)
                .where(
                  and(
                    eq(googleCampaignMetricsSummary.userId, userId),
                    eq(googleCampaignMetricsSummary.customerId, account.customerId),
                    eq(googleCampaignMetricsSummary.campaignId, campaign.campaignId),
                    eq(googleCampaignMetricsSummary.timeFrame, timeFrame.name),
                    gte(googleCampaignMetricsSummary.startDate, startDateStr),
                    lte(googleCampaignMetricsSummary.endDate, endDateStr)
                  )
                );
                
              if (existingSummaries.length) {
                // Update existing summary
                await this.updateGoogleCampaignMetricsSummary(existingSummaries[0].id, {
                  totalImpressions: Number(totalImpressions),
                  totalClicks: Number(totalClicks),
                  totalCost: Number(totalCost),
                  conversions: Number(conversions || 0),
                  ctr
                });
              } else {
                // Create new summary
                await this.createGoogleCampaignMetricsSummary({
                  userId,
                  timeFrame: timeFrame.name,
                  startDate: startDateStr,
                  endDate: endDateStr,
                  customerId: account.customerId,
                  campaignId: campaign.campaignId,
                  totalImpressions: Number(totalImpressions),
                  totalClicks: Number(totalClicks),
                  totalCost: Number(totalCost),
                  conversions: Number(conversions || 0),
                  ctr
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating Google campaign metrics summaries:', error);
      throw error;
    }
  }
  
  // Query cache methods
  async createQueryCacheEntry(entry: Omit<QueryCacheEntry, "id" | "createdAt" | "hitCount">): Promise<QueryCacheEntry> {
    try {
      const [result] = await db.insert(queryCacheEntries)
        .values({
          ...entry,
          createdAt: new Date(),
          hitCount: 0
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error creating query cache entry:', error);
      throw error;
    }
  }
  
  async getQueryCacheEntry(userId: string, queryHash: string): Promise<QueryCacheEntry | undefined> {
    try {
      const [entry] = await db.select()
        .from(queryCacheEntries)
        .where(
          and(
            eq(queryCacheEntries.userId, userId),
            eq(queryCacheEntries.queryHash, queryHash),
            gte(queryCacheEntries.expiresAt, new Date()) // Only return non-expired entries
          )
        );
      
      if (entry) {
        // Increment hit count
        await this.updateQueryCacheHitCount(entry.id);
      }
      
      return entry;
    } catch (error) {
      console.error('Error fetching query cache entry:', error);
      throw error;
    }
  }
  
  async updateQueryCacheHitCount(id: number): Promise<QueryCacheEntry> {
    try {
      const [updatedEntry] = await db.update(queryCacheEntries)
        .set({
          hitCount: sql`hit_count + 1`
        })
        .where(eq(queryCacheEntries.id, id))
        .returning();
      return updatedEntry;
    } catch (error) {
      console.error('Error updating query cache hit count:', error);
      throw error;
    }
  }
  
  async invalidateQueryCache(userId: string, olderThan?: Date): Promise<void> {
    try {
      let query = db.delete(queryCacheEntries)
        .where(eq(queryCacheEntries.userId, userId));
      
      if (olderThan) {
        query = query.where(lte(queryCacheEntries.createdAt, olderThan));
      }
      
      await query;
    } catch (error) {
      console.error('Error invalidating query cache:', error);
      throw error;
    }
  }

  // Campaign management methods
  async createCampaign(campaign: Omit<InsertCampaign, "userId"> & { userId: string }): Promise<Campaign> {
    const [result] = await db.insert(campaigns).values({
      ...campaign,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }
  
  async getCampaign(id: number): Promise<Campaign | undefined> {
    const [result] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return result;
  }
  
  async getCampaigns(userId: string, profileId?: string): Promise<Campaign[]> {
    let query = db.select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId));
      
    if (profileId) {
      query = query.where(eq(campaigns.profileId, profileId));
    }
    
    return query.orderBy(desc(campaigns.createdAt));
  }
  
  async updateCampaignState(id: number, state: string): Promise<Campaign> {
    const [result] = await db.update(campaigns)
      .set({ 
        state,
        updatedAt: new Date()
      })
      .where(eq(campaigns.id, id))
      .returning();
    return result;
  }
  
  // Ad group management methods
  async createAdGroup(adGroup: Omit<InsertAdGroup, "userId"> & { userId: string }): Promise<AdGroup> {
    const [result] = await db.insert(adGroups).values({
      ...adGroup,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return result;
  }
  
  async getAdGroup(id: number): Promise<AdGroup | undefined> {
    const [result] = await db.select().from(adGroups).where(eq(adGroups.id, id));
    return result;
  }
  
  async getAdGroups(campaignId: number): Promise<AdGroup[]> {
    return db.select()
      .from(adGroups)
      .where(eq(adGroups.campaignId, campaignId))
      .orderBy(desc(adGroups.createdAt));
  }
  
  async updateAdGroupState(id: number, state: string): Promise<AdGroup> {
    const [result] = await db.update(adGroups)
      .set({ 
        state,
        updatedAt: new Date()
      })
      .where(eq(adGroups.id, id))
      .returning();
    return result;
  }
  
  // Product ad management methods
  async createProductAd(productAd: Omit<InsertProductAd, "userId"> & { userId: string }): Promise<ProductAd> {
    const [result] = await db.insert(productAds).values({
      ...productAd,
      createdAt: new Date()
    }).returning();
    return result;
  }
  
  async getProductAds(adGroupId: number): Promise<ProductAd[]> {
    return db.select()
      .from(productAds)
      .where(eq(productAds.adGroupId, adGroupId));
  }
  
  // Keyword management methods
  async createKeyword(keyword: Omit<InsertKeyword, "userId"> & { userId: string }): Promise<Keyword> {
    const [result] = await db.insert(keywords).values({
      ...keyword,
      createdAt: new Date()
    }).returning();
    return result;
  }
  
  async getKeywords(adGroupId: number): Promise<Keyword[]> {
    return db.select()
      .from(keywords)
      .where(eq(keywords.adGroupId, adGroupId));
  }
  
  // Negative keyword management methods
  async createNegativeKeyword(negativeKeyword: Omit<InsertNegativeKeyword, "userId"> & { userId: string }): Promise<NegativeKeyword> {
    const [result] = await db.insert(negativeKeywords).values({
      ...negativeKeyword,
      createdAt: new Date()
    }).returning();
    return result;
  }
  
  async getNegativeKeywords(adGroupId: number): Promise<NegativeKeyword[]> {
    return db.select()
      .from(negativeKeywords)
      .where(eq(negativeKeywords.adGroupId, adGroupId));
  }
}

export const storage = new DatabaseStorage();