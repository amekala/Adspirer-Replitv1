/**
 * This script tests the non-streaming RAG endpoint specifically
 * to debug message persistence issues
 */

import fetch from 'node-fetch';

async function testNonStreaming() {
  console.log('⎯'.repeat(40));
  console.log('🔍 TESTING NON-STREAMING RAG ENDPOINT');
  console.log('⎯'.repeat(40));

  // 1. Login to get session cookie
  console.log('1. Logging in to get session cookies...');
  const loginResponse = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'testuser@example.com',
      password: 'password123'
    })
  });

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
  }

  const loginData = await loginResponse.json();
  console.log(`✅ Login successful, user ID: ${loginData.id}`);

  // Extract session cookie
  const sessionCookie = loginResponse.headers.get('set-cookie');
  if (!sessionCookie) {
    throw new Error('No session cookie received');
  }

  // 2. Create a new conversation
  console.log('\n2. Creating a new conversation...');
  const createConversationResponse = await fetch('http://localhost:5000/api/chat/conversations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify({
      title: 'Debug Test ' + Date.now()
    })
  });

  if (!createConversationResponse.ok) {
    throw new Error(`Failed to create conversation: ${createConversationResponse.status}`);
  }

  const conversation = await createConversationResponse.json();
  const conversationId = conversation.id;
  console.log(`✅ Created conversation with ID: ${conversationId}`);

  // 3. Send a message using the non-streaming endpoint
  console.log('\n3. Sending direct message to non-streaming RAG endpoint...');
  const testMessage = `Test non-streaming message ${Date.now()}`;
  const streamingId = `streaming-${Date.now()}`;
  
  console.log(`Generated streaming ID: ${streamingId}`);
  
  const requestBody = {
    conversationId: conversationId,
    query: testMessage,
    streamingId: streamingId
  };
  
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  const ragResponse = await fetch('http://localhost:5000/api/rag/query-two-llm/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    },
    body: JSON.stringify(requestBody)
  });

  if (!ragResponse.ok) {
    throw new Error(`RAG query failed: ${ragResponse.status} ${ragResponse.statusText}`);
  }

  const responseData = await ragResponse.json();
  console.log(`✅ RAG query completed, response length: ${responseData.answer?.length || 0} chars`);
  
  // Wait a bit for any async DB operations to complete
  console.log('\nWaiting 2 seconds for database updates...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 4. Check the conversation state
  console.log('\n4. Checking conversation state...');
  const finalConversationResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': sessionCookie
    }
  });

  if (!finalConversationResponse.ok) {
    throw new Error(`Failed to fetch final conversation: ${finalConversationResponse.status}`);
  }

  const finalConversationData = await finalConversationResponse.json();
  const messages = finalConversationData.messages || [];
  console.log(`✅ Conversation now has ${messages.length} messages`);

  if (messages.length > 0) {
    console.log('\nMessages in conversation:');
    for (const msg of messages) {
      console.log(`- [${msg.role}] ID: ${msg.id.substring(0, 36)}, Content: "${msg.content.substring(0, 30)}..."`);
    }

    // Check if our test message exists
    const foundUserMessage = messages.some(m => m.role === 'user' && m.content === testMessage);
    const foundAssistantMessage = messages.some(m => m.role === 'assistant' && m.id === streamingId);
    
    console.log(`User message persistence: ${foundUserMessage ? '✅ Found' : '❌ Missing'}`);
    console.log(`Assistant message persistence: ${foundAssistantMessage ? '✅ Found' : '❌ Missing'}`);
  } else {
    console.log('No messages found in the conversation!');
  }

  console.log('\nDebug test completed!');
}

// Run the test
testNonStreaming().catch(error => {
  console.error('Error running test:', error);
  process.exit(1);
});