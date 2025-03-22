/**
 * RAG (Retrieval-Augmented Generation) Service
 * 
 * This service orchestrates the RAG process flow:
 * 1. Take a user query
 * 2. Find relevant embeddings in Pinecone
 * 3. Retrieve detailed data from SQL database
 * 4. Assemble context from both sources
 * 5. Send to LLM for answering
 * 
 * The service is intentionally designed as the coordinator between
 * multiple specialized services, each focused on a specific aspect
 * of the RAG pipeline. This makes debugging and maintenance easier.
 */

import { log } from '../vite';
import { querySimilarCampaigns } from './pinecone';
import { fetchCampaignData, extractCampaignInsights } from './sql-data';
import { extractQueryParameters, assembleContext, generateSystemPrompt } from './context-assembly';
import { streamChatCompletion } from './openai';
import type { Response } from 'express';

// Define types for the API response
export interface RAGResponse {
  answer?: string;
  campaigns: any[];
  insights: Record<string, any>;
  retrievalSuccess: boolean;
  error?: string;
}

/**
 * Process a user query using the RAG approach
 * @param {string} query - User's question
 * @param {string} userId - User ID for data access
 * @param {string} conversationId - Current conversation ID
 * @param {Response} res - Express response object for streaming
 * @returns {Promise<void>} Streams the response
 */
export async function processRagQuery(
  query: string, 
  userId: string,
  conversationId: string,
  res: Response
): Promise<void> {
  log(`Processing RAG query: "${query.substring(0, 50)}..."`, 'rag-service');

  try {
    // Step 1: Extract parameters from the query
    const queryParams = extractQueryParameters(query);
    log(`Extracted parameters: ${JSON.stringify(queryParams)}`, 'rag-service');
    
    // Step 2: Find relevant campaigns via vector search
    const start = Date.now();
    const similarCampaigns = await querySimilarCampaigns(query, userId);
    log(`Vector search took ${Date.now() - start}ms, found ${similarCampaigns.length} results`, 'rag-service');
    
    if (similarCampaigns.length === 0) {
      // If no similar campaigns found, we can still try to answer general questions
      const systemPrompt = generateSystemPrompt();
      const context = `The user asked: "${query}"\n\nNo relevant campaign data was found in your database. Answer based on your general knowledge but make it clear that you're not using specific campaign data.`;
      
      await streamChatCompletion({
        conversationId, 
        userId, 
        res,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: context }
        ]
      });
      
      return;
    }
    
    // Step 3: Extract campaign IDs for SQL query
    const campaignIds = similarCampaigns.map((camp: { campaignId: string }) => camp.campaignId);
    log(`Extracted ${campaignIds.length} campaign IDs for SQL query`, 'rag-service');
    
    // Step 4: Fetch detailed campaign data from SQL
    const sqlStart = Date.now();
    const campaignData = await fetchCampaignData(campaignIds, userId);
    log(`SQL query took ${Date.now() - sqlStart}ms, retrieved ${campaignData.length} campaigns`, 'rag-service');
    
    // Step 5: Extract insights from campaign data
    const insights = extractCampaignInsights(campaignData);
    
    // Step 6: Assemble context for LLM
    const context = assembleContext(query, campaignData, queryParams, insights, userId);
    
    // Step 7: Generate system prompt
    const systemPrompt = generateSystemPrompt();
    
    // Step 8: Send to OpenAI and stream the response
    log(`Sending to OpenAI with ${context.length} chars of context`, 'rag-service');
    await streamChatCompletion({
      conversationId,
      userId,
      res,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: context }
      ]
    });
    
  } catch (error) {
    // Handle errors gracefully
    log(`Error in RAG process: ${error}`, 'rag-service');
    
    // Send error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.write(`data: {"id":"error","role":"assistant","content":"I encountered an error while retrieving campaign data: ${errorMessage}. Please try again or rephrase your question."}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

/**
 * Process a non-streaming RAG query (for API usage)
 * @param {string} query - User's question
 * @param {string} userId - User ID for data access
 * @returns {Promise<RAGResponse>} The response data
 */
export async function processRagQueryNonStreaming(
  query: string,
  userId: string
): Promise<RAGResponse> {
  try {
    // Step 1: Extract parameters from the query
    const queryParams = extractQueryParameters(query);
    
    // Step 2: Find relevant campaigns via vector search
    const similarCampaigns = await querySimilarCampaigns(query, userId);
    
    if (similarCampaigns.length === 0) {
      return {
        answer: "I couldn't find campaign data relevant to your question. Could you provide more details about which campaigns you're interested in?",
        campaigns: [],
        insights: {},
        retrievalSuccess: false
      };
    }
    
    // Step 3: Extract campaign IDs for SQL query
    const campaignIds = similarCampaigns.map((camp: { campaignId: string }) => camp.campaignId);
    
    // Step 4: Fetch detailed campaign data from SQL
    const campaignData = await fetchCampaignData(campaignIds, userId);
    
    // Step 5: Extract insights from campaign data
    const insights = extractCampaignInsights(campaignData);
    
    // Step 6: Assemble context for LLM
    const context = assembleContext(query, campaignData, queryParams, insights, userId);
    
    // Step 7: Generate system prompt
    const systemPrompt = generateSystemPrompt();
    
    // Step 8: Get completion (non-streaming)
    // Note: In a real implementation, you would call a non-streaming version
    // of the OpenAI service here. For now, we'll return a placeholder.
    
    return {
      answer: "This is a placeholder response for non-streaming RAG queries. In a real implementation, this would be an answer from the OpenAI API.",
      campaigns: campaignData,
      insights: insights,
      retrievalSuccess: true
    };
    
  } catch (error) {
    // Handle errors
    log(`Error in non-streaming RAG process: ${error}`, 'rag-service');
    
    return {
      answer: "I encountered an error while retrieving campaign data. Please try again or rephrase your question.",
      campaigns: [],
      insights: {},
      retrievalSuccess: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}