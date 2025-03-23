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
 * Handles data queries by using SQL Builder to convert natural language to SQL,
 * executing the query, and then formatting the results for the user.
 * 
 * This function maintains a complete separation of concerns - the user never sees
 * the SQL or knows that a second LLM is involved.
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
    
    // Process the query with SQL Builder, passing conversation context if available
    const sqlResult = await processSQLQuery(userId, query, conversationContext);
    
    let responseContent = '';
    
    if (sqlResult.error) {
      // If there was an error processing the SQL query
      responseContent = `I encountered an issue while analyzing your campaign data: ${sqlResult.error}`;
    } else if (!sqlResult.data || sqlResult.data.length === 0) {
      // No data found
      responseContent = "I searched our database but couldn't find any campaign data matching your request. This could be because you don't have any campaigns yet, or the specific data you're looking for isn't available.";
    } else {
      // We have data - use OpenAI to format it nicely for the user
      const openaiClient = getOpenAIClient();
      
      const formatResponse = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an advertising campaign analyst skilled at clearly presenting data insights. 
                     Format the following campaign data results into a helpful, concise response.
                     
                     Guidelines:
                     1. Present the data in a clear, easy-to-understand format
                     2. Use bullet points, tables, or other formatting to make the data readable
                     3. Highlight key insights or patterns in the data
                     4. Do NOT mention SQL, databases, or queries - present as if you analyzed the data yourself
                     5. Keep the tone professional, helpful, and concise
                     6. Make sure monetary values are formatted appropriately (with currency symbols)
                     7. Use plain language to explain technical metrics (ROAS, ACOS, CTR, etc.)`
          },
          {
            role: "user",
            content: `The user asked: "${query}"
                     
                     Here is the campaign data:
                     ${JSON.stringify(sqlResult.data, null, 2)}
                     
                     Please format this data into a helpful response.`
          }
        ],
        temperature: 0.7, // Slightly higher for more natural language
      });
      
      responseContent = formatResponse.choices[0]?.message?.content || 
        "I've analyzed your campaign data but am having trouble formatting the results. Please try asking in a different way.";
    }
    
    // Send the formatted response to the client
    res.write(`data: ${JSON.stringify({ content: responseContent })}\n\n`);
    
    // Save the response to the database with metadata indicating it was from SQL Builder
    const messageData = {
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
        rowCount: sqlResult.data?.length || 0
      }
    };
    
    await storage.createChatMessage(messageData);
    console.log('Data query response saved successfully');
    
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
  systemPrompt = 'You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies. Provide helpful, concise responses about advertising, analytics, and campaign management.'
): Promise<void> {
  // Determine if this is a streaming response (with res object) or non-streaming (welcome message)
  const isStreaming = !!res;
  
  try {
    // Create a proper system message if not already included
    if (!messages.some(msg => msg.role === 'system')) {
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
      // Non-streaming completion for welcome messages
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.7,
        max_tokens: 500, // Welcome messages can be shorter
      });
      
      const fullAssistantMessage = completion.choices[0]?.message?.content || '';
      
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
      const routingDecision = await openaiClient.chat.completions.create({
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
        max_tokens: 10,
      });
      
      const decision = routingDecision.choices[0]?.message?.content?.trim().toUpperCase() || 'GENERAL';
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
    
    // Regular streaming mode for normal interactions
    const stream = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });
    
    // Track the complete assistant message for saving to the database
    let fullAssistantMessage = '';
    
    console.log('Stream created, sending chunks to client...');
    
    // Process stream chunks
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullAssistantMessage += content;
        
        // Send each chunk to the client
        res!.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    
    console.log('Stream completed, saving response to database...');
    
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
  const welcomeSystemPrompt = 'You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. This is a brand new conversation with a user. Start by introducing yourself briefly, explaining how you can help with advertising campaign management, and ask what the user would like help with today. Your response should be friendly, concise (under 150 words), and welcoming.';
  
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