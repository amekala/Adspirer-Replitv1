/**
 * Simple OpenAI Client Test
 * 
 * This script tests the OpenAI client directly to verify our fixes
 */

import 'dotenv/config';
import OpenAI from 'openai';

// Initialize the OpenAI client
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }
  
  return new OpenAI({
    apiKey
  });
}

// Main test function
async function testOpenAIMessage() {
  try {
    console.log('Testing OpenAI message format fix...');
    const openai = getOpenAIClient();
    
    // Test message with only the expected fields
    const testMessages = [
      {
        role: "system",
        content: "You are a helpful assistant."
      },
      {
        role: "user",
        content: "Hello, can you help me create an Amazon campaign?"
      }
    ];
    
    console.log('Sending messages to OpenAI...');
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: testMessages,
      temperature: 0.7,
      text: {
        format: {
          type: "text"
        }
      },
      reasoning: {}
    });
    
    console.log('Response received!');
    console.log(`Output: "${response.output_text.substring(0, 100)}..."`);
    console.log('Test passed - Message format is now correct!');
    
  } catch (error) {
    console.error('Error testing OpenAI:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
  }
}

// Run the test
console.log('Starting OpenAI client test');
testOpenAIMessage().then(() => {
  console.log('Test execution completed');
}).catch(err => {
  console.error('Unhandled error in test:', err);
}); 