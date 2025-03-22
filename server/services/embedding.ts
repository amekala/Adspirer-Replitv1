/**
 * OpenAI Embedding Service
 * 
 * This service provides functionality for generating and managing text embeddings
 * using OpenAI's embedding models. It handles authentication, batch processing,
 * and efficient generation of embeddings for various text inputs.
 */

import OpenAI from 'openai';
import { log } from '../vite';

// Configuration and constants
const EMBEDDING_MODEL = 'text-embedding-3-large';
const MAX_BATCH_SIZE = 10; // Maximum number of texts to embed in a single API call
const VECTOR_DIMENSIONS = 3072; // Dimension count for the text-embedding-3-large model

/**
 * Initialize the OpenAI client with the API key
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is required. Set the OPENAI_API_KEY environment variable.');
  }
  
  return new OpenAI({
    apiKey: apiKey,
  });
}

/**
 * Generate embeddings for a single text input
 * @param text - The text to generate an embedding for
 * @returns A numerical vector representing the text embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const openai = getOpenAIClient();
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: 'float',
    });
    
    return response.data[0].embedding;
  } catch (error) {
    log(`Error generating embedding: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Generate embeddings for multiple text inputs efficiently
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors corresponding to the input texts
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }
  
  try {
    const openai = getOpenAIClient();
    const batches: string[][] = [];
    
    // Split texts into batches of MAX_BATCH_SIZE
    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      batches.push(texts.slice(i, i + MAX_BATCH_SIZE));
    }
    
    // Process each batch
    const results: number[][] = [];
    
    for (const batch of batches) {
      log(`Processing batch of ${batch.length} texts`, 'embedding-service');
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
        encoding_format: 'float',
      });
      
      // Sort the embeddings by index to maintain the original order
      const sortedEmbeddings = response.data
        .sort((a, b) => a.index - b.index)
        .map(item => item.embedding);
      
      results.push(...sortedEmbeddings);
    }
    
    return results;
  } catch (error) {
    log(`Error generating embeddings batch: ${error instanceof Error ? error.message : String(error)}`, 'embedding-service');
    throw error;
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 * @param embeddingA - First embedding vector
 * @param embeddingB - Second embedding vector
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
 * Search for the most similar texts given a query embedding and a collection of embeddings
 * @param queryEmbedding - The embedding of the query text
 * @param embeddingsWithIds - Array of objects containing embeddings and their associated IDs
 * @param topK - Number of top results to return
 * @returns The topK most similar embeddings with their similarity scores
 */
export function findSimilarEmbeddings(
  queryEmbedding: number[],
  embeddingsWithIds: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; similarity: number }> {
  // Calculate similarity for each embedding
  const similarities = embeddingsWithIds.map(item => ({
    id: item.id,
    similarity: calculateSimilarity(queryEmbedding, item.embedding)
  }));
  
  // Sort by similarity (highest first) and take top K
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Get the dimensionality of the embedding model being used
 * @returns The number of dimensions in the embedding vectors
 */
export function getEmbeddingDimensions(): number {
  return VECTOR_DIMENSIONS;
}