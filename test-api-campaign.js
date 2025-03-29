/**
 * API Test for Campaign Creation Flow
 * 
 * This script tests the complete campaign creation API flow:
 * 1. Creates a new conversation
 * 2. Checks for welcome message
 * 3. Sends campaign creation requests through the API
 * 4. Follows the entire conversation flow
 */

import fetch from 'node-fetch';
import { TextDecoder } from 'util';
import 'dotenv/config';

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_USER_EMAIL = 'test@example.com';
const TEST_USER_PASSWORD = 'password123'; // Change as needed

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
};

// API helper functions
async function login() {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    logError('Login', error);
    throw error;
  }
}

async function createNewConversation(token) {
  try {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'API Test: Campaign Creation Flow',
        generateWelcome: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.status} ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    logError('Create Conversation', error);
    throw error;
  }
}

async function getConversationMessages(token, conversationId) {
  try {
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    logError('Get Messages', error);
    throw error;
  }
}

async function sendUserMessage(token, conversationId, content) {
  try {
    console.log(`Sending user message: "${content}"`);
    
    const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        role: 'user',
        content
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${await response.text()}`);
    }
    
    return await response.json();
  } catch (error) {
    logError('Send Message', error);
    throw error;
  }
}

async function getCompletionResponse(token, conversationId, userMessage) {
  try {
    // First send the user message
    await sendUserMessage(token, conversationId, userMessage);
    
    // Then get the AI's response by triggering completions endpoint
    const response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        conversationId,
        message: userMessage
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get completion: ${response.status} ${await response.text()}`);
    }
    
    // Parse SSE response stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseContent = '';
    
    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      
      if (done) {
        reading = false;
        break;
      }
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          
          if (dataStr === '[DONE]') {
            reading = false;
            break;
          }
          
          try {
            const data = JSON.parse(dataStr);
            if (data.content) {
              responseContent += data.content;
            }
          } catch (e) {
            console.error('Error parsing SSE data:', dataStr);
          }
        }
      }
    }
    
    // Wait for a short delay to make sure the message is saved to the database
    await delay(200);
    
    console.log('AI response:', responseContent.substring(0, 150) + (responseContent.length > 150 ? '...' : ''));
    return responseContent;
  } catch (error) {
    logError('Get Completion', error);
    throw error;
  }
}

async function waitForWelcomeMessage(token, conversationId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    console.log(`Checking for welcome message (attempt ${i + 1}/${maxAttempts})...`);
    
    const messages = await getConversationMessages(token, conversationId);
    
    if (messages.length > 0 && messages[0].role === 'assistant') {
      console.log('Welcome message received:', messages[0].content.substring(0, 150) + '...');
      return messages[0];
    }
    
    console.log('No welcome message yet, waiting...');
    await delay(1000);  // Wait 1 second before checking again
  }
  
  throw new Error('Welcome message not received after multiple attempts');
}

async function runTest() {
  try {
    // Step 1: Login
    logStep(1, 'Logging in');
    const token = await login();
    console.log('Login successful, token received');
    
    // Step 2: Create a new conversation
    logStep(2, 'Creating a new conversation');
    const conversation = await createNewConversation(token);
    console.log('Conversation created with ID:', conversation.id);
    
    // Step 3: Wait for welcome message
    logStep(3, 'Waiting for welcome message');
    await waitForWelcomeMessage(token, conversation.id);
    
    // Step 4: Initiate campaign creation
    logStep(4, 'Initiating campaign creation');
    const campaignPrompt = 'I want to create a new Amazon campaign';
    await getCompletionResponse(token, conversation.id, campaignPrompt);
    
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
    
    // Step 5+: Process through all campaign creation steps
    for (let i = 0; i < testInputs.length; i++) {
      const stepNum = i + 5;
      logStep(stepNum, `Campaign creation step ${i + 1}`);
      const input = testInputs[i];
      
      await getCompletionResponse(token, conversation.id, input);
      
      // Short delay between steps to avoid rate limiting
      await delay(500);
    }
    
    // Step 16: Check final conversation state
    logStep(16, 'Checking final conversation state');
    const finalMessages = await getConversationMessages(token, conversation.id);
    console.log('Final conversation has', finalMessages.length, 'messages');
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the test
console.log('Starting API campaign creation test');
runTest().then(() => {
  console.log('Test execution completed');
}).catch(err => {
  console.error('Unhandled error in test:', err);
}); 