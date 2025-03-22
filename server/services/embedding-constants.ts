/**
 * Shared constants for embedding services
 * Centralized configuration for embedding-related parameters used across services
 */

// Model configuration
export const EMBEDDING_MODEL = 'text-embedding-3-small'; // Using smaller, more efficient model

// Dimensions for OpenAI embeddings (text-embedding-3-small)
export const VECTOR_DIMENSIONS = 1536; 

// Batch processing settings
export const MAX_BATCH_SIZE = 20; // Maximum texts to embed in a single API call for efficiency

// Rate limiting
export const MIN_REQUEST_INTERVAL = 2000; // ms - minimum time between API calls

// Error handling
export const MAX_RETRY_ATTEMPTS = 2; // Number of retry attempts for failed API calls

// Optimization settings
export const MESSAGE_EMBEDDING_INTERVAL = 7; // Only create embeddings every N messages