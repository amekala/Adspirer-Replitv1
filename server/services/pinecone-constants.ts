/**
 * Pinecone Vector Database Integration Constants
 * 
 * This file contains constants related to Pinecone integration for vector similarity search.
 * Pinecone is used to store and query large numbers of high-dimensional vectors efficiently,
 * enabling semantic search across campaign data, ad groups, and keywords.
 */

// Environment variables will be used in production
export const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
// Using gcp-starter which is supported in free plan
export const PINECONE_ENVIRONMENT = process.env.PINECONE_ENVIRONMENT || 'gcp-starter';
// Store index region info separately to ensure proper initialization
// Use us-west1-gcp-free for the free tier
export const PINECONE_REGION = process.env.PINECONE_REGION || 'us-west1-gcp-free';
export const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'adspirer-embeddings';

// Pinecone index configuration
export const VECTOR_DIMENSIONS = 1536; // Must match OpenAI embedding dimensions
export const PINECONE_METRIC = 'cosine'; // Distance metric for similarity search
export const PINECONE_NAMESPACE = {
  CAMPAIGNS: 'campaigns',
  AD_GROUPS: 'ad_groups',
  KEYWORDS: 'keywords',
  CHAT_MESSAGES: 'chat_messages'
};

// Search parameters
export const DEFAULT_TOP_K = 5; // Default number of results to return in similarity search
export const SIMILARITY_THRESHOLD = 0.75; // Minimum similarity score (0-1) to consider relevant