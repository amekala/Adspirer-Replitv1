/**
 * OpenAI API integration service
 * Provides functionality for interacting with OpenAI APIs, 
 * handling credentials, and streaming responses.
 * 
 * This service also integrates with a SQL Builder LLM that handles
 * database queries for campaign data.
 */

import { OpenAI } from 'openai';
import { Response } from 'express';
import { storage } from '../storage';
import { processSQLQuery, isDataQuery } from './sqlBuilder';
import type { Stream } from 'openai/streaming';

// Define interfaces for strongly typed parameters
export interface ChatCompletionOptions {
  conversationId: string;
  userId: string;
  systemPrompt?: string;
}

/**
 * Initialize the OpenAI client with the API key
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.');
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Convert chat completion parameters to responses API format
 * This helper function maintains backward compatibility while migrating to the new API
 * 
 * @param params - The original chat completions parameters
 * @returns Parameters formatted for the responses API
 */
function convertToResponsesFormat(params: any): any {
  // Start with a new params object for the Responses API
  const responsesParams: any = {
    model: params.model,
  };

  // Handle streaming (only set if true to avoid sending false)
  if (params.stream) {
    responsesParams.stream = true;
  }

  // Convert messages array to input format
  if (params.messages && Array.isArray(params.messages)) {
    // For cases with messages array
    if (params.messages.length > 0) {
      // In the Responses API format, we need to structure the input differently
      // The whole messages array should be passed as input
      responsesParams.input = params.messages;
    }
  } else if (params.input) {
    // If input is already provided (single string or structured format)
    responsesParams.input = params.input;
  }

  // Handle optional parameters (only set if defined)
  if (params.temperature !== undefined) {
    responsesParams.temperature = params.temperature;
  }
  
  if (params.max_tokens !== undefined) {
    // Responses API uses max_output_tokens instead of max_tokens
    responsesParams.max_output_tokens = params.max_tokens;
  }
  
  if (params.tools) {
    responsesParams.tools = params.tools;
  }
  
  if (params.tool_choice) {
    responsesParams.tool_choice = params.tool_choice;
  }
  
  if (params.response_format) {
    responsesParams.response_format = params.response_format;
  }
  
  if (params.frequency_penalty !== undefined) {
    responsesParams.frequency_penalty = params.frequency_penalty;
  }
  
  if (params.presence_penalty !== undefined) {
    responsesParams.presence_penalty = params.presence_penalty;
  }
  
  if (params.top_p !== undefined) {
    responsesParams.top_p = params.top_p;
  }
  
  if (params.seed !== undefined) {
    responsesParams.seed = params.seed;
  }
  
  return responsesParams;
}

/**
 * Handles data queries by using SQL Builder to convert natural language to SQL,
 * executing the query, and then formatting the results for the user.
 * 
 * This function maintains a complete separation of concerns - the user never sees
 * the SQL or knows that a second LLM is involved.
 * 
 * Major enhancements:
 * 1. Uses query cache to avoid redundant processing
 * 2. Leverages pre-computed summaries for common metrics
 * 3. Better data visualization formatting
 * 
 * @param conversationId - The ID of the conversation
 * @param userId - The user ID making the query
 * @param res - Express response object for streaming
 * @param query - The natural language query from the user
 * @param conversationContext - Optional prior conversation for context
 */
