/**
 * Pinecone Vector Database Service
 * 
 * This service handles all interactions with the Pinecone vector database,
 * providing a clean interface for storing, retrieving, and searching embeddings.
 * 
 * The service is designed to work independently from the embedding generation process,
 * allowing for easier debugging, testing, and maintenance.
 */

import { Pinecone } from '@pinecone-database/pinecone';
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
import { generateEmbedding } from './embedding';

// Metadata types for different vector records
export interface BasePineconeMetadata {
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

// Singleton instance to ensure we only have one connection to Pinecone
let pineconeClient: Pinecone | null = null;
let pineconeIndex: any = null;
let isInitialized = false;

/**
 * Initialize the Pinecone client with API key from environment
 * @returns The initialized Pinecone client
 */
export async function initializePinecone() {
  // Skip if already initialized
  if (isInitialized && pineconeClient && pineconeIndex) {
    return { client: pineconeClient, index: pineconeIndex };
  }

  try {
    // Check if API key is available
    if (!PINECONE_API_KEY) {
      log('Pinecone API key not found in environment variables', 'pinecone');
      throw new Error('Pinecone API key not found');
    }

    // Create Pinecone client
    log('Initializing Pinecone client...', 'pinecone');
    pineconeClient = new Pinecone({
      apiKey: PINECONE_API_KEY,
      environment: PINECONE_ENVIRONMENT
    });

    // Get the index (create if it doesn't exist)
    const indexes = await pineconeClient.listIndexes();
    log(`Found ${indexes.length} Pinecone indexes`, 'pinecone');
    
    // Check if our index exists
    const indexExists = indexes.some((idx: any) => idx.name === PINECONE_INDEX_NAME);

    if (!indexExists) {
      log(`Creating new Pinecone index: ${PINECONE_INDEX_NAME}`, 'pinecone');
      await pineconeClient.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: VECTOR_DIMENSIONS,
        metric: PINECONE_METRIC,
        spec: { serverless: { cloud: 'aws', region: 'us-west-2' } }
      });

      // Wait for index to be created
      log('Waiting for index to be ready...', 'pinecone');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Get reference to the index
    pineconeIndex = pineconeClient.index(PINECONE_INDEX_NAME);
    isInitialized = true;
    
    log('Pinecone service initialized successfully', 'pinecone');
    return { client: pineconeClient, index: pineconeIndex };
  } catch (error) {
    log(`Error initializing Pinecone: ${error}`, 'pinecone');
    throw error;
  }
}

/**
 * Query Pinecone for campaigns similar to the query
 * @param {string} query - User's question
 * @param {string} userId - User ID for filtering
 * @param {Object} options - Additional query options
 * @returns {Array} - Matching campaign IDs and metadata
 */
export async function querySimilarCampaigns(query: string, userId: string, options: any = {}) {
  try {
    // Ensure Pinecone is initialized
    if (!isInitialized) {
      await initializePinecone();
    }
    
    // Generate embedding for the query
    log(`Generating embedding for query: "${query.substring(0, 50)}..."`, 'pinecone');
    const queryEmbedding = await generateEmbedding(query);
    
    // Build filter based on user ID and type
    const filter = {
      userId: userId,
      type: 'campaign',
      ...(options.filter || {})
    };
    
    // Query Pinecone
    log('Querying Pinecone for similar campaigns', 'pinecone');
    const results = await pineconeIndex.query({
      vector: queryEmbedding,
      topK: options.limit || DEFAULT_TOP_K,
      includeMetadata: true,
      filter: filter
    });
    
    // Extract and format results
    const matches = results.matches || [];
    log(`Found ${matches.length} similar campaigns`, 'pinecone');
    
    return matches.map((match: any) => ({
      campaignId: match.metadata.campaignId,
      score: match.score || 0,
      platformType: match.metadata.platformType,
      metadata: match.metadata
    }));
  } catch (error) {
    log(`Error querying similar campaigns: ${error}`, 'pinecone');
    return [];
  }
}

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
  try {
    // Ensure Pinecone is initialized
    if (!isInitialized) {
      await initializePinecone();
    }
    
    // Build metadata
    const metadata: CampaignMetadata = {
      userId,
      type: 'campaign',
      campaignId: campaign.id || campaign.campaignId || '',
      campaignName: campaign.name || campaign.campaignName || '',
      platformType: campaign.platformType || campaign.platform || 'amazon',
      text: campaign.description || `Campaign: ${campaign.name || campaign.campaignName}`,
      createdAt: new Date().toISOString()
    };
    
    // Generate ID
    const id = `camp_${nanoid()}`;
    
    // Create record
    log(`Storing campaign embedding for: ${metadata.campaignName}`, 'pinecone');
    await pineconeIndex.upsert([{
      id,
      values: vector,
      metadata
    }]);
    
    return id;
  } catch (error) {
    log(`Error storing campaign embedding: ${error}`, 'pinecone');
    throw error;
  }
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
  try {
    // Ensure Pinecone is initialized
    if (!isInitialized) {
      await initializePinecone();
    }
    
    // Build metadata
    const metadata: ChatMessageMetadata = {
      userId,
      type: 'chat_message',
      messageId: message.id || '',
      conversationId: message.conversationId || '',
      role: message.role as 'user' | 'assistant' | 'system',
      text: message.content || '',
      createdAt: new Date().toISOString()
    };
    
    // Generate ID
    const id = `msg_${nanoid()}`;
    
    // Create record
    log(`Storing chat message embedding, role: ${metadata.role}`, 'pinecone');
    await pineconeIndex.upsert([{
      id,
      values: vector,
      metadata
    }]);
    
    return id;
  } catch (error) {
    log(`Error storing chat message embedding: ${error}`, 'pinecone');
    throw error;
  }
}

/**
 * Delete vectors from Pinecone
 * @param {string[]} ids - The IDs of the vectors to delete
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function deleteVectors(ids: string[]): Promise<boolean> {
  try {
    // Ensure Pinecone is initialized
    if (!isInitialized) {
      await initializePinecone();
    }
    
    // Delete vectors
    log(`Deleting ${ids.length} vectors from Pinecone`, 'pinecone');
    await pineconeIndex.deleteMany(ids);
    return true;
  } catch (error) {
    log(`Error deleting vectors: ${error}`, 'pinecone');
    return false;
  }
}

/**
 * Get stats about the index
 * @returns {Promise<any>} Statistics about the index
 */
export async function getPineconeStats(): Promise<any> {
  try {
    // Ensure Pinecone is initialized
    if (!isInitialized) {
      await initializePinecone();
    }
    
    // Get stats
    log('Fetching Pinecone index stats', 'pinecone');
    const stats = await pineconeIndex.describeIndexStats();
    return stats;
  } catch (error) {
    log(`Error getting Pinecone stats: ${error}`, 'pinecone');
    throw error;
  }
}