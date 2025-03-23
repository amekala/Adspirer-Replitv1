/**
 * Test script for the enhanced message recovery mechanism
 * 
 * This script tests the full message flow with the improved persistence:
 * 1. Creates a new conversation
 * 2. Sends a message that triggers the RAG system
 * 3. Verifies that the message and response are correctly persisted
 * 4. Tests the recovery mechanism by manually triggering a message recovery
 */

// Using native fetch in Node.js ESM

async function testMessageRecovery() {
  console.log('Starting message recovery test...');
  
  try {
    // Step 1: Create a new conversation
    console.log('Creating a new conversation...');
    const newConversation = await fetch('http://localhost:5000/api/chat/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Recovery Conversation',
      }),
      credentials: 'include'
    }).then(res => res.json());
    
    console.log(`Created conversation with ID: ${newConversation.id}`);
    
    // Step 2: Send a message to trigger RAG
    console.log('Sending a test message...');
    const testMessage = 'How are my Amazon campaigns performing in terms of ROAS?';
    const msgResponse = await fetch(`http://localhost:5000/api/chat/conversations/${newConversation.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testMessage,
        role: 'user'
      }),
      credentials: 'include'
    }).then(res => res.json());
    
    console.log(`Added user message with ID: ${msgResponse.id}`);
    
    // Step 3: Trigger the two-LLM RAG endpoint
    console.log('Triggering RAG query...');
    const queryStart = Date.now();
    const streamingId = `streaming-${Date.now()}`;
    
    // Using non-streaming endpoint for testing
    await fetch(`http://localhost:5000/api/rag/query-two-llm/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversationId: newConversation.id,
        query: testMessage,
        streamingId
      }),
      credentials: 'include'
    });
    
    console.log(`RAG query completed in ${Date.now() - queryStart}ms`);
    
    // Step 4: Wait for server processing (3 seconds)
    console.log('Waiting for server to process message...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Step 5: Check if the message was correctly persisted
    console.log('Verifying message persistence...');
    const conversation = await fetch(`http://localhost:5000/api/chat/conversations/${newConversation.id}`, {
      credentials: 'include'
    }).then(res => res.json());
    
    console.log(`Found ${conversation.messages.length} messages in conversation`);
    
    // Step 6: Verify assistant message exists
    const assistantMessages = conversation.messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      console.log('✅ Success: Assistant message was correctly persisted');
      console.log(`Message ID: ${assistantMessages[0].id}`);
      console.log(`Message length: ${assistantMessages[0].content.length} characters`);
    } else {
      console.log('❌ Error: No assistant message found!');
      
      // Step 7: Test manual recovery by adding a message
      console.log('Testing manual recovery mechanism...');
      const recoveryId = `recovery-${Date.now()}`;
      const recoveryMessage = {
        id: recoveryId,
        role: 'assistant',
        content: 'This is a recovery test message.',
        createdAt: new Date().toISOString(),
        metadata: {
          recovered: true,
          recoveryTimestamp: Date.now()
        }
      };
      
      // Add the recovery message
      await fetch(`http://localhost:5000/api/chat/conversations/${newConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recoveryMessage),
        credentials: 'include'
      });
      
      console.log('Recovery message added, checking persistence...');
      
      // Verify recovery worked
      const recoveredConversation = await fetch(`http://localhost:5000/api/chat/conversations/${newConversation.id}`, {
        credentials: 'include'
      }).then(res => res.json());
      
      const recoveredMessages = recoveredConversation.messages.filter(m => m.id === recoveryId);
      if (recoveredMessages.length > 0) {
        console.log('✅ Success: Recovery mechanism works correctly');
      } else {
        console.log('❌ Error: Recovery mechanism failed');
      }
    }
    
    console.log('Test completed!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testMessageRecovery();