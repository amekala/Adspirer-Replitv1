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
import { amazonCampaignTools } from "../functions/amazon-campaign";
import { handleFunctionCall } from "../functions/handler";
import { 
  ChatCompletionMessageParam, 
  ChatCompletionTool, 
  ChatCompletionToolMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageToolCall
} from "openai/resources/chat/completions";

// Types for message roles in the OpenAI API
export type MessageRole = "user" | "assistant" | "developer" | "system" | "tool";

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

// Interface for messages to be sent to OpenAI API - use ChatCompletionMessageParam when needed
export interface OpenAIMessage {
  role: MessageRole;
  content: string | null;
  // For tool calls and tool results
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    }
  }>;
  tool_call_id?: string;
}

// Interface for our internal message tracking that can include metadata
export interface InternalMessage extends OpenAIMessage {
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
  
  // The API key appears to be split across multiple lines - clean it up
  const cleanedApiKey = apiKey.replace(/\s+/g, '');
  
  console.log(`Initializing OpenAI client with API key starting with: ${cleanedApiKey.substring(0, 10)}...`);
  
  return new OpenAI({
    apiKey: cleanedApiKey
  });
}

/**
 * Handle a conversation and extract entities and campaign IDs for context
 */
function extractConversationContext(messages: OpenAIMessage[]): { 
  entities: Record<string, any[]>,
  campaignIds: string[]
} {
  const result: {
    entities: Record<string, any[]>,
    campaignIds: string[]
  } = {
    entities: {
      campaigns: [],
      adGroups: []
    },
    campaignIds: []
  };
  
  // Extract campaign IDs from messages
  for (const message of messages) {
    if (message.role === 'assistant' && typeof message.content === 'string') {
      // Extract campaign IDs
      const campaignIdRegex = /campaign(?:\s+(?:ID|id))?\s*[:#]\s*(\d{8,})/g;
      let match;
      while ((match = campaignIdRegex.exec(message.content)) !== null) {
        if (match[1] && !result.campaignIds.includes(match[1])) {
          result.campaignIds.push(match[1]);
        }
      }
      
      // Check for function call results in assistant messages
      if (message.content.includes('created successfully with ID')) {
        const campaignMatch = message.content.match(/campaign.*created successfully with ID (\d+)/i);
        if (campaignMatch && campaignMatch[1]) {
          result.entities.campaigns.push({
            id: campaignMatch[1],
            name: message.content.match(/campaign ["'](.+?)["']/i)?.[1] || 'Unknown'
          });
        }
        
        const adGroupMatch = message.content.match(/ad group.*created successfully with ID (\d+)/i);
        if (adGroupMatch && adGroupMatch[1]) {
          result.entities.adGroups.push({
            id: adGroupMatch[1],
            name: message.content.match(/ad group ["'](.+?)["']/i)?.[1] || 'Unknown'
          });
        }
      }
    }
  }
  
  return result;
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

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
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
                     6. When discussing trends, use specific quantitative changes (e.g., "CTR increased by 1.2%")
                     7. Use industry-specific interpretive frameworks to add context to the numbers
                     8. Frame metrics in terms of business outcomes, not just technical measurements
                     9. Create narrative continuity between this response and previous conversations
                     
                     CONTEXTUAL AWARENESS (CRITICAL):
                     1. Maintain explicit memory of campaign IDs, metrics, and time periods from previous messages
                     2. Properly resolve references like "it," "that campaign," or "those metrics" by context
                     3. When user references "the highest performing campaign" or similar, correctly identify which one
                     4. Apply revenue/conversion information from previous messages to relevant campaign discussions
                     5. If user mentions "yesterday's campaigns" or other temporal references, correctly connect to prior data
                     6. Track campaign IDs mentioned across the entire conversation history
                     7. Actively maintain context about which metrics were most important to the user
                     8. If user refers to "the conversion issue we discussed," recall the specific conversion problems
                     9. Recognize when current query is a follow-up to previous data discussion
                     10. Apply revenue data provided earlier to calculate metrics in current responses
                     
                     SELECTION CRITERIA EXPLANATION (CRITICAL):
                     1. ALWAYS explicitly explain WHY certain campaigns were selected for display
                     2. Use selection criteria as a primary framing element in your narrative
                     3. Connect the selection logic directly to the user's question
                     4. Explain in plain language what made these specific campaigns relevant to their query
                     5. If sorted by a metric, explain why that sort order matters in this context
                     6. If filtered by date range, clarify why that timeframe is relevant
                     7. Make the reasoning behind campaign inclusion/exclusion completely transparent
                     8. Proactively explain why other campaigns might have been excluded
                     9. When showing "top" campaigns, explain the specific metric used for ranking
                     10. If selection criteria includes complex logic, break it down into simple explanations
                     
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
        max_tokens: 3000,
        temperature: 0.3, // Lower temperature for more factual responses
      });

      // Extract the response content
      responseContent = response.choices[0]?.message?.content || "";
      
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

DATE HANDLING:
1. The current date is available via the get_current_date tool - use this as your reference when needed
2. Understand natural language dates from the user (e.g., "tomorrow", "next Monday", "April 10th")
3. Calculate the specific date based on the user's input and the current date as reference
4. **CRITICAL:** When calling any tool that requires a date (like create_amazon_sp_campaign), you MUST format the calculated date into the **YYYY-MM-DD** string format
5. Do not pass relative terms like "tomorrow" or "next week" to tools - always convert to YYYY-MM-DD
6. If a user provides a date without a year (e.g., "April 3rd"), assume the current year unless the date has clearly passed
7. When ambiguous, confirm the calculated date with the user before proceeding
8. If a user provides a date that is before the current date for a start date, point this out gently and ask for a valid future date
9. After the user confirms the dates, use the string date in YYYY-MM-DD format in your tool calls

CAMPAIGN CREATION CAPABILITIES:
1. You can help users create Amazon Sponsored Products campaigns through a series of guided questions
2. When users request to create a campaign, gather ALL necessary information conversationally
3. Do NOT ask only one question per turn. Ask for related details together (e.g., "Okay, let's set up your Sponsored Products campaign! What name, daily budget, and start date are you thinking of?")
4. Required information for a Manual Sponsored Products campaign includes: Campaign Name, Daily Budget, Start Date (End Date optional), Targeting Type (Manual/Auto), Ad Group Name, Ad Group Default Bid, Products (ASINs or SKUs), Keywords, Keyword Match Type, Negative Keywords (optional)
5. Guide the user naturally. If they provide multiple pieces of info at once, acknowledge them. If they miss something, ask for it specifically
6. Once you have gathered ALL required details, confirm them with the user
7. AFTER user confirmation, AND ONLY THEN, you MUST use the available tools (create_amazon_sp_campaign, create_amazon_ad_group, etc.) to make the API calls
8. You may need to make multiple tool calls sequentially based on the results
9. After the tools execute successfully, inform the user that the campaign setup is complete

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
  try {
    const openaiClient = getOpenAIClient();
    let conversation: ChatConversation | undefined;
    
    // Get or create a conversation
    try {
      conversation = await storage.getChatConversation(conversationId);
      
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw error;
    }
    
    // Get conversation history or use provided messages
    let historyMessages: OpenAIMessage[];
    
    if (messages) {
      historyMessages = messages;
    } else {
      try {
        historyMessages = await getConversationHistory(conversationId);
      } catch (error) {
        console.error("Error getting conversation history:", error);
        throw error;
      }
    }
    
    console.log(
      `Creating chat completion for conversation ${conversationId}. Retrieved ${historyMessages.length} messages.`
    );
    
    // Check if this might be a data query first, before checking for campaign creation intent
    const lastUserMessage = historyMessages
      .filter(m => m.role === "user")
      .pop()?.content || "";
    
    console.log(`Checking isDataQuery for: "${lastUserMessage}"`);
    const isData = SQLBuilder.isDataQuery(lastUserMessage);
    console.log(`isDataQuery result: ${isData}`);
    
    if (isData) {
      console.log("Routing to handleDataQuery...");
      // Get previous messages as context for data query
      const previousMessages = historyMessages
        .slice(0, historyMessages.length - 1)
        .map(m => typeof m.content === 'string' ? m.content : "")
        .join("\n");
      
      return await handleDataQuery(
        conversationId,
        userId,
        res as Response,
        lastUserMessage,
        previousMessages
      );
    }
    
    // Prepare system message
    const systemMessage: ChatCompletionMessageParam = {
      role: "system",
      content: systemPrompt
    };
    
    // Add system message to the start and convert OpenAIMessage[] to ChatCompletionMessageParam[]
    const fullMessages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...historyMessages.map(msg => {
        if (msg.role === "tool") {
          return {
            role: "tool" as const,
            content: msg.content || "",
            tool_call_id: msg.tool_call_id
          } as ChatCompletionToolMessageParam;
        } else if (msg.role === "user") {
          return {
            role: "user" as const,
            content: msg.content || ""
          };
        } else if (msg.role === "system") {
          return {
            role: "system" as const,
            content: msg.content || ""
          };
        } else {
          // assistant role
          if (msg.tool_calls && msg.tool_calls.length > 0) {
            return {
              role: "assistant" as const,
              content: msg.content,
              tool_calls: msg.tool_calls.map(tc => ({
                id: tc.id,
                type: "function" as const,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments
                }
              }))
            } as ChatCompletionAssistantMessageParam;
          } else {
            return {
              role: "assistant" as const,
              content: msg.content || ""
            };
          }
        }
      })
    ];
    
    // Extract context from the conversation history
    const conversationContext = extractConversationContext(historyMessages);
    
    // Add context note if there are campaign IDs or entities
    if (conversationContext.campaignIds.length > 0 || 
        conversationContext.entities.campaigns.length > 0 ||
        conversationContext.entities.adGroups.length > 0) {
      
      let contextNote = "Context from previous conversation:\n";
      
      if (conversationContext.campaignIds.length > 0) {
        contextNote += `Previously mentioned campaign IDs: ${conversationContext.campaignIds.join(", ")}\n`;
      }
      
      if (conversationContext.entities.campaigns.length > 0) {
        contextNote += "Created campaigns:\n";
        conversationContext.entities.campaigns.forEach(campaign => {
          contextNote += `- Campaign '${campaign.name}' with ID ${campaign.id}\n`;
        });
      }
      
      if (conversationContext.entities.adGroups.length > 0) {
        contextNote += "Created ad groups:\n";
        conversationContext.entities.adGroups.forEach(adGroup => {
          contextNote += `- Ad Group '${adGroup.name}' with ID ${adGroup.id}\n`;
        });
      }
      
      // Add context note as a system message right before the last user message
      const lastUserMessageIndex = fullMessages.findIndex(
        (m, i) => m.role === "user" && i === fullMessages.length - 1
      );
      
      if (lastUserMessageIndex > 0) {
        fullMessages.splice(lastUserMessageIndex, 0, {
          role: "system",
          content: contextNote
        });
      }
    }
    
    // Check if the conversation might need tools (campaign creation or management)
    const mightNeedTools = historyMessages.some(msg => {
      const internalMsg = msg as InternalMessage; // Cast to the internal type which has metadata
      if (internalMsg.metadata && 'isCampaignCreation' in internalMsg.metadata) {
        return true;
      }
      return typeof msg.content === 'string' && detectCampaignCreationIntent(msg.content);
    }) || /create campaign|add keyword|ad group|run a campaign/i.test(lastUserMessage);
      
    console.log(`Might need tools: ${mightNeedTools}`);
    
    // Convert amazonCampaignTools to the OpenAI expected format
    const toolsFormatted: ChatCompletionTool[] = amazonCampaignTools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
    
    // Create completion with the appropriate configuration
    const completion = mightNeedTools
      ? await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: fullMessages,
          tools: toolsFormatted,
          tool_choice: "auto",
          temperature: 0.7,
          stream: true,
        })
      : await openaiClient.chat.completions.create({
          model: "gpt-4o",
          messages: fullMessages,
          temperature: 0.7,
          stream: true
        });
    
    // Handle streaming response
    let responseMessage = "";
    let toolCalls: ChatCompletionMessageToolCall[] = [];
    
    // Initialize partial tool call tracking
    let currentToolCalls: Record<string, ChatCompletionMessageToolCall> = {};
    
    if (res) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    }
    
    // Process the stream
    for await (const chunk of completion) {
      // Handle content deltas
      if (chunk.choices[0]?.delta?.content) {
        const content = chunk.choices[0].delta.content;
        responseMessage += content;
        
        if (res) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      
      // Handle tool call deltas
      if (chunk.choices[0]?.delta?.tool_calls) {
        const deltaToolCalls = chunk.choices[0].delta.tool_calls;
        
        for (const deltaToolCall of deltaToolCalls) {
          const index = deltaToolCall.index ?? 0;
          
          // Initialize tool call if this is the first chunk for this tool
          if (!currentToolCalls[index] && deltaToolCall.id) {
            currentToolCalls[index] = {
              id: deltaToolCall.id,
              type: "function",
              function: {
                name: '',
                arguments: ''
              }
            };
          }
          
          // Update the tool call with this chunk's delta
          if (currentToolCalls[index]) {
            // Update function name if present in this delta
            if (deltaToolCall.function?.name) {
              currentToolCalls[index].function.name = deltaToolCall.function.name;
            }
            
            // Append to arguments if present in this delta
            if (deltaToolCall.function?.arguments) {
              currentToolCalls[index].function.arguments += deltaToolCall.function.arguments;
            }
          }
        }
      }
      
      // Check for completion
      if (chunk.choices[0]?.finish_reason === 'tool_calls') {
        // Collect all complete tool calls
        toolCalls = Object.values(currentToolCalls);
      }
    }
    
    // Process tool calls if any were detected
    if (toolCalls.length > 0) {
      console.log(`Processing ${toolCalls.length} tool calls`);
      
      // Execute each tool call 
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            console.log(`Executing function ${toolCall.function.name} with args:`, toolCall.function.arguments);
            const result = await handleFunctionCall(
              { 
                name: toolCall.function.name, 
                arguments: toolCall.function.arguments 
              }, 
              userId
            );
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify(result)
            } as ChatCompletionToolMessageParam;
          } catch (error) {
            console.error(`Error executing function ${toolCall.function.name}:`, error);
            return {
              tool_call_id: toolCall.id,
              role: "tool" as const,
              content: JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error) 
              })
            } as ChatCompletionToolMessageParam;
          }
        })
      );
      
      console.log("Tool results:", toolResults);
      
      // Format messages with the tool results for a second API call
      const messagesWithTools: ChatCompletionMessageParam[] = [
        ...fullMessages,
        {
          role: "assistant",
          content: null,
          tool_calls: toolCalls
        } as ChatCompletionAssistantMessageParam,
        ...toolResults
      ];
      
      // Make a second API call to process the tool results
      const secondCompletion = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: messagesWithTools,
        temperature: 0.7,
        stream: true
      });
      
      // Reset response message for the second response
      responseMessage = "";
      
      // Process the second stream
      for await (const chunk of secondCompletion) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          responseMessage += content;
          
          if (res) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      }
      
      // Signal end of stream for the second response - NOW THIS IS THE ONLY [DONE] SIGNAL
      if (res) {
        res.write("data: [DONE]\n\n");
      }
    } else {
      // If there were no tool calls, send the [DONE] signal here
      if (res) {
        res.write("data: [DONE]\n\n");
      }
    }
    
    // End the response if applicable
    if (res) {
      res.end();
    }
    
    // Save the message to the database
    const messageData: MessageData = {
      conversationId,
      role: "assistant",
      content: responseMessage || "No response generated",
      metadata: {
        // Preserve any specific metadata we might need
        toolsUsed: toolCalls.length > 0,
        toolNames: toolCalls.map(tool => tool.function.name)
      }
    };
    
    try {
      const assistantMessage = await storage.createChatMessage(messageData);
      console.log("AI response saved successfully with ID:", assistantMessage.id);
    } catch (error) {
      console.error("Error saving AI response:", error);
    }
  } catch (error) {
    console.error("Error in streamChatCompletion:", error);
    
    // Send error message to client
    if (res) {
      res.write(
        `data: ${JSON.stringify({
          content: "I'm sorry, I encountered an error processing your request. Please try again.",
        })}\n\n`
      );
      
      res.write("data: [DONE]\n\n");
      res.end();
    }
    
    // Save error message to database
    const messageData: MessageData = {
      conversationId,
      role: "assistant",
      content: "I'm sorry, I encountered an error processing your request. Please try again.",
      metadata: {
        error: error instanceof Error ? error.message : String(error)
      }
    };
    
    try {
      await storage.createChatMessage(messageData);
    } catch (dbError) {
      console.error("Error saving error message to database:", dbError);
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
  maxTokens: number = 16000,  // Increased token limit to maintain more context for better continuity
  minExchanges: number = 18   // Increased minimum exchanges to preserve more conversation history
): Promise<OpenAIMessage[]> {
  console.log(`Loading conversation history for ${conversationId}`);
  
  // Get messages for the conversation
  const messages = await storage.getChatMessages(conversationId);

  // Sort messages by createdAt to ensure proper order
  messages.sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Map database messages to OpenAI message format
  // Note: 'system' role from database is mapped to 'system' for chat.completions API
  const formattedMessages: OpenAIMessage[] = messages.map((msg) => {
    // Make sure content is a string to prevent [object Object] in the UI
    const content = typeof msg.content === 'string' ? msg.content : 
                   (msg.content ? JSON.stringify(msg.content) : '');
    
    // Create the message with only role and content (no metadata for OpenAI API)
    // The OpenAI API doesn't accept metadata fields
    const formattedMsg: OpenAIMessage = {
      role: msg.role as MessageRole,
      content: content
    };
    
    // We keep metadata for our own tracking but don't send it to the API
    // This avoids the "Unknown parameter: 'input[1].metadata'" error
    
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
      const tokens = estimateTokenCount(typeof msg.content === 'string' ? msg.content : '');
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
 */
export async function generateWelcomeMessage(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    console.log(`Generating welcome message for conversation ${conversationId}`);
    
    const openaiClient = getOpenAIClient();
    
    // Create a structured welcome message with the OpenAI API
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an engaging, helpful AI assistant for Adspirer, a platform for managing retail media advertising campaigns. 
          Generate a warm, professional welcome message that explains how you can help the user with their advertising campaigns.
          
          The welcome message should:
          1. Greet the user warmly
          2. Briefly explain what Adspirer does (retail media campaign management)
          3. Mention you can help with campaign analytics, creation, and optimization
          4. Mention specific example questions the user might ask, like:
             - "How are my campaigns performing this week?"
             - "Which campaigns have the highest CTR?"
             - "Create a new sponsored products campaign for me"
             - "What's my ROAS across all campaigns?"
          5. Invite the user to ask their first question
          
          Keep the message concise (under 150 words), conversational, and encouraging.
          Do not include placeholder variables like [User Name] - just use a generic greeting.`
        }
      ],
      temperature: 0.7, // Slightly creative but still professional
      max_tokens: 500
    });
    
    const welcomeContent = completion.choices[0]?.message?.content;
    
    if (!welcomeContent) {
      throw new Error("Failed to generate welcome message content");
    }
    
    // Save the welcome message to the database
    const messageData: MessageData = {
      conversationId,
      role: "assistant",
      content: welcomeContent,
      metadata: {
        isWelcomeMessage: true
      }
    };
    
    await storage.createChatMessage(messageData);
    console.log("Welcome message saved successfully");
    
  } catch (error) {
    console.error("Error generating welcome message:", error);
    
    // Save a fallback welcome message
    const fallbackMessage: MessageData = {
      conversationId,
      role: "assistant",
      content: "Welcome to Adspirer! I'm your AI assistant for managing retail media advertising campaigns. How can I help you today?",
      metadata: {
        isWelcomeMessage: true,
        isFallback: true,
        error: error instanceof Error ? error.message : String(error)
      }
    };
    
    await storage.createChatMessage(fallbackMessage);
  }
}

/**
 * Detect if a message indicates campaign creation intent
 */
export function detectCampaignCreationIntent(message: string): boolean {
  // Ensure we have a string to work with
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  // Convert to lowercase for case-insensitive matching
  const lowerMessage = message.toLowerCase();
  
  // Direct campaign creation phrases
  const directCreationPhrases = [
    "create a campaign",
    "create campaign",
    "set up a campaign",
    "setup a campaign",
    "build a campaign",
    "make a campaign",
    "start a campaign",
    "launch a campaign",
    "new campaign",
    "add a campaign",
    "create ad group",
    "create a new campaign",
    "create sponsored",
    "create a sponsored",
    "set up sponsored",
    "setup sponsored"
  ];
  
  // Check for direct phrases
  for (const phrase of directCreationPhrases) {
    if (lowerMessage.includes(phrase)) {
      return true;
    }
  }
  
  // More complex pattern matching
  const campaignKeywords = ["campaign", "ad group", "adgroup", "sponsored product", "sponsored brand"];
  const creationVerbs = ["create", "make", "set up", "setup", "build", "start", "launch", "begin"];
  
  // Check for verb + keyword combinations
  for (const verb of creationVerbs) {
    for (const keyword of campaignKeywords) {
      const pattern = new RegExp(`${verb}\\s+(?:a|an|the|my|our)?\\s*${keyword}s?`, 'i');
      if (pattern.test(message)) {
        return true;
      }
    }
  }
  
  // Check for expressions of desire to create
  const desirePhrases = [
    "want to create",
    "like to create", 
    "need to create",
    "looking to create",
    "help me create",
    "would like to create",
    "interested in creating"
  ];
  
  for (const phrase of desirePhrases) {
    for (const keyword of campaignKeywords) {
      if (lowerMessage.includes(`${phrase} a ${keyword}`) || 
          lowerMessage.includes(`${phrase} an ${keyword}`) ||
          lowerMessage.includes(`${phrase} ${keyword}`)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Determine the current step in the campaign creation process
 */
export function determineCampaignCreationStep(conversationHistory: any[]): { 
  step: number, 
  data: Record<string, any> 
} {
  let step = 1; // Default to first step
  const data: Record<string, any> = {};

  // Extract campaign details from conversation history
  for (const message of conversationHistory) {
    if (message.role === 'assistant') {
      // Check if assistant asked for campaign name
      if (/what would you like to name this .* campaign/i.test(message.content)) {
        step = Math.max(step, 1);
      }
      // Check if assistant asked for daily budget
      if (/what.*daily budget/i.test(message.content)) {
        step = Math.max(step, 2);
      }
      // Check if assistant asked for campaign dates
      if (/when should the campaign start/i.test(message.content)) {
        step = Math.max(step, 3);
      }
      // Check if assistant asked for targeting type
      if (/do you want.* targeting/i.test(message.content)) {
        step = Math.max(step, 4);
      }
      // Check if assistant asked for ad group details
      if (/what would you like to name this.* ad group/i.test(message.content)) {
        step = Math.max(step, 5);
      }
      // Check if assistant asked for bid amount
      if (/what (?:default )?bid amount/i.test(message.content)) {
        step = Math.max(step, 6);
      }
      // Check if assistant asked for products
      if (/which .* products .* do you want to advertise/i.test(message.content)) {
        step = Math.max(step, 7);
      }
      // Check if assistant asked for keywords
      if (/what search terms should trigger/i.test(message.content)) {
        step = Math.max(step, 8);
      }
      // Check if assistant asked for match type
      if (/what match type/i.test(message.content)) {
        step = Math.max(step, 9);
      }
      // Check if assistant asked for negative keywords
      if (/any negative keywords/i.test(message.content)) {
        step = Math.max(step, 10);
      }
      // Check if assistant asked for bidding strategy
      if (/bidding strategy/i.test(message.content)) {
        step = Math.max(step, 11);
      }
      // Check if assistant confirmed campaign creation
      if (/campaign .*has been created/i.test(message.content)) {
        step = 12; // Final step
      }
    }
    
    if (message.role === 'user') {
      // Extract campaign name
      if (step === 1 && message.content.length > 0 && message.content.length < 100) {
        data.campaignName = message.content.trim();
      }
      
      // Extract daily budget
      const budgetMatch = message.content.match(/\$?(\d+(?:\.\d+)?)/);
      if (step === 2 && budgetMatch) {
        data.dailyBudget = parseFloat(budgetMatch[1]);
      }
      
      // Extract start date
      const dateMatch = message.content.match(/(\d{4}-\d{2}-\d{2})/);
      if (step === 3 && dateMatch) {
        data.startDate = dateMatch[1];
      } else if (step === 3 && /today/i.test(message.content)) {
        data.startDate = new Date().toISOString().split('T')[0];
      } else if (step === 3 && /tomorrow/i.test(message.content)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        data.startDate = tomorrow.toISOString().split('T')[0];
      }
      
      // Extract end date
      if (step === 3 && dateMatch && /end|stop|finish/i.test(message.content)) {
        data.endDate = dateMatch[1];
      }
      
      // Extract targeting type
      if (step === 4 && /manual/i.test(message.content)) {
        data.targetingType = 'manual';
      } else if (step === 4 && /auto/i.test(message.content)) {
        data.targetingType = 'automatic';
      }
      
      // Extract campaign state/status
      if (/enabled|active|on/i.test(message.content)) {
        data.state = 'enabled';
      } else if (/paused|inactive|off/i.test(message.content)) {
        data.state = 'paused';
      }
      
      // Extract ad group name
      if (step === 5 && message.content.length > 0 && message.content.length < 100) {
        data.adGroupName = message.content.trim();
      }
      
      // Extract default bid
      if (step === 6 && budgetMatch) {
        data.defaultBid = parseFloat(budgetMatch[1]);
      }
      
      // Extract products (ASINs or SKUs)
      const asinMatch = message.content.match(/B0[A-Z0-9]{8,9}/g);
      const skuMatch = message.content.match(/SKU[-_]?[A-Z0-9]{3,}[-_]?[A-Z0-9]{3,}/g);
      
      if (step === 7) {
        if (asinMatch) {
          data.asins = asinMatch;
        }
        if (skuMatch) {
          data.skus = skuMatch;
        }
      }
      
      // Extract keywords
      if (step === 8) {
        const keywordsList = message.content
          .split(/,|\n/)
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length < 80);
        
        if (keywordsList.length > 0) {
          data.keywords = keywordsList;
        }
      }
      
      // Extract match type
      if (step === 9) {
        if (/broad/i.test(message.content)) {
          data.matchType = 'broad';
        } else if (/phrase/i.test(message.content)) {
          data.matchType = 'phrase';
        } else if (/exact/i.test(message.content)) {
          data.matchType = 'exact';
        }
      }
      
      // Extract negative keywords
      if (step === 10) {
        const negativeKeywordsList = message.content
          .split(/,|\n/)
          .map(k => k.trim())
          .filter(k => k.length > 0 && k.length < 80);
        
        if (negativeKeywordsList.length > 0 && !/no|none/i.test(message.content)) {
          data.negativeKeywords = negativeKeywordsList;
        }
      }
      
      // Extract bidding strategy
      if (step === 11) {
        if (/down only/i.test(message.content)) {
          data.biddingStrategy = 'autoForSales';
        } else if (/up and down/i.test(message.content)) {
          data.biddingStrategy = 'autoForConversions';
        } else if (/fixed/i.test(message.content)) {
          data.biddingStrategy = 'fixed';
        }
      }
    }
  }

  // Determine the next step based on collected data
  if (!data.campaignName) {
    step = 1;
  } else if (data.campaignName && !data.dailyBudget) {
    step = 2;
  } else if (data.dailyBudget && !data.startDate) {
    step = 3;
  } else if (data.startDate && !data.targetingType) {
    step = 4;
  } else if (data.targetingType && !data.adGroupName) {
    step = 5;
  } else if (data.adGroupName && !data.defaultBid) {
    step = 6;
  } else if (data.defaultBid && (!data.asins && !data.skus)) {
    step = 7;
  } else if ((data.asins || data.skus) && !data.keywords) {
    step = 8;
  } else if (data.keywords && !data.matchType) {
    step = 9;
  } else if (data.matchType && !('negativeKeywords' in data)) {
    step = 10;
  } else if ('negativeKeywords' in data && !data.biddingStrategy) {
    step = 11;
  }

  return { step, data };
}

/**
 * Generate the next message in the campaign creation flow
 */
export async function generateCampaignCreationResponse(
  step: number,
  data: Record<string, any>,
  userId: string,
  conversationId: string
): Promise<string> {
  const messages = [
    { role: 'system', content: `You are an advertising campaign specialist helping a user create a new campaign. You are currently on step ${step} of the campaign creation process. Be concise and friendly. Ask only one question at a time to gather the required information.` },
  ];

  // Add appropriate prompt based on current step
  switch (step) {
    case 1:
      messages.push({ 
        role: 'user', 
        content: 'I want to create a new campaign.' 
      });
      messages.push({ 
        role: 'assistant', 
        content: "Great! I'll help you set up a new Sponsored Products campaign. What would you like to name this campaign?" 
      });
      break;
    
    case 2:
      messages.push({ 
        role: 'user', 
        content: `I want to name my campaign "${data.campaignName}".` 
      });
      messages.push({ 
        role: 'assistant', 
        content: `"${data.campaignName}" is a great name. What's the maximum daily budget you want to set for this campaign? Please provide the amount in dollars.` 
      });
      break;
    
    case 3:
      messages.push({ 
        role: 'user', 
        content: `I'll set a daily budget of $${data.dailyBudget} for my campaign "${data.campaignName}".` 
      });
      messages.push({ 
        role: 'assistant', 
        content: `$${data.dailyBudget} daily budget noted. When should the campaign start? You can say 'today', 'tomorrow', or provide a specific date in YYYY-MM-DD format.` 
      });
      break;
    
    case 4:
      messages.push({ 
        role: 'user', 
        content: `My campaign should start on ${data.startDate}.` 
      });
      messages.push({ 
        role: 'assistant', 
        content: `Starting on ${data.startDate}. Do you want Amazon's 'Automatic' targeting (they find relevant searches/products) or 'Manual' targeting (you provide keywords/products)?` 
      });
      break;
    
    case 5:
      messages.push({ 
        role: 'user', 
        content: `I want ${data.targetingType} targeting.` 
      });
      messages.push({ 
        role: 'assistant', 
        content: `${data.targetingType.charAt(0).toUpperCase() + data.targetingType.slice(1)} targeting selected. Now let's set up an Ad Group within this campaign. What would you like to name this first Ad Group?` 
      });
      break;
    
    case 6:
      messages.push({ 
        role: 'user', 
        content: `I'll name the ad group "${data.adGroupName}".` 
      });
      messages.push({ 
        role: 'assistant', 
        content: `"${data.adGroupName}" is a good ad group name. What default bid amount should we set for this ad group? This is the max you'd pay per click, in dollars.` 
      });
      break;
    
    case 7:
      messages.push({ 
        role: 'user', 
        content: `I'll set the default bid to $${data.defaultBid}.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `Default bid set to $${data.defaultBid}. Which specific products (ASINs or SKUs) do you want to advertise within this ad group? Please list them.` 
      });
      break;
    
    case 8:
      messages.push({ 
        role: 'user', 
        content: `I want to advertise these products: ${Array.isArray(data.asins) ? data.asins.join(', ') : ''}${Array.isArray(data.skus) ? data.skus.join(', ') : ''}.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `Products added. Now, what search terms should trigger ads for these products? Please list the keywords that you want to target.` 
      });
      break;
    
    case 9:
      messages.push({ 
        role: 'user', 
        content: `I want to use these keywords: ${Array.isArray(data.keywords) ? data.keywords.join(', ') : ''}.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `Got your keywords. What match type should we use for them? Options are: Broad, Phrase, or Exact match.` 
      });
      break;
    
    case 10:
      messages.push({ 
        role: 'user', 
        content: `I want to use ${data.matchType} match type.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `${data.matchType.charAt(0).toUpperCase() + data.matchType.slice(1)} match type selected. Are there any negative keywords? Terms you definitely don't want ads showing for? (e.g., 'free', 'cheap')` 
      });
      break;
    
    case 11:
      messages.push({ 
        role: 'user', 
        content: `${data.negativeKeywords ? 'Yes, I want to add these negative keywords: ' + data.negativeKeywords.join(', ') : 'No negative keywords'}.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `${data.negativeKeywords ? 'Negative keywords added' : 'No negative keywords added'}. Almost done! What bidding strategy would you like to use? Options are:
* Dynamic bids - down only: Lowers bids in real-time if less likely to convert
* Dynamic bids - up and down: Adjusts bids higher or lower based on conversion likelihood
* Fixed bids: Uses your default or keyword-specific bids without real-time changes` 
      });
      break;
    
    case 12:
      messages.push({ 
        role: 'user', 
        content: `I want to use ${data.biddingStrategy === 'autoForSales' ? 'Down only' : data.biddingStrategy === 'autoForConversions' ? 'Up and down' : 'Fixed bids'} bidding strategy.`
      });
      messages.push({ 
        role: 'assistant', 
        content: `Perfect! To recap: We've set up a ${data.targetingType} Sponsored Products campaign named "${data.campaignName}", starting ${data.startDate}, with a $${data.dailyBudget} daily budget. It includes an ad group "${data.adGroupName}" with a $${data.defaultBid} default bid and ${data.matchType} match type keywords. The campaign is ready to be created.` 
      });
      break;
  }

  // Combine all messages into a single string
  const responseMessage = messages.map(msg => msg.content).join("\n");

  return responseMessage;
}
