/**
 * Client-side code debugging test
 * This script simulates the client-side message handling to find issues with persistence
 */

import fetch from 'node-fetch';
import crypto from 'crypto';

// Simulated client-side message generation and handling
async function testClientMessageFlow() {
  console.log('⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
  console.log('🧪 TESTING CLIENT MESSAGE FLOW');
  console.log('⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
  
  try {
    // 1. Create a conversation directly through API
    console.log('1. Creating test conversation...');
    const userId = '903243fa-a65e-4d38-8236-798559b81941';
    const testTitle = `Client Test Conversation ${new Date().toISOString()}`;
    
    const conversationResponse = await fetch('http://localhost:5000/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: testTitle }),
      credentials: 'include'
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`Failed to create conversation: ${conversationResponse.status}`);
    }
    
    const conversation = await conversationResponse.json();
    console.log(`✅ Test conversation created with ID: ${conversation.id}`);
    
    // 2. Create user message
    console.log('\n2. Creating user message...');
    const userMessageResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversation.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: 'Test client message',
        role: 'user'
      }),
      credentials: 'include'
    });
    
    if (!userMessageResponse.ok) {
      throw new Error(`Failed to create user message: ${userMessageResponse.status}`);
    }
    
    const userMessage = await userMessageResponse.json();
    console.log(`✅ User message created with ID: ${userMessage.id}`);
    
    // 3. Generate streaming ID (as in client code)
    const clientStreamingId = `streaming-${Date.now()}`;
    console.log(`\n3. Client would generate streaming ID: ${clientStreamingId}`);
    
    // 4. Send RAG query directly
    console.log('\n4. Sending RAG query with streamingId...');
    console.log(`Query endpoint: /api/rag/query-two-llm`);
    console.log(`With payload: {
  conversationId: "${conversation.id}",
  query: "Test query for RAG",
  streamingId: "${clientStreamingId}"
}`);
    
    // Just trace this rather than actually sending it
    console.log(`\n5. Verifying message persistence...`);
    console.log(`GET /api/chat/conversations/${conversation.id}`);
    
    const messagesResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversation.id}`, {
      credentials: 'include'
    });
    
    if (!messagesResponse.ok) {
      throw new Error(`Failed to fetch messages: ${messagesResponse.status}`);
    }
    
    const messagesData = await messagesResponse.json();
    console.log(`Found ${messagesData.messages?.length || 0} messages in conversation`);
    
    if (messagesData.messages && messagesData.messages.length > 0) {
      console.log('\nMessages in database:');
      messagesData.messages.forEach(msg => {
        console.log(`- ID: ${msg.id}, Role: ${msg.role}, Content: "${msg.content.substring(0, 50)}..."`);
      });
    }
    
    console.log('\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
    console.log('Client message flow test completed!');
    
  } catch (error) {
    console.error('❌ ERROR during client test:', error);
  }
}

// Run the test
testClientMessageFlow();