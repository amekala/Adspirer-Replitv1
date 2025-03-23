/**
 * OpenAI API integration service
 * Provides functionality for interacting with OpenAI APIs, 
 * handling credentials, and streaming responses.
 * 
 * This service is responsible for:
 * - Chat message generation and streaming
 * - Conversation context management
 * - Integration with embedding service for semantic search
 * - Error handling and response formatting
 */

import { OpenAI } from 'openai';
import { Response } from 'express';
import { storage } from '../storage';
import { createChatMessageEmbedding } from './embedding';
import { MESSAGE_EMBEDDING_INTERVAL } from './embedding-constants';
import { log } from '../vite';

// Define interfaces for strongly typed parameters
export interface ChatCompletionOptions {
  conversationId: string;
  userId: string;
  systemPrompt?: string;
  includeEmbeddings?: boolean;
}

/**
 * Initialize the OpenAI client with the API key
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is missing. Please set the OPENAI_API_KEY environment variable.');
  }
  
  return new OpenAI({ apiKey });
}

/**
 * Process streaming response from OpenAI and save to database
 * @param conversationId - The ID of the conversation
 * @param userId - The ID of the user
 * @param res - The Express response object for streaming
 * @param messages - The messages to send to OpenAI
 * @param systemPrompt - Optional custom system prompt
 * @param includeEmbeddings - Whether to generate embeddings for the response (default: true)
 */
export async function streamChatCompletion({
  conversationId,
  userId,
  res,
  messages,
  systemPrompt = 'You are an AI assistant for Adspirer, a platform that helps manage retail media advertising campaigns. You have knowledge about Amazon Advertising and Google Ads APIs, campaign metrics, and advertising strategies. Provide helpful, concise responses about advertising, analytics, and campaign management.',
  includeEmbeddings = true
}: {
  conversationId: string;
  userId: string;
  res: Response;
  messages: any[];
  systemPrompt?: string;
  includeEmbeddings?: boolean;
}): Promise<void> {
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
    
    log('Creating chat completion stream with OpenAI GPT-4o...', 'openai-service');
    log(`Using ${messages.length} messages in conversation context`, 'openai-service');
    
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
    
    log('Stream created, sending chunks to client...', 'openai-service');
    
    // Process stream chunks
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      
      if (content) {
        fullAssistantMessage += content;
        
        // Send each chunk to the client
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }
    
    log('Stream completed, saving response to database...', 'openai-service');
    
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
      log(`AI response saved successfully with ID: ${savedMessage.id}`, 'openai-service');
      
      // Generate and store embedding if requested, but only for every Nth message
      if (includeEmbeddings) {
        try {
          // Get message count for this conversation to implement interval-based embedding
          const messages = await storage.getChatMessages(conversationId);
          const messageCount = messages.length;
          
          // Only create embeddings every N messages (defined in embedding service)
          // Always create for first few messages to establish context
          if (messageCount <= 3 || messageCount % MESSAGE_EMBEDDING_INTERVAL === 0) {
            log(`Generating embedding for message ID: ${savedMessage.id} (message #${messageCount})`, 'openai-service');
            await createChatMessageEmbedding(savedMessage, conversationId);
            log(`Successfully created embedding for message ID: ${savedMessage.id}`, 'openai-service');
          } else {
            log(`Skipping embedding for message #${messageCount} (creating every ${MESSAGE_EMBEDDING_INTERVAL} messages)`, 'openai-service');
          }
        } catch (embeddingError) {
          // Log error but don't fail the response
          log(`Error creating embedding: ${embeddingError instanceof Error ? embeddingError.message : String(embeddingError)}`, 'openai-service');
        }
      }
      
      // End the stream
      res.write('data: [DONE]\n\n');
      res.end();
      
    } catch (err) {
      log(`Error saving assistant message: ${err instanceof Error ? err.message : String(err)}`, 'openai-service');
      res.write('data: [ERROR]\n\n');
      res.end();
    }
  } catch (error) {
    log(`Error in OpenAI service: ${error instanceof Error ? error.message : String(error)}`, 'openai-service');
    
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