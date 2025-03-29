/**
 * Test Campaign Flow Script
 * 
 * This script tests the complete campaign creation flow including:
 * 1. Creating a new conversation
 * 2. Generating the welcome message
 * 3. Sending a campaign creation request
 * 4. Progressing through all steps of campaign creation
 * 
 * Run with: node test-campaign-flow.js
 */

// Import required modules
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './server/storage.js';
import { streamChatCompletion, generateWelcomeMessage, detectCampaignCreationIntent } from './server/services/openai.js';

// Mock Express Response object to capture streaming responses
class MockResponse {
  constructor() {
    this.chunks = [];
    this.ended = false;
    this.headers = {};
    this.statusCode = 200;
  }

  writeHead(statusCode, headers) {
    this.statusCode = statusCode;
    this.headers = headers;
    return this;
  }

  write(data) {
    if (this.ended) {
      console.error('Warning: write called after end');
      return this;
    }
    
    this.chunks.push(data);
    return this;
  }

  end() {
    this.ended = true;
    return this;
  }

  get writableEnded() {
    return this.ended;
  }

  getContent() {
    return this.chunks
      .filter(chunk => chunk.startsWith('data: ') && !chunk.includes('[DONE]'))
      .map(chunk => {
        try {
          const jsonStr = chunk.replace('data: ', '');
          const parsed = JSON.parse(jsonStr);
          return parsed.content || '';
        } catch (e) {
          console.error('Error parsing chunk:', chunk, e);
          return '';
        }
      })
      .join('');
  }

  printAllChunks() {
    console.log('\n--- All Response Chunks ---');
    this.chunks.forEach((chunk, i) => {
      console.log(`Chunk ${i}:`, chunk);
    });
    console.log('-------------------------\n');
  }
}

// Utility functions
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const logStep = (step, message) => {
  console.log(`\n${'-'.repeat(80)}`);
  console.log(`STEP ${step}: ${message}`);
  console.log(`${'-'.repeat(80)}\n`);
};

const logError = (step, error) => {
  console.error(`\n${'!'.repeat(80)}`);
  console.error(`ERROR IN STEP ${step}:`);
  console.error(error);
  console.error(`${'!'.repeat(80)}\n`);
  
  if (error.response && error.response.data) {
    console.error('API Response Error:', JSON.stringify(error.response.data, null, 2));
  }
  
  if (error.stack) {
    console.error('Stack Trace:', error.stack);
  }
};

async function createTestUser() {
  try {
    // Use a test user ID or create a new one
    const userId = process.env.TEST_USER_ID || uuidv4();
    console.log('Using test user ID:', userId);
    
    // If needed, create a mock user profile
    try {
      const existingProfile = await storage.getUserProfile(userId);
      if (!existingProfile) {
        await storage.createUserProfile({
          id: userId,
          email: 'test@example.com',
          name: 'Test User'
        });
        console.log('Created test user profile');
      } else {
        console.log('Using existing user profile');
      }
    } catch (error) {
      console.warn('Warning: Could not check/create user profile. Continuing anyway.');
    }
    
    return userId;
  } catch (error) {
    logError('User Creation', error);
    throw error;
  }
}

async function createTestConversation(userId) {
  try {
    const conversation = await storage.createChatConversation(
      userId, 
      'Test Campaign Creation Flow'
    );
    console.log('Created new conversation with ID:', conversation.id);
    return conversation;
  } catch (error) {
    logError('Conversation Creation', error);
    throw error;
  }
}

async function saveUserMessage(conversationId, content) {
  try {
    const message = await storage.createChatMessage({
      conversationId,
      role: 'user',
      content
    });
    console.log('Saved user message:', content);
    return message;
  } catch (error) {
    logError('Save User Message', error);
    throw error;
  }
}

