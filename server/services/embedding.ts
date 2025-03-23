/**
 * OpenAI Embedding Service for AI Ad Analysis
 * 
 * This service provides functionality for generating and managing vector embeddings
 * using OpenAI's embedding models. It handles:
 * - Authentication with OpenAI API
 * - Batch processing for efficient API usage
 * - Generation of embeddings for campaign data, ad groups, and chat messages
 * - Embedding format standardization for database storage
 * - Error handling and logging
 * - Semantic search across embedded content
 * - Context retrieval for AI-powered analysis
 */

import OpenAI from 'openai';
import { log } from '../vite';
import { storage } from '../storage';
import { EmbeddingStore, InsertEmbeddingStore, ChatMessage, ChatConversation } from '@shared/schema';

// Import shared configuration constants
import { 
  EMBEDDING_MODEL,
  MAX_BATCH_SIZE,
  VECTOR_DIMENSIONS,
  MAX_RETRY_ATTEMPTS,
  MESSAGE_EMBEDDING_INTERVAL,
  MIN_REQUEST_INTERVAL
} from './embedding-constants';

/**
 * OpenAI client with error handling, automatic retries, and rate limiting
 */
class EmbeddingClient {
  private client: OpenAI;
  private retryDelayMs = 1000;
  private lastRequestTime = 0;
  private minRequestInterval = MIN_REQUEST_INTERVAL; // From shared constants

