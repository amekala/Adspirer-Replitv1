import { User, InsertUser, AmazonToken, ApiKey, AdvertiserAccount, CampaignMetrics, amazonAdReports, type AmazonAdReport } from "@shared/schema";
import session from "express-session";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gte, lte, desc, or } from "drizzle-orm";
import { users, amazonTokens, apiKeys, advertiserAccounts, tokenRefreshLog, campaignMetrics } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";

const PostgresSessionStore = connectPg(session);

const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient);

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

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
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
      return await db.select()
        .from(campaignMetrics)
        .where(
          and(
            eq(campaignMetrics.userId, userId),
            gte(campaignMetrics.date, startDate),
            lte(campaignMetrics.date, endDate)
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
      retryCount: db.raw('retry_count + 1'),
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
}

export const storage = new DatabaseStorage();