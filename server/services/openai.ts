/**
 * OpenAI API integration service
 * Provides functionality for interacting with OpenAI APIs,
 * handling credentials, and streaming responses.
 *
 * This service also integrates with a SQL Builder LLM that handles
 * database queries for campaign data.
 */

import OpenAI from "openai";
import { Response } from "express";
import { storage } from "../storage";
import * as SQLBuilder from "./sqlBuilder";
import { ChatConversation, ChatMessage as DbChatMessage } from "@shared/schema";

// Types for message roles in the OpenAI API
export type MessageRole = "user" | "assistant" | "developer" | "system";
export interface OpenAIMessage {
  role: MessageRole;
  content: string;
}

// Options for chat completion
export interface ChatCompletionOptions {
  conversationId: string;
  userId: string;
  systemPrompt?: string;
}

// Interface for database message data
interface MessageData {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, any>;
}

/**
 * Initialize the OpenAI client with the API key
 */
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }
  
  return new OpenAI({
    apiKey
  });
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
  conversationContext?: string,
): Promise<void> {
  console.log(
    `Handling data query: "${query}" with ${conversationContext ? "context" : "no context"}`,
  );

  try {
    // Send a thinking message to the client
    res.write(
      `data: ${JSON.stringify({
        content: "I'm analyzing your campaign data...",
      })}\n\n`,
    );

    // Parse the conversation context for revenue information
    let revenueInfo = null;
    if (conversationContext) {
      const revenueMatch = conversationContext.match(/revenue\s+is\s+(\d+)/i);
      if (revenueMatch && revenueMatch[1]) {
        revenueInfo = {
          value: parseFloat(revenueMatch[1]),
          currency: "$",
        };
        console.log(
          `Found revenue information in conversation context: ${revenueInfo.currency}${revenueInfo.value}`,
        );
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
        console.log(`Found campaign IDs in context: ${campaignIds.join(", ")}`);
      }
    }

    // Process the query with SQL Builder, passing conversation context if available
    // The SQL Builder checks cache & summaries before executing SQL
    const sqlResult = await SQLBuilder.processSQLQuery(userId, query, conversationContext);

    let responseContent = "";
    let messageData: MessageData;

    if (sqlResult.error) {
      // If there was an error processing the SQL query
      responseContent = `I encountered an issue while analyzing your campaign data: ${sqlResult.error}`;
    } else if (
      !sqlResult.data ||
      (Array.isArray(sqlResult.data) && sqlResult.data.length === 0)
    ) {
      // If no data was found
      responseContent = "I couldn't find any campaign data matching your query. Could you please try rephrasing or specifying a different time period?";
    } else {
      // If we have data, process it

      // Enhance data with revenue information if available
      if (revenueInfo && sqlResult.data) {
        // Assume sqlResult.data is an array of objects
        const processedData = sqlResult.data.map((item: any) => {
          // Only add revenue to items with campaignId that matches ones in context
          if (
            item.campaign_id &&
            (!campaignIds.length || campaignIds.includes(item.campaign_id))
          ) {
            return {
              ...item,
              revenue: revenueInfo.value,
              revenue_currency: revenueInfo.currency,
            };
          }
          return item;
        });

        // Replace the data with our processed version
        sqlResult.data = processedData;
      }

      // Use OpenAI to format the data, with stronger instructions against hallucination
      const openaiClient = getOpenAIClient();

      const response = await openaiClient.responses.create({
        model: "gpt-4o",
        input: [
          {
            role: "developer",
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
                     
                     ${revenueInfo ? `The user mentioned revenue is ${revenueInfo.currency}${revenueInfo.value}` : ""}
                     ${campaignIds.length > 0 ? `The conversation mentioned these campaign IDs: ${campaignIds.join(", ")}` : ""}
                     
                     Format this data into a helpful response using ONLY the actual values provided.
                     If the data seems incomplete or suspicious, acknowledge this in your response.`
          }
        ],
        max_output_tokens: 1000,
        temperature: 0.3, // Lower temperature for more factual responses
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        store: true
      });

      // Extract the response content
      responseContent = response.output_text || "";
      
      // If we got a response, create a system message showing what SQL was used (for debugging)
      console.log(`SQL used: ${sqlResult.sql}`);
      console.log(`Data found: ${sqlResult.data.length} records`);
    }

    // Stream back the response content to the client
    res.write(
      `data: ${JSON.stringify({
        content: responseContent,
      })}\n\n`,
    );

    // Stream completion signal
    res.write("data: [DONE]\n\n");

    // Save the assistant's response to the database
    messageData = {
      conversationId,
      role: "assistant" as const,
      content: responseContent,
      metadata: {
        isDataQuery: true,
        sqlUsed: sqlResult.sql,
        recordCount: sqlResult.data ? sqlResult.data.length : 0,
        fromCache: sqlResult.fromCache || false,
        fromSummary: sqlResult.fromSummary || false,
        revenueApplied: revenueInfo !== null,
      },
    };

    const assistantMessage = await storage.createChatMessage(messageData);
    console.log("AI response saved successfully with ID:", assistantMessage.id);
  } catch (error) {
    console.error("Error handling data query:", error);

    // Send error message to client
    res.write(
      `data: ${JSON.stringify({
        content:
          "I'm sorry, I encountered an error while processing your data query. Please try again or contact support if the issue persists.",
      })}\n\n`,
    );

    // Stream completion signal
    res.write("data: [DONE]\n\n");

    // Save error message to database
    const messageData: MessageData = {
      conversationId,
      role: "assistant" as const,
      content:
        "I'm sorry, I encountered an error while processing your data query. Please try again or contact support if the issue persists.",
      metadata: {
        isDataQuery: true,
        error: error instanceof Error ? error.message : String(error),
      },
    };

    await storage.createChatMessage(messageData);
  } finally {
    // End the response
    res.end();
  }
}

/**
 * Process streaming response from OpenAI and save to database
 * @param conversationId - The ID of the conversation
 * @param res - The Express response object for streaming
 * @param messages - The messages to send to OpenAI
 * @param systemPrompt - Optional system prompt to override default
 */
export async function streamChatCompletion(
  conversationId: string,
  res: Response | null,
  messages: OpenAIMessage[],
  systemPrompt: string = `You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies.

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
10. For specific campaign performance analyses, reference both the campaign ID and name for clarity`,
): Promise<void> {
  // Determine if this is a streaming response (with res object) or non-streaming (welcome message)
  const isStreaming = !!res;

  try {
    // Find the user ID from the conversation
    const conversation = await storage.getChatConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const userId = conversation.userId;

    console.log("Generating chat completion for conversation:", conversationId);
    console.log("Retrieved", messages.length, "messages for chat completion context");

    // ----- INTELLIGENT QUERY HANDLING -----
    // Get the most recent user message
    const userMessages = messages.filter((msg) => msg.role === "user");
    const lastUserMessage =
      userMessages.length > 0
        ? userMessages[userMessages.length - 1].content
        : "";

    // Get conversation context (excluding system messages)
    const conversationContext = messages
      .filter((msg) => msg.role !== "developer")
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n\n");

    // For streaming responses, check if this is a data query that should be handled by SQL Builder
    if (isStreaming) {
      // Quick early check for common greetings and simple messages
      // These should never be routed to the SQL Builder
      const simpleGreetings = [
        "hi", "hello", "hey", "hi there", "hello there", "hey there", 
        "good morning", "good afternoon", "good evening", "greetings"
      ];
      
      if (lastUserMessage && 
          (simpleGreetings.includes(lastUserMessage.toLowerCase()) || 
           lastUserMessage.length < 10)) {
        // Simple greeting detected, skip SQL routing and proceed with general chat
        console.log(`Simple greeting detected: "${lastUserMessage}" → GENERAL (bypassed routing)`);
        // Continue to regular chat completion after this if block (don't enter the else block)
      } else {
        // Proceed with LLM-based routing for more complex queries
        const openaiClient = getOpenAIClient();

        // Use Responses API for routing decision
        const routingResponse = await openaiClient.responses.create({
          model: "gpt-4o",
          input: [
            {
              role: "developer",
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
                       
                       DO NOT route to the database for:
                       - General questions about advertising concepts
                       - How-to questions
                       - Strategy advice
                       - Simple greetings or casual conversation
                       - Questions about industry benchmarks or trends
                       
                       Respond with just one word: either "DATA" or "GENERAL".`
            },
            {
              role: "user",
              content: `User message: "${lastUserMessage}"
                       
                       Previous conversation context (if any):
                       ${conversationContext.length > 0 ? conversationContext : "No previous context"}`
            }
          ],
          max_output_tokens: 10, // Very short response needed
          temperature: 0.0, // Zero temperature for deterministic response
          text: {
            format: {
              type: "text"
            }
          },
          reasoning: {},
          store: true
        });

        // Get routing decision
        const routingDecision = routingResponse.output_text?.trim().toUpperCase() || "";
        console.log(`Routing decision for "${lastUserMessage}": ${routingDecision}`);

        if (routingDecision === "DATA") {
          // Handle as data query with SQL Builder
          await handleDataQuery(
            conversationId,
            userId,
            res!,
            lastUserMessage,
            conversationContext,
          );
          return; // Exit early as response was handled in handleDataQuery
        }
        // If not a data query, continue with regular chat completion below
      }
    }
    // ----- END INTELLIGENT QUERY HANDLING -----

    // Initialize OpenAI client
    const openaiClient = getOpenAIClient();

    // Configure SSE headers for streaming
    if (isStreaming) {
      res!.setHeader("Content-Type", "text/event-stream");
      res!.setHeader("Cache-Control", "no-cache");
      res!.setHeader("Connection", "keep-alive");
    }

    console.log("Creating chat completion with OpenAI GPT-4o...");
    console.log(
      `Mode: ${isStreaming ? "Streaming" : "Non-streaming welcome message"}`,
    );

    // Convert to the format expected by the Responses API
    // System prompt goes into the developer role at the beginning of the array
    const inputMessages = [
      { role: "developer" as MessageRole, content: systemPrompt },
      ...messages
    ];

    console.log("Messages being sent to OpenAI:", JSON.stringify(inputMessages, null, 2));

    // For welcome messages we can use non-streaming for simplicity
    if (!isStreaming) {
      // Non-streaming completion for welcome messages
      const welcomeResponse = await openaiClient.responses.create({
        model: "gpt-4o",
        input: inputMessages,
        temperature: 0.7,
        max_output_tokens: 500, // Welcome messages can be shorter
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        store: true
      });

      const welcomeMessage = welcomeResponse.output_text || "";

      // Save welcome message to database
      const messageData: MessageData = {
        conversationId,
        role: "assistant" as const,
        content: welcomeMessage,
        metadata: {
          isWelcomeMessage: true,
        },
      };

      // Save welcome message to database
      await storage.createChatMessage(messageData);
      console.log("Welcome message saved successfully");
      return;
    }

    // For streaming responses
    let contentAccumulator = "";

    try {
      // Use the stream API
      const stream = await openaiClient.beta.chat.completions.stream({
        model: "gpt-4o",
        messages: inputMessages.map(msg => ({
          role: msg.role === "developer" ? "system" : msg.role,
          content: msg.content
        })),
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      });

      // Log the stream creation
      console.log("Stream created, sending chunks to client...");

      // Handle the streaming response
      for await (const chunk of stream) {
        // Get the delta content if available
        if (chunk.choices[0]?.delta?.content) {
          const chunkText = chunk.choices[0].delta.content;
          contentAccumulator += chunkText;
          
          // Send chunk to client
          res!.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
        }
      }

      // Send completion signal to client
      res!.write("data: [DONE]\n\n");
      res!.end();

      // Log completion of stream
      console.log("Stream completed, saving response to database...");

      // Save the complete assistant response to database
      const messageData: MessageData = {
        conversationId,
        role: "assistant" as const,
        content: contentAccumulator,
      };

      const assistantMessage = await storage.createChatMessage(messageData);
      console.log("AI response saved successfully with ID:", assistantMessage.id);
    } catch (streamError) {
      console.error("Error in streaming response:", streamError);
      
      // Try the non-streaming approach as a fallback
      console.log("Falling back to non-streaming response");
      const fallbackResponse = await openaiClient.responses.create({
        model: "gpt-4o",
        input: inputMessages,
        temperature: 0.7,
        max_output_tokens: 1000,
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        store: true
      });

      const responseContent = fallbackResponse.output_text || "I'm sorry, I couldn't generate a proper response.";
      
      // Send the full response to the client
      res!.write(`data: ${JSON.stringify({ content: responseContent })}\n\n`);
      res!.write("data: [DONE]\n\n");
      res!.end();

      // Save to database
      const messageData: MessageData = {
        conversationId,
        role: "assistant" as const,
        content: responseContent,
        metadata: {
          fallbackResponse: true
        }
      };

      await storage.createChatMessage(messageData);
      console.log("Fallback response saved successfully");
    }
  } catch (error) {
    console.error("Error in streamChatCompletion:", error);

    if (isStreaming) {
      // Send error message to client
      res!.write(
        `data: ${JSON.stringify({
          content:
            "I'm sorry, I encountered an error while generating a response. Please try again or contact support if the issue persists.",
        })}\n\n`,
      );
      res!.write("data: [DONE]\n\n");
      res!.end();

      // Save error message to database
      const messageData: MessageData = {
        conversationId,
        role: "assistant" as const,
        content:
          "I'm sorry, I encountered an error while generating a response. Please try again or contact support if the issue persists.",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      };

      await storage.createChatMessage(messageData);
    }
  }
}

/**
 * Get the latest conversation history for OpenAI completion
 * @param conversationId - The ID of the conversation
 * @param maxTokens - Optional max number of tokens to consider
 * @returns Array of messages formatted for OpenAI
 */
export async function getConversationHistory(
  conversationId: string,
  maxTokens?: number
): Promise<OpenAIMessage[]> {
  // Get messages for the conversation
  const messages = await storage.getChatMessages(conversationId);

  // Sort messages by createdAt to ensure proper order
  messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Map database messages to OpenAI message format
  // Note: 'system' role from database is mapped to 'developer' for Responses API
  const formattedMessages: OpenAIMessage[] = messages.map((msg) => ({
    role: msg.role === 'system' ? 'developer' as MessageRole : msg.role as MessageRole,
    content: msg.content
  }));

  return formattedMessages;
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
  // For welcome messages, we only send the system prompt
  // No user messages are needed
  const messages: OpenAIMessage[] = [];
  
  // Start the streaming process (with null for res because it's non-streaming)
  await streamChatCompletion(conversationId, null, messages);
}