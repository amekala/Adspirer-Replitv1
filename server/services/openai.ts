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

// Define the proper types for streaming response objects
export interface ResponseTextDeltaEvent {
  type: 'text_delta';
  output_text: string;
}

export interface ResponseFinishEvent {
  type: 'finish';
  output_text: string;
  usage: {
    output_tokens: number;
    prompt_tokens: number;
  };
}

export type ResponseStreamEvent = ResponseTextDeltaEvent | ResponseFinishEvent;
export interface OpenAIMessage {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
}

// Options for chat completion
export interface ChatCompletionOptions {
  conversationId: string;
  userId: string;
  systemPrompt?: string;
}

// Interface for database message data
// Type for createChatMessage
interface MessageData {
  conversationId: string;
  role: "user" | "assistant"; // Database requires "user" or "assistant" at this time
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
  // Check if this is a meta-query asking about previous campaign selection
  const isSelectionExplanationQuery = query.toLowerCase().match(/(why|how).*(pick|chose|select|unique|special|only|criteria)/);
    
  if (isSelectionExplanationQuery) {
    console.log(`Handling selection explanation query: "${query}" with ${conversationContext ? "context" : "no context"}`);
  } else {
    console.log(`Handling data query: "${query}" with ${conversationContext ? "context" : "no context"}`);
  }

