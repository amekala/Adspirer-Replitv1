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
      apiKey: PINECONE_API_KEY
    });

    // Get the index (create if it doesn't exist)
    const indexes = await pineconeClient.listIndexes();
    log(`Found ${Object.keys(indexes).length} Pinecone indexes`, 'pinecone');
    
    // Check if our index exists
    const indexNames = Object.keys(indexes);
    const indexExists = indexNames.includes(PINECONE_INDEX_NAME);

    if (!indexExists) {
      log(`Creating new Pinecone index: ${PINECONE_INDEX_NAME}`, 'pinecone');
      // Import region from constants
      const { PINECONE_REGION } = await import('./pinecone-constants');
      
      // Use GCP instead of AWS for free plan compatibility
      await pineconeClient.createIndex({
        name: PINECONE_INDEX_NAME,
        dimension: VECTOR_DIMENSIONS,
        metric: PINECONE_METRIC,
        spec: { serverless: { cloud: 'gcp', region: PINECONE_REGION } }
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
    // Generate embedding for the query
    log(`Generating embedding for query: "${query.substring(0, 50)}..."`, 'pinecone');
    const queryEmbedding = await generateEmbedding(query);
    
    try {
      // Try to use Pinecone first
      if (!isInitialized) {
        await initializePinecone();
      }
      
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
      log(`Found ${matches.length} similar campaigns in Pinecone`, 'pinecone');
      
      return matches.map((match: any) => ({
        campaignId: match.metadata.campaignId,
        score: match.score || 0,
        platformType: match.metadata.platformType,
        metadata: match.metadata
      }));
    } catch (pineconeError) {
      // If Pinecone fails, use PostgreSQL as fallback
      log(`Pinecone query failed: ${pineconeError}. Using PostgreSQL fallback`, 'pinecone');
      
      // Import storage dynamically to avoid circular dependencies
      const { storage } = await import('../storage');
      
      // Search similar embeddings in PostgreSQL
      const similarEmbeddings = await storage.searchSimilarEmbeddings(
        queryEmbedding,
        'campaign',
        options.limit || DEFAULT_TOP_K
      );
      
      log(`Found ${similarEmbeddings.length} similar campaigns in PostgreSQL`, 'pinecone');
      
      // Convert PostgreSQL results to the expected format
      return similarEmbeddings
        .filter(item => item.similarity >= SIMILARITY_THRESHOLD)
        .map(item => {
          const metadata = item.embedding.metadata || {};
          return {
            campaignId: item.embedding.sourceId || '',
            score: item.similarity,
            platformType: (metadata as any).platformType || 'unknown',
            metadata: metadata
          };
        });
    }
  } catch (error) {
    log(`Error in querySimilarCampaigns: ${error}`, 'pinecone');
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
  // Generate ID
  const id = `camp_${nanoid()}`;
  
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
  
  // Create the text representation
  const text = metadata.text;
  
  try {
    // Try to store in Pinecone
    try {
      // Ensure Pinecone is initialized
      if (!isInitialized) {
        await initializePinecone();
      }
      
      // Create record in Pinecone
      log(`Storing campaign embedding in Pinecone: ${metadata.campaignName}`, 'pinecone');
      await pineconeIndex.upsert([{
        id,
        values: vector,
        metadata
      }]);
    } catch (pineconeError) {
      log(`Pinecone storage failed: ${pineconeError}. Will use PostgreSQL only.`, 'pinecone');
    }
    
    // Also store in PostgreSQL for redundancy
    try {
      const { storage } = await import('../storage');
      log(`Storing campaign embedding in PostgreSQL: ${metadata.campaignName}`, 'pinecone');
      await storage.createEmbedding({
        type: 'campaign',
        sourceId: metadata.campaignId,
        metadata,
        vector,
        text
      });
    } catch (postgresError) {
      log(`PostgreSQL storage failed: ${postgresError}`, 'pinecone');
      // If both storages fail, we should throw an error
      if (!isInitialized) {
        throw postgresError;
      }
    }
    
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
  // Generate ID
  const id = `msg_${nanoid()}`;
  
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
  
  // Create the text representation
  const text = metadata.text;
  
  try {
    // Try to store in Pinecone
    try {
      // Ensure Pinecone is initialized
      if (!isInitialized) {
        await initializePinecone();
      }
      
      // Create record in Pinecone
      log(`Storing chat message embedding in Pinecone, role: ${metadata.role}`, 'pinecone');
      await pineconeIndex.upsert([{
        id,
        values: vector,
        metadata
      }]);
    } catch (pineconeError) {
      log(`Pinecone storage failed: ${pineconeError}. Will use PostgreSQL only.`, 'pinecone');
    }
    
    // Also store in PostgreSQL for redundancy
    try {
      const { storage } = await import('../storage');
      log(`Storing chat message embedding in PostgreSQL, role: ${metadata.role}`, 'pinecone');
      await storage.createEmbedding({
        type: 'chat_message',
        sourceId: metadata.messageId,
        metadata,
        vector,
        text
      });
      
      // Also create the chat-embedding relationship
      await storage.createChatEmbedding({
        embeddingId: id,
        chatConversationId: metadata.conversationId
      });
    } catch (postgresError) {
      log(`PostgreSQL storage failed: ${postgresError}`, 'pinecone');
      // If both storages fail, we should throw an error
      if (!isInitialized) {
        throw postgresError;
      }
    }
    
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