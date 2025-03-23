// Simple test script for OpenAI API integration
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';
dotenv.config();

// Initialize the OpenAI client with the API key
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }
  return new OpenAI({ apiKey });
}

// Simple conversion function to test migration logic
function convertToResponsesFormat(params) {
  // Copy original params
  const newParams = { ...params };
  
  // Remove stream property if present as it's handled differently
  const isStream = newParams.stream;
  delete newParams.stream;
  
  // Set endpoint to /v1/chat/completions for compatibility
  newParams.endpoint = '/v1/chat/completions';
  
  // Add back stream property if it was present
  if (isStream !== undefined) {
    newParams.stream = isStream;
  }
  
  console.log('Converted params:', JSON.stringify(newParams, null, 2));
  return newParams;
}

// Test both APIs to verify functionality
async function testAPIs() {
  try {
    console.log('--- Testing OpenAI API integration with both endpoints ---');
    const openaiClient = getOpenAIClient();
    
    // Test messages
    const messages = [
      { role: 'system', content: 'You are a helpful assistant for an advertising platform.' },
      { role: 'user', content: 'What are the most important metrics for Amazon advertising?' }
    ];
    
    // Test ChatCompletion API (legacy)
    console.log('\n=== Testing legacy ChatCompletion API ===');
    try {
      const chatResponse = await openaiClient.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 100
      });
      console.log('ChatCompletion API response:');
      console.log('Content:', chatResponse.choices[0].message.content);
      console.log('Success ✅');
    } catch (error) {
      console.error('ChatCompletion API error:', error.message);
    }
    
    // Test Responses API (new)
    console.log('\n=== Testing new Responses API ===');
    try {
      const responsesParams = convertToResponsesFormat({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 100
      });
      
      const responsesResponse = await openaiClient.responses.create(responsesParams);
      console.log('Responses API response:');
      console.log('Content:', responsesResponse.output_text);
      console.log('Success ✅');
    } catch (error) {
      console.error('Responses API error:', error.message);
    }
    
    console.log('\n--- Test completed ---');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAPIs();