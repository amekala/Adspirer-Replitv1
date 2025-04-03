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
import { ChatConversation, ChatMessage as DbChatMessage } from "@shared/types";
import { amazonCampaignTools } from "../functions/amazon-campaign";
import { googleCampaignTools } from "../functions/google-campaign";
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

// Extend the DbChatMessage interface to include toolCalls and toolCallId properties
interface ExtendedDbChatMessage extends DbChatMessage {
  toolCalls?: any[];
  toolCallId?: string;
}

// For storing chat messages with extended properties
type ExtendedChatMessage = DbChatMessage & {
  toolCalls?: any[];
  toolCallId?: string;
};

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
// Type for createChatMessage with extended properties
interface MessageData {
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | null;
  toolCalls?: any[];
  toolCallId?: string;
  metadata?: Record<string, any>;
}

// Initialize the OpenAI client
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
  console.error("WARNING: OPENAI_API_KEY environment variable is not set");
}

const openaiClient = new OpenAI({
  apiKey: apiKey || "dummy-key-for-development",
});

// Helper to extract content from message objects
export function extractOpenAIMessageContent(message: any): string {
  // If it's already a string, return it
  if (typeof message === "string") return message;
  
  // If it's an array, convert to text
  if (Array.isArray(message)) {
    return message.map(item => {
      if (typeof item === "string") return item;
      // Handle text content from an object
      if (item.type === "text" && item.text) return item.text;
      return "";
    }).join("\n");
  }
  
  // If it's an object try to extract content
  return message?.content || "";
}

/**
 * Process messages from the database for use with OpenAI API
 * This converts our DB format to OpenAI's expected format
 */
export function processMessagesForOpenAI(messages: ExtendedDbChatMessage[]): OpenAIMessage[] {
  return messages.map((message): OpenAIMessage => {
    let content = message.content;
    
    // Handle tool calls that are stored in the DB
    if (message.role === "assistant" && message.toolCalls && message.toolCalls.length > 0) {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls.map(call => ({
          id: call.id,
          type: "function",
          function: {
            name: call.function.name,
            arguments: typeof call.function.arguments === "string" 
              ? call.function.arguments 
              : JSON.stringify(call.function.arguments)
          }
        }))
      };
    }
    
    // Handle tool results
    if (message.role === "tool" && message.toolCallId) {
      return {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId
      };
    }
    
    // Regular message
            return {
      role: message.role as MessageRole,
      content: content
    };
  });
}

/**
 * Clean system prompt by removing excess whitespace and normalizing line breaks
 */
