/**
 * OpenAI API integration service
 * Provides functionality for interacting with OpenAI APIs, 
 * handling credentials, and streaming responses.
 */

import { OpenAI } from 'openai';
import { Response } from 'express';
import { storage } from '../storage';

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
 * Process streaming response from OpenAI and save to database
 * @param conversationId - The ID of the conversation
 * @param res - The Express response object for streaming
 * @param messages - The messages to send to OpenAI
 */
export async function streamChatCompletion(
  conversationId: string,
  userId: string,
  res: Response,
  messages: any[],
  systemPrompt = 'You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies. Provide helpful, concise responses about advertising, analytics, and campaign management.'
): Promise<void> {
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
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    console.log('Creating chat completion stream with OpenAI GPT-4o...');
    console.log('Messages being sent to OpenAI:', JSON.stringify(messages, null, 2));
    
    // Create streaming completion
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
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
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
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (err) {
      console.error('Error saving assistant message:', err);
      res.write('data: [ERROR]\n\n');
      res.end();
    }
  } catch (error) {
    console.error('Error in OpenAI service:', error);
    
    // Send error to client and end response
    res.write(`data: ${JSON.stringify({ error: 'An error occurred with the OpenAI service.' })}\n\n`);
    res.write('data: [ERROR]\n\n');
    res.end();
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