async function getAssistantResponse(conversationId, userId, userMessage) {
  try {
    // Save the user message first
    await saveUserMessage(conversationId, userMessage);
    
    // Create a mock response object to capture the streaming response
    const res = new MockResponse();
    
    // Check if this is a campaign creation intent
    const isCampaignCreation = detectCampaignCreationIntent(userMessage);
    console.log(`Message "${userMessage}" is${isCampaignCreation ? '' : ' not'} a campaign creation intent`);
    
    // Get all conversation messages to pass to the AI
    const messages = await storage.getChatMessages(conversationId);
    
    console.log('Getting assistant response...');
    console.log('Conversation has', messages.length, 'messages');
    
    // Stream the chat completion and get the assistant's response
    await streamChatCompletion(conversationId, userId, res, messages);
    
    // Extract the content from the response
    const responseContent = res.getContent();
    
    // Debug: log all chunks if there's an issue
    if (!responseContent) {
      console.error('Warning: Empty response content, showing all chunks:');
      res.printAllChunks();
    }
    
    console.log('Assistant response:', responseContent);
    return responseContent;
  } catch (error) {
    logError('Get Assistant Response', error);
    throw error;
  }
}

async function runTest() {
  try {
    logStep(1, 'Creating test user');
    const userId = await createTestUser();
    
    logStep(2, 'Creating test conversation');
    const conversation = await createTestConversation(userId);
    const conversationId = conversation.id;
    
    logStep(3, 'Generating welcome message');
    try {
      await generateWelcomeMessage(conversationId, userId);
      console.log('Welcome message generated successfully');
      
      // Retrieve the welcome message to verify it worked
      const messages = await storage.getChatMessages(conversationId);
      if (messages.length > 0 && messages[0].role === 'assistant') {
        console.log('Welcome message content:', messages[0].content.substring(0, 150) + '...');
      } else {
        console.error('Warning: Welcome message was not found in the conversation');
      }
    } catch (error) {
      logError(3, error);
      console.log('Continuing test despite welcome message error...');
    }
    
    // Delay to ensure database operations are complete
    await delay(1000);
    
    logStep(4, 'Initiating campaign creation');
    const campaignPrompt = 'I want to create a new Amazon campaign';
    const response1 = await getAssistantResponse(conversationId, userId, campaignPrompt);
    
    // Define test inputs for each step of campaign creation
    const testInputs = [
      'Summer Sale SP Campaign',             // Campaign name
      '$50',                                 // Daily budget
      'tomorrow',                            // Start date
      'manual targeting',                    // Targeting type
      'Summer Shoes',                        // Ad group name
      '$1.20',                               // Default bid
      'B0EXAMPLEASIN1, B0EXAMPLEASIN2',      // Products
      'summer shoes, sandals, flip flops',   // Keywords
      'phrase match',                        // Match type
      'winter, boots',                       // Negative keywords
      'Dynamic bids - down only'             // Bidding strategy
    ];
    
    // Proceed through all campaign creation steps
    for (let i = 0; i < testInputs.length; i++) {
      const stepNum = i + 5;
      logStep(stepNum, `Campaign creation step ${i + 1}`);
      const input = testInputs[i];
      console.log('User input:', input);
      
      try {
        const response = await getAssistantResponse(conversationId, userId, input);
        console.log('Step complete. Assistant response contains', response.length, 'characters');
        
        // Short delay between steps to avoid rate limiting
        await delay(500);
      } catch (error) {
        logError(stepNum, error);
        console.log('Stopping the test due to error in campaign creation step');
        break;
      }
    }
    
    logStep(16, 'Test completed');
    console.log('The test has completed. Check logs above for any errors.');
    
    // Print final conversation state
    const finalMessages = await storage.getChatMessages(conversationId);
    console.log('\nFinal conversation state:');
    console.log('Total messages:', finalMessages.length);
    
    finalMessages.forEach((msg, i) => {
      console.log(`\nMessage ${i + 1} (${msg.role}):`);
      console.log(msg.content.substring(0, 150) + (msg.content.length > 150 ? '...' : ''));
    });
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
console.log('Starting campaign flow test');
runTest().then(() => {
  console.log('Test execution completed');
}).catch(err => {
  console.error('Unhandled error in test:', err);
}); 