import { 
  User, InsertUser, AmazonToken, ApiKey, AdvertiserAccount, 
  CampaignMetrics, amazonAdReports, type AmazonAdReport,
  DemoRequest, InsertDemoRequest, demoRequests,
  GoogleToken, GoogleAdvertiserAccount, GoogleCampaignMetrics,
  ChatConversation, ChatMessage, InsertChatConversation, InsertChatMessage,
  EmbeddingStore, InsertEmbeddingStore, ChatEmbedding, InsertChatEmbedding,
  users, amazonTokens, apiKeys, advertiserAccounts, tokenRefreshLog, 
  campaignMetrics, googleTokens, googleAdvertiserAccounts, googleCampaignMetrics, 
  chatConversations, chatMessages, embeddingsStore, chatEmbeddings
} from "@shared/schema";
import session from "express-session";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, gte, lte, desc, or, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";
import crypto from "crypto";

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
  
  // Embedding management
  createEmbedding(embedding: InsertEmbeddingStore): Promise<EmbeddingStore>;
  getEmbedding(id: string): Promise<EmbeddingStore | undefined>;
  getEmbeddingsByType(type: string, limit?: number): Promise<EmbeddingStore[]>;
  getEmbeddingsBySourceId(sourceId: string): Promise<EmbeddingStore[]>;
  searchSimilarEmbeddings(
    queryVector: number[], 
    type?: string, 
    limit?: number
  ): Promise<Array<{embedding: EmbeddingStore, similarity: number}>>;
  
  // Chat embedding relationships
  createChatEmbedding(chatEmbedding: InsertChatEmbedding): Promise<ChatEmbedding>;
  getChatEmbeddings(conversationId: string): Promise<ChatEmbedding[]>;
  
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
      return await db.select()
        .from(googleCampaignMetrics)
        .where(
          and(
            eq(googleCampaignMetrics.userId, userId),
            gte(googleCampaignMetrics.date, startDate),
            lte(googleCampaignMetrics.date, endDate)
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
    
    // Use provided message ID if present, otherwise generate a new UUID
    const messageId = message.id || crypto.randomUUID();
    
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

  // Embedding management methods
  async createEmbedding(embedding: InsertEmbeddingStore): Promise<EmbeddingStore> {
    // Generate a UUID for the embedding
    const embeddingId = crypto.randomUUID();
    
    try {
      // Make sure we're using the correct field names
      const embeddingData = {
        id: embeddingId,
        embeddingVector: embedding.embeddingVector,
        textContent: embedding.textContent,
        type: embedding.type,
        sourceId: embedding.sourceId,
        userId: embedding.userId,
        metadata: embedding.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [newEmbedding] = await db.insert(embeddingsStore)
        .values(embeddingData)
        .returning();
      
      return newEmbedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }
  
  async getEmbedding(id: string): Promise<EmbeddingStore | undefined> {
    try {
      const [embedding] = await db.select()
        .from(embeddingsStore)
        .where(eq(embeddingsStore.id, id));
        
      return embedding;
    } catch (error) {
      console.error('Error fetching embedding:', error);
      throw error;
    }
  }
  
  async getEmbeddingsByType(type: string, limit: number = 100): Promise<EmbeddingStore[]> {
    try {
      return await db.select()
        .from(embeddingsStore)
        .where(eq(embeddingsStore.type, type))
        .limit(limit)
        .orderBy(desc(embeddingsStore.createdAt));
    } catch (error) {
      console.error(`Error fetching embeddings by type ${type}:`, error);
      throw error;
    }
  }
  
  async getEmbeddingsBySourceId(sourceId: string): Promise<EmbeddingStore[]> {
    try {
      return await db.select()
        .from(embeddingsStore)
        .where(eq(embeddingsStore.sourceId, sourceId))
        .orderBy(embeddingsStore.createdAt);
    } catch (error) {
      console.error(`Error fetching embeddings by sourceId ${sourceId}:`, error);
      throw error;
    }
  }
  
  async searchSimilarEmbeddings(
    queryVector: number[], 
    type?: string, 
    limit: number = 5
  ): Promise<Array<{embedding: EmbeddingStore, similarity: number}>> {
    try {
      // Import the pool from db.ts to avoid circular dependencies
      const { pool } = await import('./db');
      
      // Use PostgreSQL's native vector operations for efficient similarity search
      // This optimized approach uses a raw SQL query to leverage PostgreSQL's vector capabilities
      
      // Prepare the query vector as a string
      const vectorString = JSON.stringify(queryVector);
      
      // Build the SQL query with optional type filter
      // Use parameterized query for type to prevent SQL injection
      let query;
      let params;
      
      // Since we don't have PostgreSQL vector extension, use fallback method
      const embeddings = type
        ? await db.select().from(embeddingsStore).where(eq(embeddingsStore.type, type as any))
        : await db.select().from(embeddingsStore);
        
      console.log(`Found ${embeddings.length} embeddings in database to compare`);
      
      // Early return if no embeddings found
      if (embeddings.length === 0) {
        return [];
      }
      
      // Manual similarity calculation
      return this.searchSimilarEmbeddingsInMemory(queryVector, type, limit);
    } catch (error) {
      console.error('Error searching similar embeddings:', error);
      // Fall back to in-memory calculation if the PostgreSQL vector extension fails
      return this.searchSimilarEmbeddingsInMemory(queryVector, type, limit);
    }
  }
  
  /**
   * Fallback method for similarity search that works in-memory
   * This is used if the PostgreSQL vector operations are not available
   */
  private async searchSimilarEmbeddingsInMemory(
    queryVector: number[], 
    type?: string, 
    limit: number = 5
  ): Promise<Array<{embedding: EmbeddingStore, similarity: number}>> {
    try {
      // First, get all embeddings with optional type filter
      let query = db.select().from(embeddingsStore);
      
      if (type) {
        query = query.where(eq(embeddingsStore.type, type));
      }
      
      const embeddings = await query;
      
      // Manual similarity calculation (cosine similarity) since we're using JSON storage
      const results = embeddings.map(embedding => {
        // Parse vector from JSON storage if necessary
        let vectorData;
        
        try {
          // Use the renamed field from vector to embeddingVector
          const vectorField = embedding.embeddingVector;
          
          if (Array.isArray(vectorField)) {
            vectorData = vectorField;
          } else if (typeof vectorField === 'string') {
            vectorData = JSON.parse(vectorField);
          } else if (vectorField && typeof vectorField === 'object') {
            // It might already be a parsed object
            vectorData = vectorField;
          } else {
            console.warn('Invalid vector data format:', typeof vectorField);
            vectorData = [];
          }
        } catch (e) {
          console.error('Error parsing vector data:', e);
          vectorData = [];
        }
            
        // Calculate dot product
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < queryVector.length; i++) {
          if (i < vectorData.length) {
            dotProduct += queryVector[i] * vectorData[i];
            normA += queryVector[i] * queryVector[i];
            normB += vectorData[i] * vectorData[i];
          }
        }
        
        // Calculate cosine similarity
        const similarity = 
          normA === 0 || normB === 0 
            ? 0 
            : dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            
        return {
          embedding,
          similarity
        };
      });
      
      // Sort by similarity (highest first) and take top K
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      console.error('Error in fallback similarity search:', error);
      throw error;
    }
  }
  
  // Chat embedding relationship methods
  async createChatEmbedding(chatEmbedding: InsertChatEmbedding): Promise<ChatEmbedding> {
    // Generate a UUID for the chat embedding
    const chatEmbeddingId = crypto.randomUUID();
    
    try {
      const [newChatEmbedding] = await db.insert(chatEmbeddings)
        .values({
          id: chatEmbeddingId,
          ...chatEmbedding,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return newChatEmbedding;
    } catch (error) {
      console.error('Error creating chat embedding:', error);
      throw error;
    }
  }
  
  async getChatEmbeddings(conversationId: string): Promise<ChatEmbedding[]> {
    try {
      return await db.select()
        .from(chatEmbeddings)
        .where(eq(chatEmbeddings.chatConversationId, conversationId))
        .orderBy(chatEmbeddings.createdAt);
    } catch (error) {
      console.error(`Error fetching chat embeddings for conversation ${conversationId}:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();