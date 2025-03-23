/**
 * Two-LLM RAG Service
 * 
 * This service implements a two-LLM architecture for Retrieval-Augmented Generation:
 * 1. First LLM: Query Understanding & SQL Generation - Interprets the user query and generates SQL
 * 2. Second LLM: Response Generation - Takes the retrieved data and creates a natural language response
 * 
 * The architecture uses embeddings to find relevant campaign data before SQL generation,
 * providing better context for both LLMs.
 */

import { log } from '../vite';
import { storage } from '../storage';
import { pool } from '../db';
import { getOpenAIClient } from './openai';
import { generateEmbedding } from './embedding';
import { assembleContext, generateSystemPrompt } from './context-assembly';
import { RAGResponse } from './rag';
import type { Response } from 'express';

/**
 * Process a RAG query using the two-LLM architecture
 * @param {string} query - The user query text
 * @param {string} userId - The user ID for context and access control
 * @param {string} conversationId - The conversation ID for context
 * @param {Response} res - Express response object for streaming
 */
export async function processTwoLlmRagQuery(
  query: string,
  userId: string,
  conversationId: string,
  res: Response
): Promise<void> {
  const processingStart = Date.now();
  log(`Processing Two-LLM RAG query: "${query.substring(0, 50)}..."`, 'two-llm-rag');

  try {
    // Step 1: Generate embedding for the query
    log(`Generating embedding for query...`, 'two-llm-rag');
    const queryVector = await generateEmbedding(query);
    log(`Generated embedding with ${queryVector.length} dimensions`, 'two-llm-rag');

    // Step 2: Search for similar campaign embeddings
    log(`Searching for similar campaign embeddings...`, 'two-llm-rag');
    const similarCampaigns = await storage.searchSimilarEmbeddings(
      queryVector,
      'campaign',
      10 // Get top 10 results
    );

    // Filter by similarity threshold
    const relevantCampaigns = similarCampaigns
      .filter(result => result.similarity > 0.65) // Only use reasonably similar campaigns
      .slice(0, 5); // Limit to top 5 most similar

    // Extract campaign IDs from results
    const campaignIds = relevantCampaigns.map(result => result.embedding.sourceId);
    log(`Found ${campaignIds.length} relevant campaign IDs: ${campaignIds.join(', ')}`, 'two-llm-rag');

    if (campaignIds.length === 0) {
      // If no relevant campaigns found, send a fallback response
      const systemPrompt = generateSystemPrompt();
      const fallbackContext = `The user asked: "${query}"\n\nNo relevant campaign data was found in your database. Answer based on your general knowledge but make it clear that you're not using specific campaign data.`;
      
      // Stream the fallback response
      const openaiClient = getOpenAIClient();
      const stream = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: fallbackContext }
        ],
        stream: true
      });

      // Send SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Create a consistent streaming ID that will be used by both frontend and database
      const streamingId = `streaming-${Date.now()}`;
      // Send the streamingId to the frontend so it knows what to look for
      res.write(`data: {"streamingId":"${streamingId}"}\n\n`);
      
      // Collect the full response while streaming
      let fullResponse = '';
      
      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content; // Collect the response
          res.write(`data: {"content":"${content.replace(/\n/g, '\\n')}"}\n\n`);
        }
      }
      
      // Save the assistant's response to the database WITH THE SAME ID
      try {
        await storage.createChatMessage({
          id: streamingId, // Use the same ID as the frontend is using
          conversationId: conversationId,
          role: 'assistant',
          content: fullResponse,
          metadata: {
            model: 'gpt-4o',
            processed: true,
            timestamp: new Date().toISOString(),
            fallback: true
          }
        });
        log(`Saved fallback assistant message with ID ${streamingId} to database for conversation ${conversationId}`, 'two-llm-rag');
        
        // Confirm to the frontend that message was saved with this ID
        res.write(`data: {"savedMessageId":"${streamingId}"}\n\n`);
      } catch (saveError) {
        log(`Error saving fallback assistant message: ${saveError}`, 'two-llm-rag');
      }

      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Step 3: Generate SQL query with first LLM
    log(`Generating SQL query with first LLM...`, 'two-llm-rag');
    const sqlGenerationPrompt = `
You are a specialized SQL generation assistant for an advertising analytics platform.

The user asked: "${query}"

Based on this query, generate a PostgreSQL query that retrieves campaign data for the following campaign IDs:
${campaignIds.join(', ')}

Requirements:
1. Your task is ONLY to write valid SQL for PostgreSQL, not to execute it or explain it.
2. Only include data for user ID: ${userId}
3. For Amazon campaigns, use tables: campaign_metrics (cm) and advertiser_accounts (aa)
4. For Google campaigns, use tables: google_campaign_metrics (gcm) and google_advertiser_accounts (gaa)
5. Calculate metrics like CTR (clicks/impressions) or conversion rate where appropriate
6. Consider time ranges mentioned in the query if any
7. Do not make up column names - use only these columns that exist:
   - campaign_metrics: id, user_id, campaign_id, profile_id, date, impressions, clicks, cost, ad_group_id
   - google_campaign_metrics: id, user_id, campaign_id, customer_id, date, impressions, clicks, cost, conversions, ad_group_id
   - advertiser_accounts: id, user_id, profile_id, account_name, marketplace, account_type, status
   - google_advertiser_accounts: id, user_id, customer_id, account_name, status

Your query must have proper JOINs, WHERE clauses, and should include relevant columns for analysis.
ONLY provide the SQL query, nothing else. No explanation, no preamble, just the SQL in complete, executable form.
`;

    const openaiClient = getOpenAIClient();
    const sqlCompletion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a specialized SQL query generator.' },
        { role: 'user', content: sqlGenerationPrompt }
      ],
      temperature: 0.3 // Lower temperature for more precise SQL generation
    });

    const sqlQuery = sqlCompletion.choices[0].message.content || '';
    log(`Generated SQL query: ${sqlQuery}`, 'two-llm-rag');

    // Step 4: Execute the generated SQL query
    log(`Executing generated SQL query...`, 'two-llm-rag');
    let campaignData = [];
    try {
      const queryResult = await pool.query(sqlQuery);
      campaignData = queryResult.rows;
      log(`SQL query returned ${campaignData.length} rows`, 'two-llm-rag');
    } catch (error) {
      log(`Error executing SQL query: ${error}. Falling back to direct campaign lookup.`, 'two-llm-rag');
      
      // Fallback to direct campaign lookup
      const amazonQuery = `
        SELECT aa.*, 'amazon' as platform 
        FROM advertiser_accounts aa
        WHERE aa.user_id = $1 AND aa.profile_id IN (${campaignIds.map((_, i) => `$${i + 2}`).join(',')})
      `;
      
      const googleQuery = `
        SELECT gaa.*, 'google' as platform 
        FROM google_advertiser_accounts gaa
        WHERE gaa.user_id = $1 AND gaa.customer_id IN (${campaignIds.map((_, i) => `$${i + 2}`).join(',')})
      `;
      
      const amazonParams = [userId, ...campaignIds];
      const googleParams = [userId, ...campaignIds];
      
      try {
        const amazonResult = await pool.query(amazonQuery, amazonParams);
        const googleResult = await pool.query(googleQuery, googleParams);
        
        campaignData = [...amazonResult.rows, ...googleResult.rows];
        log(`Fallback lookup returned ${campaignData.length} campaigns`, 'two-llm-rag');
      } catch (fallbackError) {
        log(`Error in fallback campaign lookup: ${fallbackError}`, 'two-llm-rag');
      }
    }

    // Step 5: Use second LLM to generate response
    log(`Generating response with second LLM...`, 'two-llm-rag');
    const responsePrompt = `
The user asked: "${query}"

Here is the campaign data retrieved:
${JSON.stringify(campaignData, null, 2)}

Provide a helpful, conversational response that answers the user's question based on this campaign data.
Focus on metrics like impressions, clicks, cost, CTR, and conversions where available.
If the data is incomplete, acknowledge this and explain what data would be needed for a more complete answer.
Use a friendly, helpful tone appropriate for a chat interface.
`;

    // Stream the response from the second LLM
    const stream = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: generateSystemPrompt() },
        { role: 'user', content: responsePrompt }
      ],
      stream: true
    });

    // Send SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Create a consistent streaming ID that will be used by both frontend and database
    const streamingId = `streaming-${Date.now()}`;
    // Send the streamingId to the frontend so it knows what to look for
    res.write(`data: {"streamingId":"${streamingId}"}\n\n`);
    
    // Collect the full response while streaming
    let fullResponse = '';
    
    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content; // Collect the response
        res.write(`data: {"content":"${content.replace(/\n/g, '\\n')}"}\n\n`);
      }
    }

    // Save the assistant's response to the database WITH THE SAME ID
    try {
      await storage.createChatMessage({
        id: streamingId, // Use the same ID as the frontend is using
        conversationId: conversationId,
        role: 'assistant',
        content: fullResponse,
        metadata: {
          model: 'gpt-4o',
          processed: true,
          timestamp: new Date().toISOString(),
          campaignIds: campaignIds.length > 0 ? campaignIds : undefined
        }
      });
      log(`Saved assistant message with ID ${streamingId} to database for conversation ${conversationId}`, 'two-llm-rag');
      
      // Confirm to the frontend that message was saved with this ID
      res.write(`data: {"savedMessageId":"${streamingId}"}\n\n`);
    } catch (saveError) {
      log(`Error saving assistant message: ${saveError}`, 'two-llm-rag');
      // We don't want to fail the response if saving fails
    }

    res.write('data: [DONE]\n\n');
    res.end();

    log(`Two-LLM RAG process completed in ${Date.now() - processingStart}ms`, 'two-llm-rag');
  } catch (error) {
    log(`Error in Two-LLM RAG process: ${error}`, 'two-llm-rag');
    
    // Handle errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    const formattedErrorMessage = `I encountered an error while retrieving campaign data: ${errorMessage}. Please try again or rephrase your question.`;
    
    res.write(`data: {"error":"${formattedErrorMessage}"}\n\n`);
    
    // Still save the error response to the database
    try {
      await storage.createChatMessage({
        conversationId: conversationId,
        role: 'assistant',
        content: formattedErrorMessage,
        metadata: {
          model: 'gpt-4o',
          processed: true,
          timestamp: new Date().toISOString(),
          error: true
        }
      });
      log(`Saved error message to database for conversation ${conversationId}`, 'two-llm-rag');
    } catch (saveError) {
      log(`Error saving error message: ${saveError}`, 'two-llm-rag');
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

/**
 * Process a non-streaming RAG query using the two-LLM architecture
 * This version is for API usage and testing, returning a complete response
 * @param {string} query - The user query text
 * @param {string} userId - The user ID for context and access control
 * @param {Object} options - Additional options
 * @returns {Promise<RAGResponse>} Complete response with answer and campaign data
 */
export async function processTwoLlmRagQueryNonStreaming(
  query: string,
  userId: string,
  options: { 
    includeDebugInfo?: boolean;
    conversationId?: string;
  } = {}
): Promise<RAGResponse> {
  const processingStart = Date.now();
  log(`Processing non-streaming Two-LLM RAG query: "${query}"`, 'two-llm-rag');

  try {
    // Step 1: Generate embedding for the query
    log(`Generating embedding for query...`, 'two-llm-rag');
    const queryVector = await generateEmbedding(query);
    log(`Generated embedding with ${queryVector.length} dimensions`, 'two-llm-rag');

    // Step 2: Search for similar campaign embeddings
    log(`Searching for similar campaign embeddings...`, 'two-llm-rag');
    const similarCampaigns = await storage.searchSimilarEmbeddings(
      queryVector,
      'campaign',
      10 // Get top 10 results
    );

    // Filter by similarity threshold
    const relevantCampaigns = similarCampaigns
      .filter(result => result.similarity > 0.65) // Only use reasonably similar campaigns
      .slice(0, 5); // Limit to top 5 most similar

    // Extract campaign IDs from results
    const campaignIds = relevantCampaigns.map(result => result.embedding.sourceId);
    log(`Found ${campaignIds.length} relevant campaign IDs: ${campaignIds.join(', ')}`, 'two-llm-rag');

    if (campaignIds.length === 0) {
      // If no relevant campaigns found, return a fallback response
      const response: RAGResponse = {
        answer: "I couldn't find campaign data relevant to your question. Could you provide more details about which campaigns you're interested in?",
        campaigns: [],
        insights: {},
        retrievalSuccess: false
      };
      
      if (options.includeDebugInfo) {
        response.debugInfo = {
          queryVectorDimensions: queryVector.length,
          processingTimeMs: Date.now() - processingStart
        };
      }
      
      return response;
    }

    // Step 3: Generate SQL query with first LLM
    log(`Generating SQL query with first LLM...`, 'two-llm-rag');
    const sqlGenerationPrompt = `
You are a specialized SQL generation assistant for an advertising analytics platform.

The user asked: "${query}"

Based on this query, generate a PostgreSQL query that retrieves campaign data for the following campaign IDs:
${campaignIds.join(', ')}

Requirements:
1. Your task is ONLY to write valid SQL for PostgreSQL, not to execute it or explain it.
2. Only include data for user ID: ${userId}
3. For Amazon campaigns, use tables: campaign_metrics (cm) and advertiser_accounts (aa)
4. For Google campaigns, use tables: google_campaign_metrics (gcm) and google_advertiser_accounts (gaa)
5. Calculate metrics like CTR (clicks/impressions) or conversion rate where appropriate
6. Consider time ranges mentioned in the query if any
7. Do not make up column names - use only these columns that exist:
   - campaign_metrics: id, user_id, campaign_id, profile_id, date, impressions, clicks, cost, ad_group_id
   - google_campaign_metrics: id, user_id, campaign_id, customer_id, date, impressions, clicks, cost, conversions, ad_group_id
   - advertiser_accounts: id, user_id, profile_id, account_name, marketplace, account_type, status
   - google_advertiser_accounts: id, user_id, customer_id, account_name, status

Your query must have proper JOINs, WHERE clauses, and should include relevant columns for analysis.
ONLY provide the SQL query, nothing else. No explanation, no preamble, just the SQL in complete, executable form.
`;

    const openaiClient = getOpenAIClient();
    const sqlCompletion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a specialized SQL query generator.' },
        { role: 'user', content: sqlGenerationPrompt }
      ],
      temperature: 0.3 // Lower temperature for more precise SQL generation
    });

    const sqlQuery = sqlCompletion.choices[0].message.content || '';
    log(`Generated SQL query: ${sqlQuery}`, 'two-llm-rag');

    // Step 4: Execute the generated SQL query
    log(`Executing generated SQL query...`, 'two-llm-rag');
    let campaignData = [];
    try {
      const queryResult = await pool.query(sqlQuery);
      campaignData = queryResult.rows;
      log(`SQL query returned ${campaignData.length} rows`, 'two-llm-rag');
    } catch (error) {
      log(`Error executing SQL query: ${error}. Falling back to direct campaign lookup.`, 'two-llm-rag');
      
      // Fallback to direct campaign lookup
      const amazonQuery = `
        SELECT aa.*, 'amazon' as platform 
        FROM advertiser_accounts aa
        WHERE aa.user_id = $1 AND aa.profile_id IN (${campaignIds.map((_, i) => `$${i + 2}`).join(',')})
      `;
      
      const googleQuery = `
        SELECT gaa.*, 'google' as platform 
        FROM google_advertiser_accounts gaa
        WHERE gaa.user_id = $1 AND gaa.customer_id IN (${campaignIds.map((_, i) => `$${i + 2}`).join(',')})
      `;
      
      const amazonParams = [userId, ...campaignIds];
      const googleParams = [userId, ...campaignIds];
      
      try {
        const amazonResult = await pool.query(amazonQuery, amazonParams);
        const googleResult = await pool.query(googleQuery, googleParams);
        
        campaignData = [...amazonResult.rows, ...googleResult.rows];
        log(`Fallback lookup returned ${campaignData.length} campaigns`, 'two-llm-rag');
      } catch (fallbackError) {
        log(`Error in fallback campaign lookup: ${fallbackError}`, 'two-llm-rag');
      }
    }

    // Step 5: Use second LLM to generate response
    log(`Generating response with second LLM...`, 'two-llm-rag');
    const responsePrompt = `
The user asked: "${query}"

Here is the campaign data retrieved:
${JSON.stringify(campaignData, null, 2)}

Provide a helpful, conversational response that answers the user's question based on this campaign data.
Focus on metrics like impressions, clicks, cost, CTR, and conversions where available.
If the data is incomplete, acknowledge this and explain what data would be needed for a more complete answer.
Use a friendly, helpful tone appropriate for a chat interface.
`;

    const responseCompletion = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: generateSystemPrompt() },
        { role: 'user', content: responsePrompt }
      ]
    });

    const answer = responseCompletion.choices[0].message.content || '';
    log(`Generated answer with ${answer.length} characters`, 'two-llm-rag');
    
    // Save to database if we have a conversation ID
    if (options.conversationId) {
      try {
        await storage.createChatMessage({
          conversationId: options.conversationId,
          role: 'assistant',
          content: answer,
          metadata: {
            model: 'gpt-4o',
            processed: true,
            timestamp: new Date().toISOString(),
            campaignIds: campaignIds.length > 0 ? campaignIds : undefined
          }
        });
        log(`Saved assistant message to database for conversation ${options.conversationId}`, 'two-llm-rag');
      } catch (saveError) {
        log(`Error saving assistant message: ${saveError}`, 'two-llm-rag');
      }
    }

    // Create response object
    const response: RAGResponse = {
      answer,
      campaigns: campaignData,
      insights: {}, // We could calculate insights here if needed
      retrievalSuccess: true
    };
    
    // Add debug info if requested
    if (options.includeDebugInfo) {
      response.debugInfo = {
        queryVectorDimensions: queryVector.length,
        similarVectors: relevantCampaigns,
        campaignIds,
        contextLength: responsePrompt.length,
        processingTimeMs: Date.now() - processingStart
      };
    }
    
    log(`Two-LLM RAG process completed in ${Date.now() - processingStart}ms`, 'two-llm-rag');
    return response;
  } catch (error) {
    // Handle errors
    log(`Error in non-streaming Two-LLM RAG process: ${error}`, 'two-llm-rag');
    
    return {
      answer: "I encountered an error while retrieving campaign data. Please try again or rephrase your question.",
      campaigns: [],
      insights: {},
      retrievalSuccess: false,
      error: error instanceof Error ? error.message : String(error),
      debugInfo: options.includeDebugInfo ? {
        processingTimeMs: Date.now() - processingStart
      } : undefined
    };
  }
}