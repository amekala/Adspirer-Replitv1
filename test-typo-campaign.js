/**
 * Test Campaign Creation with Typos
 * 
 * This script tests the campaign creation flow with typos in the "campaign" word
 */

import 'dotenv/config';
import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000/api';
const TEST_USER_EMAIL = 'abhilashreddy@gmail.com';
const TEST_USER_PASSWORD = 'T1l1icron!';

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
        title: 'Typo Test: Campaign Creation Flow',
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

async function getCompletionResponse(token, conversationId, userMessage) {
  try {
    // First send the user message
    const messageResponse = await fetch(`${API_URL}/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        role: 'user',
        content: userMessage
      })
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.status} ${await messageResponse.text()}`);
    }
    
    console.log(`Sent user message: "${userMessage}"`);
    
    // Then get the AI's response
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
    
    console.log('Processing AI response...');
    
    // Read the streaming response
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
      console.log('Received chunk:', chunk);
      
      // Process SSE format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          
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
            console.error('Error parsing SSE data:', e);
          }
        }
      }
    }
    
    console.log('AI response:', responseContent.substring(0, 150) + (responseContent.length > 150 ? '...' : ''));
    return responseContent;
  } catch (error) {
    logError('Get Completion', error);
    throw error;
  }
}

// Test scenarios with typos
const typoCases = [
  'create a camoaign',
  'I want to create a new campaing',
  'help me set up a campain',
  'I need to make a camapign'
];

async function testTypoScenario(token, typo) {
  try {
    logStep('TYPO TEST', `Testing phrase: "${typo}"`);
    
    // Create a new conversation for each test
    const conversation = await createNewConversation(token);
    console.log('Conversation created with ID:', conversation.id);
    
    // Wait for welcome message
    await waitForWelcomeMessage(token, conversation.id);
    
    // Send the typo message
    const response = await getCompletionResponse(token, conversation.id, typo);
    
    // Check if it properly detected as campaign creation
    const isCampaignRelated = response.toLowerCase().includes('campaign') || 
                             response.toLowerCase().includes('name') ||
                             response.toLowerCase().includes('budget');
    
    if (isCampaignRelated) {
      console.log(`✅ SUCCESS: Properly detected "${typo}" as campaign creation request`);
      return true;
    } else {
      console.log(`❌ FAILURE: Did not recognize "${typo}" as campaign creation request`);
      return false;
    }
  } catch (error) {
    logError('Typo Test', error);
    return false;
  }
}

// Main test function
async function runTests() {
  try {
    // Step 1: Login
    logStep(1, 'Logging in');
    const token = await login();
    console.log('Login successful, token received');
    
    // Test each typo scenario
    let passCount = 0;
    for (const typo of typoCases) {
      const passed = await testTypoScenario(token, typo);
      if (passed) passCount++;
      
      // Add a delay between tests to avoid rate limiting
      await delay(2000);
    }
    
    // Report results
    logStep('RESULTS', `${passCount}/${typoCases.length} typo tests passed`);
    
  } catch (error) {
    console.error('Test suite failed with error:', error);
  }
}

// Run the test
console.log('Starting campaign creation typo test');
runTests().then(() => {
  console.log('Test execution completed');
}).catch(err => {
  console.error('Unhandled error in test:', err);
}); 