function cleanSystemPrompt(prompt: string): string {
  // Remove excess leading/trailing whitespace from lines
  return prompt
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Extract SQL query from an LLM response
 */
export function extractSQLQuery(content: string): string | null {
  // Match SQL query pattern between ```sql and ``` tags
  const sqlMatch = content.match(/```sql\s*([\s\S]*?)\s*```/);
  if (sqlMatch && sqlMatch[1]) {
    return sqlMatch[1].trim();
  }
  
  // Also try without the sql language specifier
  const codeMatch = content.match(/```\s*(SELECT[\s\S]*?)\s*```/i);
  if (codeMatch && codeMatch[1]) {
    return codeMatch[1].trim();
  }
  
  return null;
}

/**
 * Detect if a message might need tools enabled.
 * Used to determine whether to include tools in the API request.
 */
function mightNeedToolsEnabled(message: string): boolean {
  // Always include tools for most messages to ensure availability
  if (!message) return false;
  
  const toolRelatedPatterns = [
    /campaign/i,
    /advert/i,
    /amazon/i,
    /google/i,
    /sponsor/i,
    /product/i,
    /ad group/i, 
    /keyword/i,
    /budget/i,
    /creat/i,
    /set ?up/i,
    /launch/i,
    /start/i,
    /new/i,
    /add/i,
    /make/i,
    /generat/i,
    /build/i,
    /advertis/i,
    /display/i,
    /date/i,
    /today/i,
    /tomorrow/i,
    /bid/i,
    /target/i
  ];
  
  return toolRelatedPatterns.some(pattern => pattern.test(message));
}

/**
 * Get or create a chat conversation, adding a helper method to storage
 */
async function getOrCreateChatConversation(conversationId: string, userId: string): Promise<ChatConversation> {
  try {
    let conversation = await storage.getChatConversation(conversationId);
    if (!conversation) {
      conversation = await storage.createChatConversation(conversationId, userId);
    }
    return conversation;
  } catch (error) {
    console.error("Error getting or creating conversation:", error);
    return await storage.createChatConversation(conversationId, userId);
  }
}

/**
 * Stream a chat completion from OpenAI, handling token streaming,
 * tool calls, and function invocation.
 * 
 * @param conversationId The ID of the conversation
 * @param userId The ID of the user
 * @param res Express response object for streaming
 * @param messages Messages to send to OpenAI
 * @param systemPrompt System prompt to prepend
 */
export async function streamChatCompletion(
  conversationId: string,
  userId: string,
  res: Response | null,
  messages?: OpenAIMessage[],
  systemPrompt: string = `You are an AI assistant that helps advertisers create and manage their online ads for Amazon and Google. You can help users create campaigns, ad groups, keywords, and ads through natural language conversations.

For Amazon advertising, you can:
1. Create Sponsored Products campaigns
2. Create ad groups within campaigns
3. Add products to ad groups
4. Add keywords to ad groups
5. Add negative keywords to ad groups

For Google Ads, you can:
1. Create campaign budgets
2. Create search campaigns
3. Create ad groups
4. Add keywords to ad groups
5. Add negative keywords to ad groups
6. Create responsive search ads
7. Add location and language targeting to campaigns

When helping users, follow these guidelines:
- Ask for all necessary information before creating a campaign
- For Google Ads campaigns, guide users through the complete process:
  a) Create campaign budget
  b) Create campaign
  c) Add location and language targeting (important for proper ad delivery)
  d) Create ad group
  e) Add keywords
  f) Create responsive search ads (at least 3 headlines and 2 descriptions required)
- Explain the purpose of each step
- Suggest best practices for campaign settings
- Recommend relevant keywords based on the products or services
- For Google Responsive Search Ads, suggest multiple headlines (at least 3) and descriptions (at least 2)
- Provide clear feedback on the success or failure of operations

You can use the following function calls to interact with the respective advertising platforms.
Only use these functions when the user has provided enough information to create a specific entity.
  
KEY CONVERSATION GUIDELINES:
1. Be genuinely conversational and personable - interact like a helpful colleague, not a data report
2. Ask clarifying questions only when essential information is missing for a task or when the request is genuinely ambiguous
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
10. IMPORTANT SEQUENCE FOR DATES:
   a. When user mentions a relative date (like 'tomorrow'), FIRST call get_current_date
   b. From the get_current_date response, extract the specific date string (e.g. response.tomorrow)
   c. THEN use that extracted date string for the tool parameter requiring a date

CAMPAIGN CREATION CAPABILITIES:
1. You can help users create both Amazon Ads campaigns and Google Ads campaigns through a series of guided questions
2. When users request to create a campaign, gather ALL necessary information conversationally
3. Do NOT ask only one question per turn. Ask for related details together (e.g., "Okay, let's set up your campaign! What name, daily budget, and start date are you thinking of?")
4. Guide the user naturally. If they provide multiple pieces of info at once, acknowledge them. If they miss something, ask for it specifically
5. Once you have gathered necessary information for a step, proceed with the appropriate tool call
6. When the user has provided or confirmed the necessary information, proceed to use the appropriate tools
7. CRITICAL: When you have enough information to use a tool (even if not every possible field is specified), proceed to call the tool rather than asking more questions. Default values will be used for optional parameters.
8. You may need to make multiple tool calls sequentially based on the results
9. After the tools execute successfully, inform the user that the campaign setup is complete
10. For Amazon campaigns, use the amazon_* tools. For Google campaigns, use the google_* tools.

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
    // Get or create a new conversation
    const conversation = await getOrCreateChatConversation(conversationId, userId);
    
    // If no messages are provided, load from the database
    if (!messages) {
      const dbMessages = await storage.getChatMessages(conversationId) as ExtendedDbChatMessage[];
      messages = processMessagesForOpenAI(dbMessages);
    }
    
    // Get last user message to detect if we need tools
    const lastUserMessageIdx = [...messages].reverse().findIndex(m => m.role === "user");
    const lastUserMessage = lastUserMessageIdx >= 0 ? 
      messages[messages.length - 1 - lastUserMessageIdx] : null;
    
    // Check if the message might need tools
    const mightNeedTools = lastUserMessage && 
      typeof lastUserMessage.content === "string" && 
      mightNeedToolsEnabled(lastUserMessage.content);
    
    // Create final messages array with system prompt
    const fullMessages: ChatCompletionMessageParam[] = [
      { 
        role: "system", 
        content: cleanSystemPrompt(systemPrompt) 
      },
      ...messages as ChatCompletionMessageParam[]
    ];
      
    console.log(`Might need tools: ${mightNeedTools}`);
    
    // Convert Amazon and Google campaign tools to the OpenAI expected format
    const toolsFormatted = [
      ...amazonCampaignTools.map(tool => ({
        type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
      })),
      ...googleCampaignTools.map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }))
    ] as ChatCompletionTool[];
    
    // Create completion with the appropriate configuration
    // Always include tools for consistent behavior
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o",
      messages: fullMessages,
      tools: toolsFormatted,
      tool_choice: "auto", 
      temperature: 0.7,
      stream: true,
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
    
    // Storage variables for tracking the completion
    let assistantMessage: DbChatMessage | null = null;
    
    // Process the streaming response
    for await (const chunk of completion) {
      const { choices } = chunk;
      const delta = choices[0]?.delta;
      
      // Skip if no delta
      if (!delta) continue;
      
      // Check for content in this chunk
      if (delta.content) {
        responseMessage += delta.content;
        
        // Send this chunk to the client
        if (res) {
          res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
        }
      }
      
      // Check for tool calls in this chunk
      if (delta.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          // Initialize if this is the first chunk for this tool call
          if (!currentToolCalls[toolCallDelta.index]) {
            currentToolCalls[toolCallDelta.index] = {
              id: toolCallDelta.id || `tool-call-${toolCallDelta.index}`,
              type: "function",
              function: {
                name: "",
                arguments: ""
              }
            };
          }
          
          // Update tool call with new information
          const currentToolCall = currentToolCalls[toolCallDelta.index];
          
          if (toolCallDelta.function?.name) {
            currentToolCall.function.name = 
              (currentToolCall.function.name || "") + toolCallDelta.function.name;
          }
          
          if (toolCallDelta.function?.arguments) {
            currentToolCall.function.arguments = 
              (currentToolCall.function.arguments || "") + toolCallDelta.function.arguments;
          }
          
          // If we have a complete tool call, add it to our list
          if (currentToolCall.function.name && currentToolCall.id) {
            const existingToolCall = toolCalls.find(tc => tc.id === currentToolCall.id);
            if (!existingToolCall) {
              toolCalls.push(currentToolCall);
            }
          }
          
          // Send tool call update to client
          if (res) {
            res.write(`data: ${JSON.stringify({ 
              tool_call: { 
                index: toolCallDelta.index,
                id: currentToolCall.id,
                name: currentToolCall.function.name,
                argumentsDelta: toolCallDelta.function?.arguments || "",
                arguments: currentToolCall.function.arguments
              } 
            })}\n\n`);
          }
        }
      }
      
      // If this is the end of the completion
      if (choices[0]?.finish_reason) {
        console.log(`Completion finished with reason: ${choices[0].finish_reason}`);
        
        // Add detailed logging for finish_reason analysis
        if (choices[0].finish_reason === 'tool_calls') {
          console.log(`Tool calls requested: ${toolCalls.length} tool call(s) detected`);
          toolCalls.forEach((call, idx) => {
            console.log(`Tool call ${idx+1}: ${call.function.name} with ${call.function.arguments.length} chars of arguments`);
          });
        } else if (choices[0].finish_reason === 'stop') {
          console.log(`Model chose to stop without requesting tool calls. Response length: ${responseMessage.length} chars`);
        } else {
          console.log(`Unexpected finish_reason: ${choices[0].finish_reason}`);
        }
        
        // Store the assistant message in the database
        // Create a valid message data object for database storage
        const messageData: MessageData = {
          conversationId,
          role: "assistant",
          content: responseMessage
        };
        
        // Only add toolCalls if they exist
        if (toolCalls.length > 0) {
          messageData.toolCalls = toolCalls.map(tc => ({
            id: tc.id,
            type: "function",
            function: {
              name: tc.function.name,
              arguments: tc.function.arguments
            }
          }));
        }
        
        assistantMessage = await storage.createChatMessage(messageData as any);
        
        if (res) {
          res.write(`data: ${JSON.stringify({ finished: true })}\n\n`);
        }
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
      
      // Process the second streaming response
      for await (const chunk of secondCompletion) {
        const { choices } = chunk;
        const delta = choices[0]?.delta;
        
        // Skip if no delta
        if (!delta) continue;
        
        // Check for content in this chunk
        if (delta.content) {
          responseMessage += delta.content;
          
          // Send this chunk to the client
          if (res) {
            res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
          }
        }
        
        // If this is the end of the completion
        if (choices[0]?.finish_reason) {
          console.log(`Second completion finished with reason: ${choices[0].finish_reason}`);
          
          // Store the final assistant response
          await storage.createChatMessage({
            conversationId,
            role: "assistant",
            content: responseMessage
          });
          
          if (res) {
            res.write(`data: ${JSON.stringify({ finished: true })}\n\n`);
            res.end();
          }
        }
      }
    } else if (res) {
      res.end();
    }
    
  } catch (error) {
    console.error("Error in streamChatCompletion:", error);
    
    if (res) {
      // Send error to client
      res.write(`data: ${JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error)
      })}\n\n`);
      res.end();
      }
    
    throw error;
  }
}

/**
 * Execute a SQL query against the campaign metrics data.
 * This is the main entry point for the SQL Builder.
 */
export async function executeQuery(question: string, userId: string): Promise<any> {
  try {
    // Use processSQLQuery from SQLBuilder instead of getSqlFromQuestion
    const sqlResult = await SQLBuilder.processSQLQuery(userId, question);
    if (!sqlResult || !sqlResult.sql) {
      throw new Error("Failed to generate SQL query");
    }
    
    console.log("Generated SQL query:", sqlResult.sql);
    
    // Return the result from SQLBuilder directly
    return sqlResult;
  } catch (error) {
    console.error("Error executing query:", error);
    throw error;
  }
}

/**
 * Generate a welcome message for a new conversation
 * This is called when a new conversation is created to provide an initial assistant message
 */
export async function generateWelcomeMessage(conversationId: string, userId: string): Promise<void> {
  try {
    console.log(`Generating welcome message for conversation ${conversationId}`);
    
    // Create a welcome message in the database
    const welcomeMessage = await storage.createChatMessage({
      conversationId,
      role: "assistant",
      content: "Hi there! I'm your advertising assistant, ready to help you create and manage campaigns on Amazon and Google. I can help with:\n\n" +
        "• Creating new advertising campaigns\n" +
        "• Setting up ad groups and keywords\n" +
        "• Adding products to your campaigns\n" +
        "• Providing best practices and recommendations\n\n" +
        "What would you like help with today?"
    });
    
    console.log(`Welcome message created with ID: ${welcomeMessage.id}`);
    return;
  } catch (error) {
    console.error(`Error generating welcome message for conversation ${conversationId}:`, error);
    throw error;
  }
}
