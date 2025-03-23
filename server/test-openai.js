// Simple test script for OpenAI API integration
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
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
  // Start with a new params object for the Responses API
  const responsesParams = {
    model: params.model,
  };

  // Handle streaming (only set if true to avoid sending false)
  if (params.stream) {
    responsesParams.stream = true;
  }

  // Convert messages array to input format
  if (params.messages && Array.isArray(params.messages)) {
    // For cases with messages array
    responsesParams.input = params.messages;
  } else if (params.input) {
    // If input is already provided
    responsesParams.input = params.input;
  }

  // Add required format parameters for Responses API
  responsesParams.text = {
    format: {
      type: "text"
    }
  };
  
  // Add reasoning field (used by the model for step-by-step thinking)
  responsesParams.reasoning = {};
  
  // Set default storage parameter
  responsesParams.store = true;

  // Handle optional parameters
  if (params.temperature !== undefined) {
    responsesParams.temperature = params.temperature;
  }

  // Convert max_tokens to max_output_tokens
  if (params.max_tokens !== undefined) {
    responsesParams.max_output_tokens = params.max_tokens;
  }
  
  // Use max_output_tokens directly if provided
  if (params.max_output_tokens !== undefined) {
    responsesParams.max_output_tokens = params.max_output_tokens;
  }

  // Add any tools if provided
  if (params.tools) {
    responsesParams.tools = params.tools;
  }

  // Add other optional parameters
  if (params.top_p !== undefined) {
    responsesParams.top_p = params.top_p;
  }
  
  console.log('Converted params:', JSON.stringify(responsesParams, null, 2));
  return responsesParams;
}

// Test the OpenAI Responses API
async function testAPIs() {
  try {
    console.log('--- Testing OpenAI API integration with Responses API ---');
    const openaiClient = getOpenAIClient();
    
    // Test messages - adapted for Responses API format
    const messages = [
      { role: 'developer', content: 'You are a helpful assistant for an advertising platform.' },
      { role: 'user', content: 'What are the most important metrics for Amazon advertising?' }
    ];
    
    // Test Responses API
    console.log('\n=== Testing Responses API ===');
    try {
      const responsesParams = {
        model: 'gpt-3.5-turbo',
        input: messages,
        temperature: 0.7,
        max_output_tokens: 100,
        text: {
          format: {
            type: "text"
          }
        },
        reasoning: {},
        store: true
      };
      
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