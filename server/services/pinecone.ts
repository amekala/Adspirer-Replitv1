/**
 * Pinecone Vector Database Service
 * 
 * This service handles all interactions with the Pinecone vector database,
 * providing a clean interface for storing, retrieving, and searching embeddings.
 * 
 * The service is designed to work independently from the embedding generation process,
 * allowing for easier debugging, testing, and maintenance.
 */

import { Pinecone, PineconeRecord, RecordMetadata } from '@pinecone-database/pinecone';
import { nanoid } from 'nanoid';
import { 
  PINECONE_API_KEY, 
  PINECONE_ENVIRONMENT, 
  PINECONE_INDEX_NAME,
  PINECONE_NAMESPACE,
  VECTOR_DIMENSIONS,
  PINECONE_METRIC,
  DEFAULT_TOP_K,
  SIMILARITY_THRESHOLD
} from './pinecone-constants';
import { log } from '../vite';

// Metadata types for different vector records
export interface BasePineconeMetadata extends RecordMetadata {
  userId: string;
  type: string;
  text: string;
  createdAt: string;
}

export interface CampaignMetadata extends BasePineconeMetadata {
  campaignId: string;
  campaignName: string;
  platformType: string;
}

export interface AdGroupMetadata extends BasePineconeMetadata {
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
}

export interface KeywordMetadata extends BasePineconeMetadata {
  keywordId: string;
  keywordText: string;
  adGroupId: string;
  campaignId: string;
}

export interface ChatMessageMetadata extends BasePineconeMetadata {
  messageId: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
}

export type PineconeMetadata = 
  | CampaignMetadata
  | AdGroupMetadata
  | KeywordMetadata
  | ChatMessageMetadata;

/**
 * PineconeService class handles all interactions with Pinecone vector DB
 * This service is designed to be instantiated once and reused throughout the app
 */
class PineconeService {
  private client: Pinecone | null = null;
  private isInitialized = false;
  private indexName: string;

  constructor() {
    this.indexName = PINECONE_INDEX_NAME;
  }

  /**
   * Initialize the Pinecone client and ensure the index exists
   * This method should be called before any other operations
   * @returns {Promise<boolean>} Whether initialization was successful
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if API key is available
      if (!PINECONE_API_KEY) {
        log('Pinecone API key not found in environment variables', 'pinecone');
        return false;
      }

      // Create Pinecone client
      this.client = new Pinecone({
        apiKey: PINECONE_API_KEY
      });

      // Check if index exists, create if not
      const indexes = await this.client.listIndexes();
      const indexExists = indexes.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        log(`Creating Pinecone index: ${this.indexName}`, 'pinecone');
        await this.client.createIndex({
          name: this.indexName,
          dimension: VECTOR_DIMENSIONS,
          metric: PINECONE_METRIC,
        });
        // Wait for index to be created (usually takes a few seconds)
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      this.isInitialized = true;
      log('Pinecone service initialized successfully', 'pinecone');
      return true;
    } catch (error) {
      log(`Pinecone initialization error: ${error}`, 'pinecone');
      return false;
    }
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} Whether the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }

  /**
   * Ensure the service is initialized before performing operations
   * @throws {Error} If the service is not initialized
   */
  private ensureInitialized(): void {
    if (!this.isReady()) {
      throw new Error('Pinecone service not initialized. Call initialize() first.');
    }
  }

  /**
   * Get the Pinecone index
   * @returns The Pinecone index object
   */
  private getIndex() {
    this.ensureInitialized();
    return this.client!.index(this.indexName);
  }

  /**
   * Add a single vector to Pinecone
   * @param {number[]} vector - The embedding vector
   * @param {PineconeMetadata} metadata - Metadata for the vector
   * @param {string} namespace - The namespace to store the vector in
   * @returns {Promise<string>} The ID of the created record
   */
  async upsertVector(
    vector: number[], 
    metadata: PineconeMetadata, 
    namespace: string
  ): Promise<string> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      // Generate a unique ID if not provided
      const id = metadata.id || `vec_${nanoid()}`;
      
      // Create the record
      const record: PineconeRecord<PineconeMetadata> = {
        id,
        values: vector,
        metadata
      };

      // Upsert the record
      await index.namespace(namespace).upsert([record]);
      
