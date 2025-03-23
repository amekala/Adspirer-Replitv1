/**
 * Test script for the chat functionality
 * This script tests the end-to-end flow of:
 * 1. Creating a new conversation
 * 2. Sending a message
 * 3. Getting a response using the RAG system
 */

import fetch from 'node-fetch';

async function main() {
  console.log('⎯'.repeat(50));
  console.log('🧪 TESTING COMPLETE CHAT FLOW');
  console.log('⎯'.repeat(50));
  
  // 1. Login first to get a session
  console.log('1. Logging in to get session cookies...');
  
  let sessionCookie = '';
  try {
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'adspirer@example.com', 
        password: 'password' 
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    // Extract cookies from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      sessionCookie = setCookieHeader;
      console.log('✅ Login successful, session cookie obtained');
    } else {
      console.log('⚠️ Login successful but no cookies received');
    }
    
    const userData = await loginResponse.json();
    console.log(`Logged in as user: ${userData.email}`);
    
  } catch (error) {
    console.error('❌ Login error:', error);
    process.exit(1);
  }
  
  // 2. Create a new conversation
  console.log('\n2. Creating a new conversation...');
  
  let conversationId;
  try {
    const conversationResponse = await fetch('http://localhost:5000/api/chat/conversations', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({ title: `Test Conversation ${Date.now()}` })
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`Failed to create conversation: ${conversationResponse.status}`);
    }
    
    const conversation = await conversationResponse.json();
    conversationId = conversation.id;
    console.log(`✅ Created conversation with ID: ${conversationId}`);
    
  } catch (error) {
    console.error('❌ Conversation creation error:', error);
    process.exit(1);
  }
  
  // 3. Verify the conversation is empty
  console.log('\n3. Checking initial conversation state...');
  
  try {
    const getConversationResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (!getConversationResponse.ok) {
      throw new Error(`Failed to get conversation: ${getConversationResponse.status}`);
    }
    
    const conversationData = await getConversationResponse.json();
    console.log(`✅ Conversation has ${conversationData.messages?.length || 0} initial messages`);
    
  } catch (error) {
    console.error('❌ Get conversation error:', error);
  }
  
  // 4. Send a user message
  console.log('\n4. Sending a user message...');
  
  let userMessageId;
  const testMessage = 'Test message for debugging ' + Date.now();
  
  try {
    const sendMessageResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        role: 'user',
        content: testMessage
      })
    });
    
    if (!sendMessageResponse.ok) {
      throw new Error(`Failed to send message: ${sendMessageResponse.status}`);
    }
    
    const userMessage = await sendMessageResponse.json();
    userMessageId = userMessage.id;
    console.log(`✅ User message sent with ID: ${userMessageId}`);
    
  } catch (error) {
    console.error('❌ Send message error:', error);
  }
  
  // 5. Trigger RAG query (normally happens after user message)
  console.log('\n5. Triggering RAG query...');
  
  const streamingId = `streaming-${Date.now()}`;
  console.log(`Generated streaming ID: ${streamingId}`);
  
  try {
    const ragResponse = await fetch('http://localhost:5000/api/rag/query-two-llm/sync', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': sessionCookie
      },
      body: JSON.stringify({
        conversationId: conversationId,
        query: testMessage,
        streamingId: streamingId
      })
    });
    
    if (!ragResponse.ok) {
      throw new Error(`RAG query failed: ${ragResponse.status}`);
    }
    
    const ragResult = await ragResponse.json();
    console.log(`✅ RAG query completed, response length: ${ragResult.answer.length} chars`);
    
  } catch (error) {
    console.error('❌ RAG query error:', error);
  }
  
  // Wait for database to process
  console.log('\nWaiting 1 second for database updates...');
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 6. Verify that both messages are in the conversation
  console.log('\n6. Verifying final conversation state...');
  
  try {
    const finalConversationResponse = await fetch(`http://localhost:5000/api/chat/conversations/${conversationId}`, {
      headers: { 'Cookie': sessionCookie }
    });
    
    if (!finalConversationResponse.ok) {
      throw new Error(`Failed to get final conversation: ${finalConversationResponse.status}`);
    }
    
    const finalConversationData = await finalConversationResponse.json();
    const messages = finalConversationData.messages || [];
    
    console.log(`✅ Conversation now has ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('\nMessages in conversation:');
      messages.forEach(msg => {
        console.log(`- [${msg.role}] ID: ${msg.id}, Content: "${msg.content.substring(0, 30)}..."`);
      });
      
      // Check if our user message is there
      const foundUserMessage = messages.some(m => m.id === userMessageId);
      console.log(`User message persistence: ${foundUserMessage ? '✅ Found' : '❌ Missing'}`);
      
      // Check if streaming message is there
      const foundAssistantMessage = messages.some(m => m.id === streamingId);
      console.log(`Assistant message persistence: ${foundAssistantMessage ? '✅ Found' : '❌ Missing'}`);
    }
    
  } catch (error) {
    console.error('❌ Final conversation check error:', error);
  }
  
  console.log('\n⎯'.repeat(50));
  console.log('Chat flow test completed!');
}

// Run the main test
main().catch(error => {
  console.error('Unhandled error in test:', error);
});