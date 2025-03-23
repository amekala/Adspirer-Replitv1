/**
 * Test script for message persistence issues
 * 
 * This script tests the full message flow between client and server,
 * focusing specifically on ID consistency during message creation and retrieval.
 */

import { randomUUID } from 'crypto';
import { storage } from './server/storage.js';

async function testMessagePersistence() {
  console.log('⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
  console.log('🧪 TESTING MESSAGE PERSISTENCE');
  console.log('⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
  
  try {
    // 1. Create a test conversation
    const userId = '903243fa-a65e-4d38-8236-798559b81941'; // Test user ID
    const testTitle = `Test Conversation ${new Date().toISOString()}`;
    
    console.log(`Creating test conversation with title: ${testTitle}`);
    const conversation = await storage.createChatConversation(userId, testTitle);
    console.log(`✅ Test conversation created with ID: ${conversation.id}`);
    
    // 2. Create a message with a pre-defined ID (simulating client-side streaming ID)
    const streamingId = `streaming-${Date.now()}`;
    console.log(`\nTesting message creation with pre-defined ID: ${streamingId}`);
    
    const userMessage = await storage.createChatMessage({
      id: streamingId,
      conversationId: conversation.id,
      role: 'user',
      content: 'Test message with predefined ID',
      metadata: { test: true }
    });
    
    console.log(`✅ Message created with ID: ${userMessage.id}`);
    
    // 3. Verify the message was saved with the correct ID
    console.log('\nVerifying message retrieval...');
    const messages = await storage.getChatMessages(conversation.id);
    
    if (messages.length === 0) {
      console.log('❌ ERROR: No messages found in conversation');
    } else {
      const retrievedMessage = messages.find(m => m.id === streamingId);
      
      if (retrievedMessage) {
        console.log(`✅ Message successfully retrieved with correct ID: ${retrievedMessage.id}`);
        console.log(`   Content: ${retrievedMessage.content}`);
      } else {
        console.log(`❌ ERROR: Message not found with ID ${streamingId}`);
        console.log('   Found these messages instead:');
        messages.forEach(m => {
          console.log(`   - ID: ${m.id}, Role: ${m.role}, Content: ${m.content}`);
        });
      }
    }
    
    console.log('\n⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯');
    console.log('Test completed!');
    
  } catch (error) {
    console.error('❌ ERROR during test:', error);
  }
}

// Run the test
testMessagePersistence();