  constructor() {
    this.validateApiKey();
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Validate API key existence
   */
  private validateApiKey(): void {
    if (!process.env.OPENAI_API_KEY) {
      log('OpenAI API key is required. Set the OPENAI_API_KEY environment variable.', 'embedding-service');
      throw new Error('Missing OpenAI API key');
    }
  }

  /**
   * Generate embeddings with retry logic and rate limiting
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    let attempts = 0;
    
    // Apply rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      log(`Rate limiting applied. Waiting ${waitTime}ms before next embedding request.`, 'embedding-service');
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Set last request time
    this.lastRequestTime = Date.now();
    
    while (attempts <= MAX_RETRY_ATTEMPTS) {
      try {
        // Reduce verbosity in logs
        if (attempts === 0) {
          log(`Generating embeddings for ${texts.length} text items`, 'embedding-service');
        }
        
        const response = await this.client.embeddings.create({
          model: EMBEDDING_MODEL,
          input: texts,
          encoding_format: 'float',
        });
        
        // Sort embeddings by index to maintain original order
        return response.data
          .sort((a, b) => a.index - b.index)
          .map(item => item.embedding);
      } catch (error) {
        attempts++;
        
        if (attempts > MAX_RETRY_ATTEMPTS) {
          log(`Failed to generate embeddings after ${MAX_RETRY_ATTEMPTS} attempts: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
          throw error;
        }
        
        const delay = this.retryDelayMs * attempts;
        log(`Embedding generation attempt ${attempts} failed, retrying in ${delay}ms...`, 'embedding-service');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Failed to generate embeddings after maximum retry attempts');
  }
}

// Create a singleton instance of the embedding client
const embeddingClient = new EmbeddingClient();

/**
 * Generates embeddings for a single text input
 * @param text - The text to generate an embedding for
 * @returns A numerical vector representing the text embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const embeddings = await embeddingClient.generateEmbeddings([text]);
    return embeddings[0];
  } catch (error) {
    log(`Error generating single embedding: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Processes and generates embeddings for multiple text inputs in efficient batches
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors corresponding to the input texts
 */
export async function generateEmbeddingsInBatches(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  try {
    const batches: string[][] = [];
    
    // Split texts into batches of MAX_BATCH_SIZE
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
    }
    
    // Process each batch
    const results: number[][] = [];
    
    for (const batch of batches) {
      log(`Processing embedding batch of ${batch.length} texts`, 'embedding-service');
      const batchResults = await embeddingClient.generateEmbeddings(batch);
      results.push(...batchResults);
    }
    
    return results;
  } catch (error) {
    log(`Error generating embeddings batch: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Creates embedding for chat message and stores in database
 * @param message - Chat message to embed
 * @param conversationId - ID of the conversation
 * @returns The created embedding
 */
export async function createChatMessageEmbedding(
  message: ChatMessage, 
  conversationId: string
): Promise<EmbeddingStore> {
  try {
    // Generate text for embedding (preserve role context)
    const embeddingText = `${message.role}: ${message.content}`;
    
    // Generate embedding vector
    const vector = await generateEmbedding(embeddingText);
    
    // Store embedding in database
    const embedding = await storage.createEmbedding({
      textContent: embeddingText,
      embeddingVector: vector,
      type: 'chat_message',
      sourceId: message.id,
      metadata: {
        role: message.role,
        conversationId: conversationId,
        timestamp: message.createdAt
      }
    });
    
    // Create relationship in chat_embeddings table
    await storage.createChatEmbedding({
      chatConversationId: conversationId,
      embeddingId: embedding.id,
    });
    
    return embedding;
  } catch (error) {
    log(`Error creating chat message embedding: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Creates embedding for campaign data and stores in database
 * @param campaignData - Campaign data to embed
 * @param campaignId - ID of the campaign
 * @param userId - ID of the user who owns the campaign
 * @returns The created embedding
 */
export async function createCampaignEmbedding(
  campaignData: {
    name: string;
    platform: string;
    description?: string;
    budget?: number;
    metrics?: Record<string, any>;
  },
  campaignId: string,
  userId: string
): Promise<EmbeddingStore> {
  try {
    // Format campaign data for embedding
    const embeddingText = formatCampaignForEmbedding(campaignData);
    
    // Generate embedding vector
    const vector = await generateEmbedding(embeddingText);
    
    // Store embedding in database
    return await storage.createEmbedding({
      textContent: embeddingText,
      embeddingVector: vector,
      type: 'campaign',
      sourceId: campaignId,
      userId: userId,
      metadata: {
        platform: campaignData.platform,
        metrics: campaignData.metrics || {}
      }
    });
  } catch (error) {
    log(`Error creating campaign embedding: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Format campaign data into a standardized text format for embedding
 */
function formatCampaignForEmbedding(campaignData: any): string {
  const parts = [
    `Campaign: ${campaignData.name || 'Unnamed Campaign'}`,
    `Platform: ${campaignData.platform || 'Unknown'}`
  ];
  
  if (campaignData.description) {
    parts.push(`Description: ${campaignData.description}`);
  }
  
  if (campaignData.budget) {
    parts.push(`Budget: ${campaignData.budget}`);
  }
  
  // Add metrics if available
  if (campaignData.metrics) {
    const metrics = [];
    if (campaignData.metrics.roas) metrics.push(`RoAS ${campaignData.metrics.roas}`);
    if (campaignData.metrics.cpa) metrics.push(`CPA ${campaignData.metrics.cpa}`);
    if (campaignData.metrics.ctr) metrics.push(`CTR ${campaignData.metrics.ctr}`);
    if (campaignData.metrics.impressions) metrics.push(`Impressions ${campaignData.metrics.impressions}`);
    if (campaignData.metrics.clicks) metrics.push(`Clicks ${campaignData.metrics.clicks}`);
    if (campaignData.metrics.conversions) metrics.push(`Conversions ${campaignData.metrics.conversions}`);
    
    if (metrics.length > 0) {
      parts.push(`Key Metrics: ${metrics.join(', ')}`);
    }
  }
  
  return parts.join('\n');
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @returns Similarity score between 0 and 1, where 1 is most similar
 */
export function calculateSimilarity(embeddingA: number[], embeddingB: number[]): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error('Embeddings must have the same dimensions to calculate similarity');
  }
  
  // Calculate dot product
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
    normA += embeddingA[i] * embeddingA[i];
    normB += embeddingB[i] * embeddingB[i];
  }
  
  // Safeguard against division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  // Calculate cosine similarity
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get the dimensionality of the embedding model being used
 * @returns The number of dimensions in the embedding vectors
 */
export function getEmbeddingDimensions(): number {
  return VECTOR_DIMENSIONS;
}

/**
 * Find relevant context from embeddings store for a given query
 * This function enables semantic search across different content types
 * 
 * @param query - The query text to find relevant context for
 * @param options - Search options including type filter and limit
 * @returns Array of relevant context items with their similarity scores
 */
export async function findRelevantContext(
  query: string,
  options: {
    type?: 'campaign' | 'ad_group' | 'keyword' | 'chat_message';
    limit?: number;
    minSimilarity?: number;
    userId?: string;
  } = {}
): Promise<Array<{text: string; metadata: any; similarity: number}>> {
  try {
    const { type, limit = 5, minSimilarity = 0.7 } = options;
    
    // Generate embedding for query
    const queryVector = await generateEmbedding(query);
    
    // Search for similar embeddings
    const similarEmbeddings = await storage.searchSimilarEmbeddings(
      queryVector,
      type,
      limit * 2 // Fetch more than needed to filter by similarity threshold
    );
    
    // Filter by minimum similarity threshold and format results
    return similarEmbeddings
      .filter(item => item.similarity >= minSimilarity)
      .slice(0, limit)
      .map(item => ({
        text: item.embedding.text,
        metadata: item.embedding.metadata,
        similarity: item.similarity
      }));
  } catch (error) {
    log(`Error finding relevant context: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    return [];
  }
}

/**
 * Retrieve relevant campaign context for analysis
 * Specialized search that focuses on campaign data
 * 
 * @param query - The query text to match against campaign data
 * @param userId - Optional user ID to filter results by
 * @returns Array of campaign contexts with similarity scores
 */
export async function findRelevantCampaignContext(
  query: string,
  userId?: string
): Promise<Array<{campaign: any; similarity: number}>> {
  try {
    const context = await findRelevantContext(query, {
      type: 'campaign',
      limit: 3,
      minSimilarity: 0.65,
      userId
    });
    
    // Transform to campaign-specific format
    return context.map(item => ({
      campaign: {
        id: item.metadata.sourceId,
        name: item.text.split('\n')[0].replace('Campaign: ', ''),
        platform: item.metadata.platform || 'Unknown',
        metrics: item.metadata.metrics || {},
      },
      similarity: item.similarity
    }));
  } catch (error) {
    log(`Error finding relevant campaign context: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    return [];
  }
}

/**
 * Generate context-aware system prompts for AI assistant
 * Uses vector search to find relevant marketing context
 * 
 * @param conversation - The chat conversation
 * @param userId - User ID for context filtering
 * @returns Enhanced system prompt with relevant context
 */
export async function generateContextAwarePrompt(
  conversation: ChatConversation,
  userId: string
): Promise<string> {
  try {
    // Get recent messages to understand conversation context
    const messages = await storage.getChatMessages(conversation.id);
    if (messages.length === 0) {
      return getDefaultSystemPrompt();
    }
    
    // Combine recent messages into a single context query
    const recentMessages = messages.slice(-3).map(msg => msg.content).join(' ');
    
    // Find relevant campaign insights
    const campaignContext = await findRelevantCampaignContext(recentMessages, userId);
    
    // Build enhanced prompt with context
    let prompt = getDefaultSystemPrompt();
    
    if (campaignContext.length > 0) {
      prompt += '\n\nRelevant campaign context:';
      
      campaignContext.forEach(ctx => {
        prompt += `\n- ${ctx.campaign.name} (${ctx.campaign.platform}): `;
        
        if (ctx.campaign.metrics) {
          const metrics = Object.entries(ctx.campaign.metrics)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
          
          if (metrics) {
            prompt += `Key metrics: ${metrics}`;
          }
        }
      });
    }
    
    return prompt;
  } catch (error) {
    log(`Error generating context-aware prompt: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    return getDefaultSystemPrompt();
  }
}

/**
 * Get the default system prompt for AI assistant
 * @returns Standard system prompt
 */
function getDefaultSystemPrompt(): string {
  return 'You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies. Provide helpful, concise responses about advertising, analytics, and campaign management.';
}