async function handleDataQuery(
  conversationId: string,
  userId: string,
  res: Response,
  query: string,
  conversationContext?: string
): Promise<void> {
  console.log(`Handling data query: "${query}" with ${conversationContext ? 'context' : 'no context'}`);
  
  try {
    // Send a thinking message to the client
    res.write(`data: ${JSON.stringify({ 
      content: "I'm analyzing your campaign data..." 
    })}\n\n`);
    
    // Parse the conversation context for revenue information
    let revenueInfo = null;
    if (conversationContext) {
      const revenueMatch = conversationContext.match(/revenue\s+is\s+(\d+)/i);
      if (revenueMatch && revenueMatch[1]) {
        revenueInfo = {
          value: parseFloat(revenueMatch[1]),
          currency: '$'
        };
        console.log(`Found revenue information in conversation context: ${revenueInfo.currency}${revenueInfo.value}`);
      }
    }
    
    // Parse for campaign IDs in the context
    let campaignIds: string[] = [];
    if (conversationContext) {
      const campaignIdRegex = /Campaign\s+(?:ID)?\s*[:\s]+(\d{8,})/gi;
      let match;
      while ((match = campaignIdRegex.exec(conversationContext)) !== null) {
        if (match[1] && !campaignIds.includes(match[1])) {
          campaignIds.push(match[1]);
        }
      }
      if (campaignIds.length > 0) {
        console.log(`Found campaign IDs in context: ${campaignIds.join(', ')}`);
      }
    }
    
    // Process the query with SQL Builder, passing conversation context if available
    // The SQL Builder now checks cache & summaries before executing SQL
    const sqlResult = await processSQLQuery(userId, query, conversationContext);
    
    let responseContent = '';
    let messageData: any;
    
    if (sqlResult.error) {
      // If there was an error processing the SQL query
      responseContent = `I encountered an issue while analyzing your campaign data: ${sqlResult.error}`;
    } else if (!sqlResult.data || (Array.isArray(sqlResult.data) && sqlResult.data.length === 0)) {
      // No data found
      responseContent = "I searched our database but couldn't find any campaign data matching your request. This could be because you don't have any campaigns yet, or the specific data you're looking for isn't available.";
    } else {
      // Special handling for pre-computed summary data (which has a different structure)
      if (sqlResult.fromSummary) {
        // Data from summaries is already pre-formatted
        console.log("Using pre-computed summary data");
        
        // If the data has insights, include them in the response
        const summaryData = sqlResult.data as any;
        if (summaryData.insights && summaryData.insights.length > 0) {
          const insights = summaryData.insights.map((insight: string) => `• ${insight}`).join('\n');
          
          responseContent = `Based on your campaign data, here are some insights:\n\n${insights}\n\n`;
          
          // Include metadata for rendering in enhanced UI components
          messageData = {
            role: "assistant" as const,
            content: responseContent,
            conversationId,
            metadata: {
              model: 'gpt-4o',
              timestamp: new Date().toISOString(),
              processed: true,
              isDataQuery: true,
              fromSummary: true,
              summaryData: summaryData,
              sqlQuery: sqlResult.sql,
            }
          };
          
          await storage.createChatMessage(messageData);
          
          // Send the response with metadata for UI rendering
          res.write(`data: ${JSON.stringify({ 
            content: responseContent,
            metadata: {
              fromSummary: true,
              data: summaryData
            }
          })}\n\n`);
          
          // End the stream
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
      } else if (sqlResult.fromCache) {
        // Using cached data
        console.log("Using cached query results");
      }
      
      // Process regular SQL result data
      if (Array.isArray(sqlResult.data) && sqlResult.data.length > 0) {
        console.log("SQL result data:", JSON.stringify(sqlResult.data, null, 2));
        
        // Round floating point values to 1 decimal place for better presentation
        sqlResult.data = sqlResult.data.map(row => {
          const processedRow = {...row};
          
          // Format CTR to 1 decimal place if it exists
          if (row.ctr !== undefined) {
            processedRow.ctr = parseFloat(row.ctr).toFixed(1);
          }
          
          // Format any other metrics that need rounding/formatting
          if (row.conversion_rate !== undefined) {
            processedRow.conversion_rate = parseFloat(row.conversion_rate).toFixed(1);
          }
          
          return processedRow;
        });
        
        // Log the processed data
        console.log("Processed SQL result data:", JSON.stringify(sqlResult.data, null, 2));
      }
      
      // Process the data if we have revenue information from the context
      if (revenueInfo && campaignIds.length > 0) {
        console.log(`Applying revenue ${revenueInfo.value} to campaigns: ${campaignIds.join(', ')}`);
        
        // Find the campaign data in the SQL results that matches our campaign IDs
        if (Array.isArray(sqlResult.data)) {
          // Calculate ROAS for each campaign mentioned in the context
          const processedData = sqlResult.data.map(row => {
            // Deep clone to avoid modifying the original
            const newRow = {...row};
            
            // If this is a campaign mentioned in the context and we have cost data
            const campaignId = row.campaign_id?.toString() || row.id?.toString();
            if (campaignId && campaignIds.includes(campaignId) && row.cost) {
              // Calculate ROAS as revenue / cost
              const cost = parseFloat(row.cost);
              if (cost > 0) {
                newRow.roas = (revenueInfo.value / cost).toFixed(2);
                console.log(`Calculated ROAS for campaign ${campaignId}: ${newRow.roas}`);
              }
            }
            
            return newRow;
          });
          
          // Replace the data with our processed version
          sqlResult.data = processedData;
        }
      }
      
      // Use OpenAI to format the data, with stronger instructions against hallucination
      const openaiClient = getOpenAIClient();
      
      // Create parameters for chat completions
      const completionParams = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an advertising campaign analyst skilled at clearly presenting data insights.
                     Format the following campaign data results into a helpful, concise response.
                     
                     CRITICAL INSTRUCTIONS:
                     1. ONLY use the exact data provided to you. DO NOT add, modify, or invent any metrics.
                     2. If the data appears incomplete or suspicious, mention this fact rather than filling gaps.
                     3. Use the exact campaign IDs and numeric values from the data - never round numbers.
                     4. If values appear unusual (e.g., very high or low), note this but do not change them.
                     5. Do not invent explanations for patterns unless clearly evident in the data.
                     6. CTR values should be shown with % symbol and exactly one decimal place.
                     7. Format ROAS values with an 'x' suffix to represent as a ratio (e.g., "9.98x").
                     8. Only calculate metrics for campaigns mentioned in the context, never for random campaign IDs.
                     
                     Formatting guidelines:
                     1. Present the data in a clear, easy-to-understand format
                     2. Use bullet points, tables, or other formatting to make the data readable
                     3. Highlight any insights visible in the actual data
                     4. Do NOT mention SQL or databases - present as if you analyzed the data yourself
                     5. Keep the tone professional, helpful, and concise
                     6. Make sure monetary values are formatted appropriately (with currency symbols)`
          },
          {
            role: "user",
            content: `The user asked: "${query}"
                     
                     Here is the EXACT campaign data that must be used (do not modify these values):
                     ${JSON.stringify(sqlResult.data, null, 2)}
                     
                     ${revenueInfo ? `The user mentioned revenue is ${revenueInfo.currency}${revenueInfo.value}` : ''}
                     ${campaignIds.length > 0 ? `The conversation mentioned these campaign IDs: ${campaignIds.join(', ')}` : ''}
                     
                     Format this data into a helpful response using ONLY the actual values provided.
                     If the data seems incomplete or suspicious, acknowledge this in your response.`
          }
        ],
        temperature: 0.3, // Lower temperature for more factual responses
      };
      
      // Convert the parameters to the Responses API format
      const responsesParams = convertToResponsesFormat(completionParams);
      
      // Use the Responses API
      const formatResponse = await openaiClient.responses.create(responsesParams);
      
      // Extract content from the responses API result
      responseContent = formatResponse.output_text || 
        "I've analyzed your campaign data but am having trouble formatting the results. Please try asking in a different way.";
    }
    
    // Prepare message metadata with information about data source
    if (!messageData) {
      messageData = {
        role: "assistant" as const,
        content: responseContent,
        conversationId,
        metadata: {
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
          processed: true,
          isDataQuery: true,
          // Store SQL info for debugging but not visible to user
          sqlQuery: sqlResult.sql,
          rowCount: Array.isArray(sqlResult.data) ? sqlResult.data.length : 0,
          fromCache: sqlResult.fromCache
        }
      };
    }
    
    // Save the response to the database
    await storage.createChatMessage(messageData);
    console.log('Data query response saved successfully');
    
    // Send the formatted response to the client
    res.write(`data: ${JSON.stringify({ 
      content: responseContent, 
      metadata: {
        fromCache: sqlResult.fromCache
      }
    })}\n\n`);
    
    // End the stream
    res.write('data: [DONE]\n\n');
    res.end();
    
  } catch (error) {
    console.error('Error handling data query:', error);
    
    // Send error message to client
    const errorMessage = "I'm sorry, I encountered an issue while processing your data request. Please try again or ask in a different way.";
    res.write(`data: ${JSON.stringify({ content: errorMessage })}\n\n`);
    
    // Save error message
    await storage.createChatMessage({
      role: "assistant" as const,
      content: errorMessage,
      conversationId,
      metadata: {
        error: true,
        errorMessage: (error as Error).message
      }
    });
    
    // End the stream
    res.write('data: [DONE]\n\n');
    res.end();
  }
}

/**
 * Process streaming response from OpenAI and save to database
 * @param conversationId - The ID of the conversation
 * @param res - The Express response object for streaming
 * @param messages - The messages to send to OpenAI
 */
export async function streamChatCompletion(
  conversationId: string,
  userId: string,
  res: Response | null,
  messages: any[],
  systemPrompt = `You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies.

When interacting with users:
1. Always ask clarifying questions when the user's request is vague or could be interpreted in multiple ways
2. If the user asks about "campaigns" without specifying which ones, ask which specific campaigns they want information about
3. When providing metrics analysis, ask if they want to know why certain metrics are performing as they are
4. Always aim to understand the user's intent rather than just responding to their literal question
5. If the user's question doesn't provide enough context, reference previous conversations to establish context
6. For complex analytical requests, break down your process of analysis and ask if that's what they need
7. Provide helpful, concise responses about advertising, analytics, and campaign management
8. When the user provides revenue information, apply that value to the campaigns mentioned in the current context
9. Calculate ROAS (Return on Ad Spend) as a direct ratio (e.g., "9.98x") rather than as a percentage
10. For specific campaign performance analyses, reference both the campaign ID and name for clarity`
): Promise<void> {
  // Determine if this is a streaming response (with res object) or non-streaming (welcome message)
  const isStreaming = !!res;
  
  try {
    // Check if there's already a system message in the array
    const hasSystemMessage = messages.some(msg => msg.role === 'system');
    
    // If there's no system message, we add it (messages are passed directly to Responses API)
    if (!hasSystemMessage) {
      messages = [
        { role: 'system', content: systemPrompt },
        ...messages
      ];
    }

    // Initialize OpenAI client
    const openaiClient = getOpenAIClient();
    
    // Configure SSE headers for streaming
    if (isStreaming) {
      res!.setHeader('Content-Type', 'text/event-stream');
      res!.setHeader('Cache-Control', 'no-cache');
      res!.setHeader('Connection', 'keep-alive');
    }
    
    console.log('Creating chat completion with OpenAI GPT-4o...');
    console.log(`Mode: ${isStreaming ? 'Streaming' : 'Non-streaming welcome message'}`);
    
    // For welcome messages we can use non-streaming for simplicity
    if (!isStreaming) {
      // Non-streaming completion for welcome messages using Responses API
      
      // Create parameters for welcome message
      const welcomeParams = {
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_output_tokens: 500, // Welcome messages can be shorter
      };
      
      // Convert parameters to Responses API format
      const responsesParams = convertToResponsesFormat(welcomeParams);
      
      // Use the Responses API
      const completion = await openaiClient.responses.create(responsesParams);
      
      // Extract text from response
      const fullAssistantMessage = completion.output_text || '';
      
      // Create metadata for the message
      const messageData = {
        role: "assistant" as const,
        content: fullAssistantMessage,
        conversationId,
        metadata: {
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
          processed: true,
          isWelcomeMessage: true
        }
      };
      
      // Save welcome message to database
      await storage.createChatMessage(messageData);
      console.log('Welcome message saved successfully');
      return;
    }
    
    // ----- INTELLIGENT QUERY HANDLING -----
    // Get the most recent user message
    const userMessages = messages.filter(msg => msg.role === 'user');
    const lastUserMessage = userMessages.length > 0 ? userMessages[userMessages.length - 1].content : '';
    
    // Get conversation context (excluding system messages)
    const conversationContext = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');
    
    // For streaming responses, check if this is a data query that should be handled by SQL Builder
    if (isStreaming) {
      // First, ask the main LLM if this should be handled as a data query
      const openaiClient = getOpenAIClient();
      
      // Create parameters for routing decision
      const routingParams = {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a routing agent for an advertising platform assistant.
                     Your job is to determine if a user's message should be answered with:
                     1. Campaign data from the database (using SQL)
                     2. General knowledge about advertising
                     
                     Only route to the database if the user is clearly asking for their specific campaign performance,
                     metrics, or data about their advertising accounts. Examples of database queries:
                     - "How are my Amazon campaigns performing?"
                     - "What was my CTR last week?"
                     - "Show me my campaigns with the highest ROAS"
                     - "Which of my Google ads had the most impressions yesterday?"
                     
                     If the user is asking general questions about advertising strategy, best practices,
                     or how something works, do NOT route to the database.`
          },
          {
            role: "user",
            content: `Here is the conversation so far:\n${conversationContext}\n\nBased on this context and the latest message, should I route to the database or handle it as a general knowledge query? Reply with only "DATABASE" or "GENERAL".`
          }
        ],
        temperature: 0.1,
        max_output_tokens: 10,
      };
      
      // Convert parameters to Responses API format
      const responsesParams = convertToResponsesFormat(routingParams);
      
      // Use Responses API for routing decision
      const routingDecision = await openaiClient.responses.create(responsesParams);
      
      // Extract the decision from the response
      const decision = routingDecision.output_text?.trim().toUpperCase() || 'GENERAL';
      console.log(`Routing decision for query: "${lastUserMessage}" → ${decision}`);
      
      if (decision === 'DATABASE') {
        // If the main LLM thinks this is a data query, pass to SQL Builder with context
        console.log(`Routing to SQL Builder with context`);
        await handleDataQuery(conversationId, userId, res!, lastUserMessage, conversationContext);
        return;
      }
      // Otherwise fall through to regular completion
    }
    // ----- END INTELLIGENT QUERY HANDLING -----
    
    // Log messages for regular chat completion
    console.log('Messages being sent to OpenAI:', JSON.stringify(messages, null, 2));
    
    // Create parameters for streaming with the Responses API
    const streamParams = {
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_output_tokens: 1000,
      stream: true,
    };
    
    // Convert parameters to Responses API format
    const responsesParams = convertToResponsesFormat(streamParams);
    
    // Use Responses API for streaming with explicit type casting to handle TypeScript
    // Need to cast to 'any' to avoid TypeScript errors with streaming interface
    // This is needed because the OpenAI SDK types don't fully align with TypeScript's
    // expectations for AsyncIterable objects
    const response = await openaiClient.responses.create({
      ...responsesParams,
      stream: true
    }) as any;
    
    // Track the complete assistant message for saving to the database
    let fullAssistantMessage = '';
    
    console.log('Stream created, sending chunks to client...');
    
    try {
      // Process stream chunks using for-await loop
      for await (const chunk of response) {
        // Ensure we handle the chunk as a Responses API chunk with type checking
        if (chunk && 'output_text' in chunk) {
          // Extract content from the chunk
          const content = chunk.output_text || '';
          
          if (content) {
            // Only save the content to our full message if it's new (delta) content
            // If this is a full text replacement, get the difference and add that
            const newContent = content.substring(fullAssistantMessage.length);
            fullAssistantMessage = content;
            
            // Send each chunk to the client
            res!.write(`data: ${JSON.stringify({ content: newContent })}\n\n`);
          }
        }
      }
      
      console.log('Stream completed, saving response to database...');
    } catch (streamError) {
      console.error('Error processing stream:', streamError);
      res!.write(`data: ${JSON.stringify({ error: 'Error processing stream' })}\n\n`);
      res!.write('data: [ERROR]\n\n');
      res!.end();
      return;
    }
    
    // Save the complete response to the database
    try {
      // Create metadata for the message
      const messageData = {
        role: "assistant" as const,
        content: fullAssistantMessage,
        conversationId,
        metadata: {
          model: 'gpt-4o',
          timestamp: new Date().toISOString(),
          processed: true
        }
      };
      
      // Save to database
      const savedMessage = await storage.createChatMessage(messageData);
      console.log('AI response saved successfully with ID:', savedMessage.id);
      
      // End the stream
      res!.write('data: [DONE]\n\n');
      res!.end();
      
    } catch (err) {
      console.error('Error saving assistant message:', err);
      if (isStreaming) {
        res!.write('data: [ERROR]\n\n');
        res!.end();
      }
    }
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    
    // Send error to client and end response if streaming
    if (isStreaming) {
      res!.write(`data: ${JSON.stringify({ error: 'An error occurred with the OpenAI service.' })}\n\n`);
      res!.write('data: [ERROR]\n\n');
      res!.end();
    }
  }
}

