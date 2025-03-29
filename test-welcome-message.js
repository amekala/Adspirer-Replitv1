/**
 * Test Welcome Message Generation
 * 
 * This script tests the welcome message generation specifically
 */

import 'dotenv/config';
import { generateWelcomeMessage } from './server/services/openai.js';
import { storage } from './server/storage.js';
import { v4 as uuidv4 } from 'uuid';

// Create a test user if needed
async function getOrCreateTestUser() {
  try {
    // Try to find an existing test user
    const testUser = await storage.getUserByEmail('test@example.com');
    if (testUser) {
      console.log('Using existing test user:', testUser.id);
      return testUser.id;
    }
    
    // If no test user exists, create one
    console.log('Creating new test user...');
    const userId = uuidv4();
    const user = await storage.createUser({
      id: userId,
      email: 'test@example.com',
      passwordHash: 'testpasswordhash',
      name: 'Test User'
    });
    console.log('Created new test user with ID:', user.id);
    return user.id;
  } catch (error) {
    console.error('Error getting/creating test user:', error);
    throw error;
  }
}

// Test welcome message generation
async function testWelcomeMessage(userId) {
  try {
    console.log('\n--- Testing Welcome Message Generation ---');
    
    // Create a new conversation
    const conversation = await storage.createChatConversation(userId, 'Welcome Message Test');
    console.log(`Created conversation with ID: ${conversation.id}`);
    
    // Generate welcome message
    console.log('Generating welcome message...');
    await generateWelcomeMessage(conversation.id, userId);
    
    // Wait a moment for the message to be saved
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if welcome message was created
    const messages = await storage.getChatMessages(conversation.id);
    
    if (messages.length > 0) {
      console.log('✅ Success: Welcome message was generated');
      console.log('Message content (first 100 chars):', 
        messages[0].content.substring(0, 100) + '...');
      return true;
    } else {
      console.log('❌ Failure: No welcome message was generated');
      return false;
    }
  } catch (error) {
    console.error('Error testing welcome message:', error);
    console.error('Error details:', error.stack || error);
    return false;
  }
}

// Main function
async function runTest() {
  try {
    // Get or create test user
    const userId = await getOrCreateTestUser();
    
    // Test welcome message generation
    const success = await testWelcomeMessage(userId);
    
    console.log('\n--- Test Results ---');
    console.log(success ? '✅ Welcome message test passed' : '❌ Welcome message test failed');
  } catch (error) {
    console.error('Test failed with error:', error);
  } finally {
    // Close any open connections
    process.exit(0);
  }
}

// Run the test
console.log('Starting welcome message test');
runTest(); 