      return id;
    } catch (error) {
      log(`Error upserting vector to Pinecone: ${error}`, 'pinecone');
      throw error;
    }
  }

  /**
   * Add multiple vectors to Pinecone
   * @param {Array<{vector: number[], metadata: PineconeMetadata}>} records - The records to add
   * @param {string} namespace - The namespace to store the vectors in
   * @returns {Promise<string[]>} The IDs of the created records
   */
  async upsertVectors(
    records: Array<{vector: number[], metadata: PineconeMetadata}>,
    namespace: string
  ): Promise<string[]> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      // Process records
      const pineconeRecords: PineconeRecord<PineconeMetadata>[] = records.map(({ vector, metadata }) => {
        const id = metadata.id || `vec_${nanoid()}`;
        return {
          id,
          values: vector,
          metadata
        };
      });

      // Insert records in batches of 100 (Pinecone recommends this)
      const batchSize = 100;
      for (let i = 0; i < pineconeRecords.length; i += batchSize) {
        const batch = pineconeRecords.slice(i, i + batchSize);
        await index.namespace(namespace).upsert(batch);
      }
      
      return pineconeRecords.map(record => record.id);
    } catch (error) {
      log(`Error upserting vectors to Pinecone: ${error}`, 'pinecone');
      throw error;
    }
  }

  /**
   * Query similar vectors in Pinecone
   * @param {number[]} queryVector - The query vector
   * @param {Object} options - Query options
   * @returns {Promise<Array<{id: string, score: number, metadata: PineconeMetadata}>>} Similar vectors
   */
  async querySimilar(
    queryVector: number[],
    options: {
      namespace?: string,
      filter?: Record<string, any>,
      topK?: number,
      minScore?: number
    } = {}
  ): Promise<Array<{id: string, score: number, metadata: PineconeMetadata}>> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      // Set default options
      const namespace = options.namespace || PINECONE_NAMESPACE.CAMPAIGNS;
      const topK = options.topK || DEFAULT_TOP_K;
      const minScore = options.minScore || SIMILARITY_THRESHOLD;
      
      // Execute query
      const queryResult = await index.namespace(namespace).query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter: options.filter
      });
      
      // Process and filter results
      return (queryResult.matches || [])
        .filter(match => match.score >= minScore)
        .map(match => ({
          id: match.id,
          score: match.score,
          metadata: match.metadata as PineconeMetadata
        }));
    } catch (error) {
      log(`Error querying Pinecone: ${error}`, 'pinecone');
      throw error;
    }
  }

  /**
   * Delete vectors from Pinecone
   * @param {string[]} ids - The IDs of the vectors to delete
   * @param {string} namespace - The namespace the vectors are in
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async deleteVectors(ids: string[], namespace: string): Promise<boolean> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      await index.namespace(namespace).deleteMany(ids);
      return true;
    } catch (error) {
      log(`Error deleting vectors from Pinecone: ${error}`, 'pinecone');
      return false;
    }
  }

  /**
   * Delete all vectors in a namespace
   * @param {string} namespace - The namespace to clear
   * @returns {Promise<boolean>} Whether the operation was successful
   */
  async clearNamespace(namespace: string): Promise<boolean> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      await index.namespace(namespace).deleteAll();
      return true;
    } catch (error) {
      log(`Error clearing namespace in Pinecone: ${error}`, 'pinecone');
      return false;
    }
  }

  /**
   * Get stats about the index
   * @returns {Promise<any>} Statistics about the index
   */
  async getStats(): Promise<any> {
    try {
      this.ensureInitialized();
      const index = this.getIndex();
      
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      log(`Error getting Pinecone stats: ${error}`, 'pinecone');
      throw error;
    }
  }
}

// Create and export a singleton instance
export const pineconeService = new PineconeService();

// Additional helpers for specific embedding types

/**
 * Store a campaign embedding in Pinecone
 * @param {number[]} vector - The embedding vector
 * @param {Object} campaign - Campaign data
 * @param {string} userId - User ID
 * @returns {Promise<string>} The ID of the created record
 */
export async function storeCampaignEmbedding(
  vector: number[],
  campaign: any,
  userId: string
): Promise<string> {
  const metadata: CampaignMetadata = {
    userId,
    type: 'campaign',
    campaignId: campaign.id || campaign.campaignId,
    campaignName: campaign.name || campaign.campaignName,
    platformType: campaign.platformType || 'amazon',
    text: campaign.description || `Campaign: ${campaign.name || campaign.campaignName}`,
    createdAt: new Date().toISOString()
  };
  
  return pineconeService.upsertVector(
    vector,
    metadata,
    PINECONE_NAMESPACE.CAMPAIGNS
  );
}

/**
 * Store a chat message embedding in Pinecone
 * @param {number[]} vector - The embedding vector
 * @param {Object} message - Message data
 * @param {string} userId - User ID 
 * @returns {Promise<string>} The ID of the created record
 */
export async function storeChatMessageEmbedding(
  vector: number[],
  message: any,
  userId: string
): Promise<string> {
  const metadata: ChatMessageMetadata = {
    userId,
    type: 'chat_message',
    messageId: message.id,
    conversationId: message.conversationId,
    role: message.role,
    text: message.content,
    createdAt: new Date().toISOString()
  };
  
  return pineconeService.upsertVector(
    vector,
    metadata,
    PINECONE_NAMESPACE.CHAT_MESSAGES
  );
}