  try {
    // Send a thinking message to the client, with different wording based on query type
    if (isSelectionExplanationQuery) {
      res.write(
        `data: ${JSON.stringify({
          content: "I'm looking at the selection criteria behind these campaigns...",
        })}\n\n`,
      );
    } else {
      res.write(
        `data: ${JSON.stringify({
          content: "I'm analyzing your campaign data...",
        })}\n\n`,
      );
    }

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
            content: `You are an engaging advertising campaign advisor with a friendly, conversational personality.
                     Format the following campaign data into an insightful, personable response that tells a compelling story.
                     
                     CRITICAL INSTRUCTIONS:
                     1. ONLY use the exact data provided to you. DO NOT add, modify, or invent any metrics.
                     2. If the data appears incomplete or suspicious, mention this fact rather than filling gaps.
                     3. Use the exact campaign IDs and numeric values from the data - never round numbers.
                     4. If values appear unusual (e.g., very high or low), note this but do not change them.
                     5. Do not invent explanations for patterns unless clearly evident in the data.
                     6. CTR values should be shown with % symbol and exactly one decimal place.
                     7. Format ROAS values with an 'x' suffix to represent as a ratio (e.g., "9.98x").
                     8. Only calculate metrics for campaigns mentioned in the context, never for random campaign IDs.
                     
                     STORYTELLING & NARRATIVE REQUIREMENTS:
                     1. Frame data within a clear narrative structure (setup → insight → implication)
                     2. Connect current data to historical trends or industry benchmarks when appropriate
                     3. Use vivid, descriptive language for campaign performance (e.g., "skyrocketing clicks" vs. "increased clicks")
                     4. Create "bridging statements" between data points to make the narrative flow smoothly
                     5. Include a clear "key takeaway" or main insight from the data
                     
                     CONTEXTUAL AWARENESS:
                     1. Maintain memory of campaign IDs, metrics, and time periods from previous messages
                     2. Understand references like "it," "that campaign," or "those metrics" by context
                     3. Refer to previously mentioned campaigns by name/ID for continuity
                     4. Acknowledge how new data relates to previously discussed insights
                     
                     SELECTION CRITERIA EXPLANATION:
                     1. If selection criteria are provided, clearly explain WHY certain campaigns were selected
                     2. Use selection criteria to frame your narrative and storytelling
                     3. Make selection criteria part of your explanation to help the user understand the data story
                     4. Connect selection criteria to user's original query to show reasoning
                     5. Make the explanation of criteria sound natural, not technical
                     
                     CONVERSATION & PERSONALITY REQUIREMENTS:
                     1. Be conversational and friendly - sound like a curious colleague, not a data report
                     2. Ask 2-3 specific follow-up questions that suggest next analytical directions
                     3. Show appropriate emotion when metrics are good ("Great news!") or concerning
                     4. Use the user's language style and match their level of formality/casualness
                     5. Be curious about the "why" behind the metrics, not just the numbers themselves
                     6. Suggest what they might want to look at next based on the current data
                     7. Sound curious and ask follow-up questions to keep the conversation going
                     8. Briefly mention why this data might be important to their business goals
                     9. ALWAYS end with an open-ended question that invites further discussion
                     
                     Formatting guidelines:
                     1. Present the data in a clear, easy-to-understand format
                     2. Use bullet points, tables, or other formatting to make the data readable
                     3. Highlight any insights visible in the actual data
                     4. Do NOT mention SQL or databases - present as if you analyzed the data yourself
                     5. Keep the tone professional yet friendly and conversational
                     6. Make sure monetary values are formatted appropriately (with currency symbols)
                     7. Break up your response with short paragraphs - avoid large text blocks`
          },
          {
            role: "user",
            content: `The user asked: "${query}"
                     
                     Here is the EXACT campaign data that must be used (do not modify these values):
                     ${JSON.stringify(sqlResult.data, null, 2)}
                     
                     ${sqlResult.selectionMetadata ? `SELECTION CRITERIA: ${sqlResult.selectionMetadata.selectionCriteria}` : ''}
                     ${revenueInfo ? `The user mentioned revenue is ${revenueInfo.currency}${revenueInfo.value}` : ""}
                     ${campaignIds.length > 0 ? `The conversation mentioned these campaign IDs: ${campaignIds.join(", ")}` : ""}
                     
                     ${isSelectionExplanationQuery ? "The user wants to understand WHY specific campaigns were selected. Explain the criteria thoroughly." : ""}
                     
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

    // Save the assistant's response to the database with enhanced metadata
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
        fromFallback: sqlResult.fromFallback || false,
        revenueApplied: revenueInfo !== null,
        revenueValue: revenueInfo ? revenueInfo.value : null,
        mentionedCampaignIds: campaignIds.length > 0 ? campaignIds : [],
        // Add selection criteria metadata if available
        selectionCriteria: sqlResult.selectionMetadata ? sqlResult.selectionMetadata.selectionCriteria : null,
        originalQuery: sqlResult.selectionMetadata ? sqlResult.selectionMetadata.originalQuery : query,
        // Track dates and time periods to improve future contextual responses
        detectedTimeFrame: sqlResult.data && sqlResult.data.length > 0 && sqlResult.data[0].date ? 
          {start: sqlResult.data[0].date, end: sqlResult.data[sqlResult.data.length-1].date} : null,
        // Track key metrics found in the data
        metricsFound: sqlResult.data && sqlResult.data.length > 0 ? 
          Object.keys(sqlResult.data[0]).filter(key => 
            ['impressions', 'clicks', 'cost', 'ctr', 'roas', 'conversions'].includes(key)
          ) : [],
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
        // Include the original query for debugging purposes
        originalQuery: query,
        isSelectionExplanationQuery: isSelectionExplanationQuery || false,
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
  userId: string,
  res: Response | null,
  messages?: OpenAIMessage[],
  systemPrompt: string = `You are a friendly, conversational AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You're a knowledgeable expert with a warm, engaging personality who understands both the data side and human side of advertising campaigns.
  
KEY CONVERSATION GUIDELINES:
1. Be genuinely conversational and personable - interact like a helpful colleague, not a data report
2. ALWAYS ask clarifying questions when the user's request is vague or could be interpreted in multiple ways
3. Show authentic enthusiasm for good results and appropriate concern for poor metrics
4. Express interest in the user's business and their challenges/successes
5. Match the user's tone, style, and level of formality in your responses
6. ALWAYS end your responses with an open-ended question to continue the conversation
7. When the user shares information (like revenue per conversion), acknowledge it enthusiastically

STORYTELLING CAPABILITIES:
1. Frame data within narrative structures rather than just listing metrics
2. Use "bridging statements" to connect data points to performance trends
3. Compare metrics to industry benchmarks when relevant (e.g., "Your CTR is above the retail industry average")
4. Use vivid, descriptive language to characterize performance (e.g., "Your campaign is showing remarkable efficiency")
5. Offer narrative-driven insights based on the data patterns you observe
6. Include a clear "key takeaway" or main insight from each analysis
7. Relate metrics to business outcomes (e.g., "This higher CTR suggests your ad copy is resonating with customers")

CONTEXTUAL AWARENESS:
1. Track and reference specific campaign IDs mentioned in previous messages
2. Maintain awareness of mentioned metrics and time periods across the conversation
3. Use campaign names consistently once identified
4. When user mentions "it" or "this campaign", refer back to previously discussed campaigns
5. Remember revenue information provided by user and apply it to campaign discussions
6. Understand references like "it," "that campaign," or "those metrics" from conversation context
7. Acknowledge how new data relates to previously discussed insights
8. When a user refers to "performance" without specifying metrics, ask which specific KPIs they're interested in
9. If the user asks about "campaigns" without specifics, ask which campaigns they want to know about
10. ALWAYS EXPLAIN YOUR REASONING when the user asks about your previous responses or selections
11. When the user asks "why" questions about your previous responses, clearly explain the criteria or methodology you used
12. If the user asks about your selection of campaigns or data points, explain exactly what factors guided that selection

FORMATTING AND TECHNICAL GUIDELINES:
1. ALWAYS present ROAS (Return on Ad Spend) as a ratio with the "x" suffix (e.g., "9.98x" not "998%")
2. Compare ROAS values properly (e.g., "ROAS increased from 4.2x to 9.8x")
3. When a user mentions revenue or sales figures, apply this information to analyze the campaigns
4. If a question is ambiguous about time period, ask them to specify a date range
5. Ask follow-up questions that suggest next analytical directions, such as:
   - "Would you like to see how these campaigns compare to your other campaigns?"
   - "Should we look at which ad creative is driving the highest CTR?"
   - "Would you like to understand what factors might be affecting this change in performance?"

EXAMPLES OF GOOD RESPONSES:
1. "Great news! Your Campaign 12345 is showing a strong ROAS of 5.2x, which is above industry average. This means you're earning $5.20 for every $1 spent - an excellent return in the retail space. What specific aspect of this campaign would you like to dig into next?"
2. "I notice your click-through rate has dropped by 0.5% since last week for the campaigns you mentioned. This could indicate several things, such as ad fatigue or changing market conditions. Would you like me to analyze what might be causing this change?"
3. "Thanks for sharing that information! $15 per conversion will help me calculate more meaningful ROAS for your campaigns. Looking at Campaign 87654, with this conversion value, your ROAS is actually 3.2x - a solid performer. Would you like to see which of your campaigns is getting the best return based on this value?"`,
): Promise<void> {
  // Determine if this is a streaming response (with res object) or non-streaming (welcome message)
  const isStreaming = !!res;

  try {
    // Get the current conversation 
    const conversation = await storage.getChatConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    // If no messages were provided, fetch them from the database
    if (!messages || !Array.isArray(messages)) {
      console.log("No messages provided, fetching from database");
      messages = await getConversationHistory(conversationId);
    }

    console.log("Generating chat completion for conversation:", conversationId);
    console.log("Retrieved", messages.length, "messages for chat completion context");

    // ----- INTELLIGENT QUERY HANDLING -----
    // Get the most recent user message
    const userMessages = messages.filter((msg) => msg.role === "user");
    const lastUserMessage =
      userMessages.length > 0
        ? userMessages[userMessages.length - 1].content
        : "";

    // Generate enhanced conversation context with structured information
    let conversationContext = "";
    let structuredContext = {
      mentionedCampaignIds: [] as string[],
      timeFrames: [] as {start?: string, end?: string, description?: string}[],
      revenue: null as {value: number, currency: string} | null,
      metrics: [] as string[],
      recentTopics: [] as string[]
    };
    
    // Process messages to extract structured context information
    for (const msg of messages.filter((m: OpenAIMessage) => m.role !== "developer")) {
      // Add the basic message content
      conversationContext += `${msg.role}: ${msg.content}\n\n`;
      
      // We need to use type assertions because TypeScript doesn't know the structure
      // of the metadata object that might be present in the message
      const msgWithMetadata = msg as unknown as { 
        role: string;
        content: string;
        metadata?: { 
          mentionedCampaignIds?: string[];
          detectedTimeFrame?: { start?: string; end?: string; description?: string };
          revenueApplied?: boolean;
          revenueValue?: number;
          metricsFound?: string[];
        } 
      };
      
      // Extract additional structured information if this is an assistant message with metadata
      if (msg.role === "assistant" && msgWithMetadata.metadata) {
        const metadata = msgWithMetadata.metadata;
        
        // Track campaign IDs mentioned
        if (metadata.mentionedCampaignIds && Array.isArray(metadata.mentionedCampaignIds)) {
          structuredContext.mentionedCampaignIds = [
            ...structuredContext.mentionedCampaignIds,
            ...metadata.mentionedCampaignIds.filter((id: string) => 
              !structuredContext.mentionedCampaignIds.includes(id)
            )
          ];
        }
        
        // Track time frames
        if (metadata.detectedTimeFrame) {
          structuredContext.timeFrames.push(metadata.detectedTimeFrame);
        }
        
        // Track revenue information
        if (metadata.revenueApplied && metadata.revenueValue !== undefined) {
          structuredContext.revenue = {
            value: metadata.revenueValue,
            currency: "$" // Default for now
          };
        }
        
        // Track metrics discussed
        if (metadata.metricsFound && Array.isArray(metadata.metricsFound)) {
          structuredContext.metrics = [
            ...structuredContext.metrics,
            ...metadata.metricsFound.filter((metric: string) => !structuredContext.metrics.includes(metric))
          ];
        }
      }
      
      // Also check user messages for revenue information
      if (msg.role === "user") {
        const revenueMatch = msg.content.match(/revenue\s+is\s+\$?(\d+)/i);
        if (revenueMatch && revenueMatch[1]) {
          structuredContext.revenue = {
            value: parseFloat(revenueMatch[1]),
            currency: "$"
          };
        }
        
        // Extract campaign IDs from user messages
        const campaignIdRegex = /Campaign\s+(?:ID)?\s*[:\s]+(\d{8,})/gi;
        let match;
        while ((match = campaignIdRegex.exec(msg.content)) !== null) {
          if (match[1] && !structuredContext.mentionedCampaignIds.includes(match[1])) {
            structuredContext.mentionedCampaignIds.push(match[1]);
          }
        }
      }
    }
    
    // Add structured context summary to the conversation context
    conversationContext += "\n--- CONVERSATION SUMMARY ---\n";
    if (structuredContext.mentionedCampaignIds.length > 0) {
      conversationContext += `Previously mentioned campaign IDs: ${structuredContext.mentionedCampaignIds.join(", ")}\n`;
    }
    
    if (structuredContext.timeFrames.length > 0) {
      conversationContext += "Time periods discussed: ";
      structuredContext.timeFrames.forEach((tf, i) => {
        if (tf.description) {
          conversationContext += tf.description;
        } else if (tf.start && tf.end) {
          conversationContext += `${tf.start} to ${tf.end}`;
        }
        conversationContext += i < structuredContext.timeFrames.length - 1 ? ", " : "\n";
      });
    }
    
    if (structuredContext.revenue) {
      conversationContext += `Revenue per conversion: ${structuredContext.revenue.currency}${structuredContext.revenue.value}\n`;
    }
    
    if (structuredContext.metrics.length > 0) {
      conversationContext += `Metrics discussed: ${structuredContext.metrics.join(", ")}\n`;
    }
    
    console.log("Enhanced conversation context created with structured information");

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
                       1. Campaign data from the database (using SQL) - respond with "DATA"
                       2. General knowledge or conversational responses - respond with "GENERAL"
                       
                       ONLY route to "DATA" if the user is CLEARLY asking for NEW information about:
                       - Current campaign performance or metrics
                       - Specific data analysis about their ad accounts
                       - Reports on impressions, clicks, costs, etc. requiring fresh data
                       
                       Examples of valid DATA queries:
                       - "How are my Amazon campaigns performing right now?"
                       - "What was my CTR last week?"
                       - "Show me my campaigns with the highest ROAS"
                       - "Which of my Google ads had the most impressions yesterday?"
                       
                       DO NOT route to DATA (use GENERAL instead) for:
                       - Questions about previous responses ("why did you say X?")
                       - Clarifications about data already provided ("what does this mean?")
                       - Questions about the conversation itself
                       - General advertising concepts or strategy
                       - Simple greetings or casual conversation
                       - Meta-discussion about previous answers
                       - Requests to summarize the conversation
                       - Questions that start with "I'm confused..." or similar phrases
                       - Questions that refer to "you" (the assistant) rather than campaigns
                       - Questions that ask for explanation rather than new data
                       
                       Respond with EXACTLY one word only: either "DATA" or "GENERAL".`
            },
            {
              role: "user",
              content: `User message: "${lastUserMessage}"
                       
                       Previous conversation context (if any):
                       ${conversationContext.length > 0 ? conversationContext : "No previous context"}`
            }
          ],
          max_output_tokens: 1000, // Very short response needed
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

      // Use string indexing for type safety since the API types might not match actual response
      let welcomeMessage = "";
      if (typeof welcomeResponse === 'object' && welcomeResponse !== null) {
        // Try to get the text from various possible locations in the response
        welcomeMessage = 
          (typeof welcomeResponse['text'] === 'string' ? welcomeResponse['text'] : '') || 
          (typeof welcomeResponse['output_text'] === 'string' ? welcomeResponse['output_text'] : '') || 
          "Hi there! 👋 I'm your friendly Adspirer assistant, ready to help you get the most from your advertising campaigns. I can analyze your campaign data, help you understand performance metrics, or just chat about digital advertising strategy. What would you like to explore today?";
      }

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
      // Use the Responses API with streaming
      const stream = await openaiClient.responses.create({
        model: "gpt-4o",
        input: inputMessages,
        temperature: 0.7,
        max_output_tokens: 1000,
        stream: true,
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        store: true
      });

      // Log the stream creation
      console.log("Stream created, sending chunks to client...");

      // Handle the streaming response
      for await (const chunk of stream) {
        // Handle chunks using string indexing since TypeScript definitions may not match
        if (chunk && typeof chunk === 'object') {
          const chunkType = typeof chunk['type'] === 'string' ? chunk['type'] : '';
          
          // Handle text delta events (new content being added)
          if (chunkType.includes('delta')) {
            // Try to extract delta text from various possible places in the response
            let deltaText = '';
            
            // Check various properties where text might be found
            if ('text' in chunk && typeof chunk['text'] === 'string') {
              deltaText = chunk['text'];
            } else if ('output_text' in chunk && typeof chunk['output_text'] === 'string') { 
              deltaText = chunk['output_text'];
            } else if ('content' in chunk && typeof chunk['content'] === 'string') {
              deltaText = chunk['content'];
            } else if ('delta' in chunk && typeof chunk['delta'] === 'object' && chunk['delta'] !== null) {
              // Some APIs return the delta text nested in a delta object
              const delta = chunk['delta'];
              if ('text' in delta && typeof delta['text'] === 'string') {
                deltaText = delta['text'];
              } else if ('content' in delta && typeof delta['content'] === 'string') {
                deltaText = delta['content'];
              }
            }
            
            if (deltaText) {
              // Add the new text to our accumulator
              contentAccumulator += deltaText;
              
              // Send chunk to client
              res!.write(`data: ${JSON.stringify({ content: deltaText })}\n\n`);
            }
          }
          // Handle finish events (stream complete)
          else if (chunkType.includes('finish') || chunkType.includes('done')) {
            // Try to extract the full final text from the finish event
            let finalText = '';
            
            if ('text' in chunk && typeof chunk['text'] === 'string') {
              finalText = chunk['text'];
            } else if ('output_text' in chunk && typeof chunk['output_text'] === 'string') {
              finalText = chunk['output_text'];
            } else if ('content' in chunk && typeof chunk['content'] === 'string') {
              finalText = chunk['content'];
            }
            
            // If we got a full final text that's different from our accumulator,
            // send the remaining part to the client
            if (finalText && finalText !== contentAccumulator) {
              // Only send the part we haven't sent yet
              const remainingText = finalText.substring(contentAccumulator.length);
              if (remainingText) {
                contentAccumulator = finalText;
                res!.write(`data: ${JSON.stringify({ content: remainingText })}\n\n`);
              }
            }
          }
        }
      }

      // Send completion signal to client
      res!.write("data: [DONE]\n\n");
      res!.end();

      // Log completion of stream
      console.log("Stream completed, saving response to database...");

      // Analyze message for topics and important context
      const topicKeywords = [
        'campaign', 'advertising', 'performance', 'metrics',
        'ctr', 'clicks', 'impressions', 'cost', 'roas', 'conversions',
        'amazon', 'google', 'retail', 'optimization'
      ];
      
      // Extract identifiable topics from the response
      const detectedTopics = topicKeywords.filter(keyword => 
        contentAccumulator.toLowerCase().includes(keyword)
      );
      
      // Save the complete assistant response to database with enhanced metadata
      const messageData: MessageData = {
        conversationId,
        role: "assistant" as const,
        content: contentAccumulator,
        metadata: {
          // Store these topics for future context
          detectedTopics: detectedTopics,
          // Extract any campaign IDs mentioned in the response
          mentionedCampaignIds: (contentAccumulator.match(/\b\d{8,}\b/g) || []),
          // Track whether this response included follow-up questions
          includesFollowUp: contentAccumulator.includes('?'),
          // Try to extract time periods mentioned (simple extraction)
          timeReferences: [
            ...(contentAccumulator.match(/\b(yesterday|today|this week|last week|this month|last month)\b/gi) || []),
            ...(contentAccumulator.match(/\b\d{4}-\d{2}-\d{2}\b/g) || [])  // ISO date format
          ],
        }
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

      // Get response text using string indexing for safety
      let responseContent = "I'm sorry, I couldn't generate a proper response.";
      if (typeof fallbackResponse === 'object' && fallbackResponse !== null) {
        responseContent = 
          (typeof fallbackResponse['text'] === 'string' ? fallbackResponse['text'] : '') || 
          (typeof fallbackResponse['output_text'] === 'string' ? fallbackResponse['output_text'] : '') || 
          responseContent;
      }
      
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
/**
 * Rough estimate of token count for a string
 * This is a very simple estimator that can be replaced with a more accurate one
 * like tiktoken if needed.
 */
function estimateTokenCount(text: string): number {
  // Roughly 4 characters per token for English text
  return Math.ceil(text.length / 4);
}

/**
 * Get the conversation history for OpenAI completion
 * @param conversationId - The ID of the conversation
 * @param maxTokens - Optional max number of tokens to consider (default: 12000)
 * @param minExchanges - Minimum number of conversation exchanges to keep (default: 15)
 * @returns Array of messages formatted for OpenAI
 */
export async function getConversationHistory(
  conversationId: string,
  maxTokens: number = 12000,  // Higher default to ensure we keep more context
  minExchanges: number = 15   // Minimum conversation turns to maintain
): Promise<OpenAIMessage[]> {
  console.log(`Loading conversation history for ${conversationId}`);
  
  // Get messages for the conversation
  const messages = await storage.getChatMessages(conversationId);

  // Sort messages by createdAt to ensure proper order
  messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Map database messages to OpenAI message format
  // Note: 'system' role from database is mapped to 'developer' for Responses API
  const formattedMessages: OpenAIMessage[] = messages.map((msg) => {
    // Make sure content is a string to prevent [object Object] in the UI
    const content = typeof msg.content === 'string' ? msg.content : 
                   (msg.content ? JSON.stringify(msg.content) : '');
    
    // Create the message with proper typing for metadata
    let formattedMsg: OpenAIMessage = {
      role: msg.role === 'system' ? 'developer' as MessageRole : msg.role as MessageRole,
      content: content
    };
    
    // Add metadata if it exists and is an object
    if (msg.metadata && typeof msg.metadata === 'object') {
      // Parse JSON metadata properly to avoid type issues
      try {
        const typedMetadata: Record<string, any> = 
          typeof msg.metadata === 'string' 
            ? JSON.parse(msg.metadata) 
            : msg.metadata as Record<string, any>;
        
        formattedMsg.metadata = typedMetadata;
      } catch (e) {
        console.warn("Failed to parse message metadata:", e);
      }
    }
    
    return formattedMsg;
  });

  // Calculate total number of exchanges (user + assistant message pairs)
  // This helps ensure we keep coherent conversation turns
  const exchanges = Math.floor(formattedMessages.filter(m => m.role === 'user').length);
  console.log(`Conversation has ${exchanges} complete exchanges`);

  // If we need to truncate the context due to token limits,
  // we'll do it by removing oldest messages first but preserving
  // at least minExchanges recent exchanges
  if (maxTokens) {
    let totalTokens = 0;
    let tokensPerMessage: number[] = [];
    
    // Calculate tokens for each message
    formattedMessages.forEach(msg => {
      const tokens = estimateTokenCount(msg.content);
      tokensPerMessage.push(tokens);
      totalTokens += tokens;
    });
    
    console.log(`Estimated total tokens for full conversation: ${totalTokens}`);
    
    // If we exceed the token limit, trim older messages
    if (totalTokens > maxTokens) {
      // Start from the end and work backwards to count how many
      // messages we can keep within the token limit
      let runningTotal = 0;
      let keepCount = 0;
      
      // First, count the most recent 2*minExchanges messages (to ensure we keep coherent turns)
      // that we want to absolutely preserve
      const preserveCount = Math.min(formattedMessages.length, minExchanges * 2);
      
      // Count tokens from the end of the array (most recent messages)
      for (let i = formattedMessages.length - 1; i >= Math.max(0, formattedMessages.length - preserveCount); i--) {
        runningTotal += tokensPerMessage[i];
        keepCount++;
      }
      
      // If we have token budget left, keep adding more messages
      for (let i = formattedMessages.length - preserveCount - 1; i >= 0; i--) {
        if (runningTotal + tokensPerMessage[i] > maxTokens) {
          break;
        }
        runningTotal += tokensPerMessage[i];
        keepCount++;
      }
      
      // Ensure we keep at least the minimum required exchanges if possible
      // by adjusting token length per message if needed
      if (keepCount < minExchanges * 2 && formattedMessages.length >= minExchanges * 2) {
        keepCount = minExchanges * 2;
        console.log(`Forcing to keep minimum ${keepCount} messages to maintain context`);
      }
      
      // Slice to keep the most recent 'keepCount' messages
      const keptMessages = formattedMessages.slice(-keepCount);
      
      console.log(`Truncated conversation from ${formattedMessages.length} to ${keptMessages.length} messages to fit within token limit`);
      console.log(`Keeping approximately ${runningTotal} tokens out of original ${totalTokens}`);
      
      return keptMessages;
    }
  }

  console.log(`Returning ${formattedMessages.length} messages for conversation context`);
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
  // For welcome messages, we send a comprehensive system prompt
  // that encourages interactive conversation and explains capabilities
  const messages: OpenAIMessage[] = [
    {
      role: "developer",
      content: `You are a friendly, conversational AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You're a knowledgeable expert with a warm, engaging personality who understands both the data side and human side of advertising campaigns.
      
Your capabilities include:
- Analyzing campaign metrics like CTR, impressions, clicks, conversions, and ROAS
- Answering questions about campaign performance 
- Explaining what the metrics mean in an easy-to-understand way
- Providing insights and trends from campaign data
- Comparing campaigns to identify top performers
- Suggesting optimization strategies based on data
- Generating narrative-driven insights from complex campaign data

KEY CONVERSATION GUIDELINES:
1. Be genuinely conversational and personable - interact like a helpful colleague, not a data report
2. Show authentic enthusiasm for good results and appropriate concern for poor metrics
3. Express interest in the user's business and their challenges/successes
4. Match the user's tone, style, and level of formality in your responses
5. ALWAYS end your responses with an open-ended question to continue the conversation
6. When the user shares information (like revenue per conversion), acknowledge it enthusiastically
7. Ask clarifying questions when requests are ambiguous or could have multiple interpretations

ADVANCED STORYTELLING TECHNIQUES:
1. Frame data within a narrative structure (setup → insight → implication)
2. Connect data points with "bridging statements" to make narratives flow smoothly
3. Include a clear "key takeaway" or main insight from each analysis
4. Use vivid language when describing performance (e.g., "skyrocketing CTR" vs. "increased CTR")
5. Relate metrics to business outcomes (e.g., "This higher CTR suggests your ad copy is resonating with customers")
6. Reference industry standards or benchmarks when appropriate (e.g., "Your 2.5% CTR is above the retail industry average")

TECHNICAL GUIDELINES:
1. Present ROAS as a ratio (e.g., "9.98x") rather than as a percentage 
2. When a user mentions revenue or sales figures, apply this information to analyze the campaigns
3. Always explain your thinking step by step before drawing conclusions
4. Use data visualizations when possible to make information easier to understand
5. Ask follow-up questions that suggest next analytical directions

Your first message should be friendly, welcoming, emphasize your narrative-driven approach to analytics, and ask how you can help them with their advertising campaigns today.`
    }
  ];
  
  // Start the streaming process with null for res because it's non-streaming
  const res = null as unknown as Response;
  await streamChatCompletion(conversationId, userId, res, messages);
}