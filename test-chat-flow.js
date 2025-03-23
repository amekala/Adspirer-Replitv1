/**
 * Test script for the chat functionality
 * This script tests the end-to-end flow of:
 * 1. Creating a new conversation
 * 2. Sending a message
 * 3. Getting a response using the RAG system
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'password123';

// Test data
const TEST_MESSAGE = 'Show me the performance of my Amazon campaigns compared to Google campaigns.';

async function main() {
  try {
    console.log('Starting chat flow test...');
    
    // Step 1: Login to get session cookie
    console.log('Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
      redirect: 'follow',
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Login successful, obtained session cookie');
    
    // Step 2: Create a new conversation
    console.log('Creating new conversation...');
    const conversationResponse = await fetch(`${BASE_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        title: 'Test Conversation',
      }),
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`Failed to create conversation: ${conversationResponse.status} ${conversationResponse.statusText}`);
    }
    
    const conversation = await conversationResponse.json();
    console.log(`Created conversation with ID: ${conversation.id}`);
    
    // Step 3: Send a test message
    console.log('Sending test message...');
    const messageResponse = await fetch(`${BASE_URL}/api/chat/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        role: 'user',
        content: TEST_MESSAGE,
      }),
    });
    
    if (!messageResponse.ok) {
      throw new Error(`Failed to send message: ${messageResponse.status} ${messageResponse.statusText}`);
    }
    
    const message = await messageResponse.json();
    console.log(`Sent message with ID: ${message.id}`);
    
    // Step 4: Trigger the RAG query (this will use streaming in real app)
    console.log('Triggering RAG query...');
    const ragResponse = await fetch(`${BASE_URL}/api/rag/query/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookies,
      },
      body: JSON.stringify({
        conversationId: conversation.id,
        query: TEST_MESSAGE,
      }),
    });
    
    if (!ragResponse.ok) {
      throw new Error(`RAG query failed: ${ragResponse.status} ${ragResponse.statusText}`);
    }
    
    const ragResult = await ragResponse.json();
    console.log('RAG response received:', ragResult);
    
    // Step 5: Get conversation messages to verify
    console.log('Fetching conversation messages...');
    const conversationDetailResponse = await fetch(`${BASE_URL}/api/chat/conversations/${conversation.id}`, {
      headers: {
        Cookie: cookies,
      },
    });
    
    if (!conversationDetailResponse.ok) {
      throw new Error(`Failed to fetch conversation: ${conversationDetailResponse.status} ${conversationDetailResponse.statusText}`);
    }
    
    const conversationDetail = await conversationDetailResponse.json();
    console.log(`Retrieved ${conversationDetail.messages.length} messages`);
    
    // Log the result
    console.log('Test completed successfully!');
    console.log('User message:', conversationDetail.messages.find(m => m.role === 'user').content);
    console.log('AI response:', conversationDetail.messages.find(m => m.role === 'assistant')?.content || 'No AI response yet');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

main();