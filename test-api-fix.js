/**
 * Test script to verify OpenAI API connection
 */

// Import required modules
import 'dotenv/config';
import OpenAI from 'openai';
import readline from 'readline';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to clean API key
function cleanApiKey(key) {
  if (!key) return null;
  // Remove any whitespace, newlines, etc.
  return key.replace(/\s+/g, '');
}

// Function to get user input
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Function to initialize OpenAI client
function getOpenAIClient(apiKey) {
  // Log API key info (but not the full key for security)
  if (!apiKey) {
    console.error('❌ ERROR: No API key provided');
    process.exit(1);
  }
  
  // Clean the API key
  const cleanedKey = cleanApiKey(apiKey);
  
  // Log API key information (first few chars only for security)
  console.log(`API Key provided, starts with: ${cleanedKey.substring(0, 10)}...`);
  console.log(`API Key length: ${cleanedKey.length} characters`);
  
  // Create and return the OpenAI client
  return new OpenAI({ 
    apiKey: cleanedKey 
  });
}

// Main test function
async function runTest(apiKey) {
  console.log('Testing OpenAI API connection...');
  
  try {
    // Get the OpenAI client
    const openai = getOpenAIClient(apiKey);
    
    // Make a simple API call
    const response = await openai.responses.create({
      model: "gpt-4o",
      input: "Say 'Hello, testing OpenAI connection' in one sentence",
      temperature: 0.7,
      text: {
        format: {
          type: "text"
        }
      },
      reasoning: {}
    });
    
    // Log the result
    console.log('\n✅ SUCCESS! Response received:');
    console.log(`"${response.output_text}"`);
    
    return true;
  } catch (error) {
    // Log error details
    console.error('\n❌ ERROR connecting to OpenAI API:');
    console.error(error);
    
    // Check for common issues
    if (error.status === 401) {
      console.error('This appears to be an authentication error. Your API key may be invalid.');
    } else if (error.status === 429) {
      console.error('You have hit rate limits with the OpenAI API.');
    }
    
    return false;
  }
}

// Run the test
async function main() {
  console.log('=== OpenAI API Connection Test ===\n');
  
  try {
    // Get API key from environment first
    let apiKey = process.env.OPENAI_API_KEY;
    
    // If no key in environment, ask user
    if (!apiKey) {
      console.log('No API key found in environment variables.');
      apiKey = await question('Please enter your OpenAI API key: ');
    }
    
    // Run the test with the provided API key
    const success = await runTest(apiKey);
    
    if (success) {
      console.log('\n✅ TEST PASSED: Successfully connected to OpenAI API!');
    } else {
      console.log('\n❌ TEST FAILED: Could not connect to OpenAI API');
    }
  } catch (err) {
    console.error('\n❌ TEST ERROR:', err);
  } finally {
    console.log('\n=== Test Complete ===');
    rl.close();
  }
}

main(); 