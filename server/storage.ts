import { User, InsertUser, AmazonToken, ApiKey } from "@shared/schema";
import session from "express-session";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { users, amazonTokens, apiKeys } from "@shared/schema";
import connectPg from "connect-pg-simple";
import { nanoid } from "nanoid";

const PostgresSessionStore = connectPg(session);

const queryClient = postgres(process.env.DATABASE_URL!);
const db = drizzle(queryClient);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Amazon token management
  getAmazonToken(userId: number): Promise<AmazonToken | undefined>;
  saveAmazonToken(token: Omit<AmazonToken, "id">): Promise<AmazonToken>;
  deleteAmazonToken(userId: number): Promise<void>;

  // API key management
  createApiKey(userId: number, name: string): Promise<ApiKey>;
  getApiKeys(userId: number): Promise<ApiKey[]>;
  deactivateApiKey(id: number, userId: number): Promise<void>;

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

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getAmazonToken(userId: number): Promise<AmazonToken | undefined> {
    const result = await db.select().from(amazonTokens).where(eq(amazonTokens.userId, userId));
    return result[0];
  }

  async saveAmazonToken(token: Omit<AmazonToken, "id">): Promise<AmazonToken> {
    const result = await db.insert(amazonTokens).values(token).returning();
    return result[0];
  }

  async deleteAmazonToken(userId: number): Promise<void> {
    await db.delete(amazonTokens).where(eq(amazonTokens.userId, userId));
  }

  async createApiKey(userId: number, name: string): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values({
      userId,
      name,
      key: nanoid(32),
      active: true,
      createdAt: new Date(),
    }).returning();
    return result[0];
  }

  async getApiKeys(userId: number): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async deactivateApiKey(id: number, userId: number): Promise<void> {
    await db.update(apiKeys)
      .set({ active: false })
      .where(eq(apiKeys.id, id))
      .where(eq(apiKeys.userId, userId));
  }
}

export const storage = new DatabaseStorage();