/**
 * Get the latest conversation history for OpenAI completion
 * @param conversationId - The ID of the conversation
 * @param maxTokens - Optional max number of tokens to consider
 * @returns Array of messages formatted for OpenAI
 */
export async function getConversationHistory(conversationId: string, maxTokens = 3000): Promise<any[]> {
  try {
    // Get all messages for the conversation
    const messages = await storage.getChatMessages(conversationId);
    
    // Convert to OpenAI message format
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content
    }));
    
    // In a more advanced implementation, we could:
    // - Count tokens and truncate older messages if needed
    // - Implement windowing strategies for very long conversations
    // - Add summarization for context
    
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
}

/**
 * Generate a welcome message for a new conversation
 * This is used when a new chat is started and no user message is provided yet
 * @param conversationId The ID of the new conversation
 * @param userId The user ID of the conversation owner
 */
export async function generateWelcomeMessage(
  conversationId: string,
  userId: string
): Promise<void> {
  // System message with conversation starting instructions
  const welcomeSystemPrompt = `You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. This is a brand new conversation with a user.

Start by:
1. Introducing yourself briefly
2. Explaining how you can help with advertising campaign management
3. Ask specific questions about their advertising needs, such as:
   - What platforms they're advertising on (Amazon, Google, etc.)
   - What specific challenges they're facing with their campaigns
   - Whether they're looking for performance analysis or strategy advice
   - If they want to compare metrics across different campaigns

Remember to:
- Always ask clarifying questions when the user's request is vague
- When providing metrics analysis, ask if they want to know why certain metrics are performing as they are
- Calculate ROAS (Return on Ad Spend) as a direct ratio (e.g., "9.98x") rather than as a percentage
- Apply revenue information to campaigns mentioned in the current context

Your response should be friendly, concise (under 150 words), and encourage the user to provide specific details about what they need help with.`;
  
  // Create an initial message array with only the system prompt
  const messages = [
    { role: 'system', content: welcomeSystemPrompt }
  ];
  
  // Return a welcome message using the regular streaming function
  return streamChatCompletion(
    conversationId,
    userId,
    // We don't need the response object here as this function will be called by our routes
    // and will handle the response directly
    null as any, // This is a temp solution, we'll modify the route to handle this case
    messages,
    welcomeSystemPrompt
  );
}