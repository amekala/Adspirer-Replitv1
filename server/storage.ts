import { User, InsertUser, AmazonToken, ApiKey } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { nanoid } from "nanoid";

const MemoryStore = createMemoryStore(session);

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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private amazonTokens: Map<number, AmazonToken>;
  private apiKeys: Map<number, ApiKey>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.amazonTokens = new Map();
    this.apiKeys = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAmazonToken(userId: number): Promise<AmazonToken | undefined> {
    return Array.from(this.amazonTokens.values()).find(
      (token) => token.userId === userId,
    );
  }

  async saveAmazonToken(token: Omit<AmazonToken, "id">): Promise<AmazonToken> {
    const id = this.currentId++;
    const newToken = { ...token, id };
    this.amazonTokens.set(id, newToken);
    return newToken;
  }

  async deleteAmazonToken(userId: number): Promise<void> {
    const token = await this.getAmazonToken(userId);
    if (token) {
      this.amazonTokens.delete(token.id);
    }
  }

  async createApiKey(userId: number, name: string): Promise<ApiKey> {
    const id = this.currentId++;
    const apiKey: ApiKey = {
      id,
      userId,
      key: nanoid(32),
      name,
      active: true,
      createdAt: new Date(),
    };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async getApiKeys(userId: number): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values()).filter(
      (key) => key.userId === userId,
    );
  }

  async deactivateApiKey(id: number, userId: number): Promise<void> {
    const key = this.apiKeys.get(id);
    if (key && key.userId === userId) {
      this.apiKeys.set(id, { ...key, active: false });
    }
  }
}

export const storage = new MemStorage();
