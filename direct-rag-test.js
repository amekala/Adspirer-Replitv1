/**
 * Direct RAG System Test
 * 
 * This script tests the RAG functionality by directly calling the API
 * without relying on user authentication or session management.
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = 'http://localhost:5000';

// Test queries that should trigger RAG
const TEST_QUERIES = [
  'How are my Amazon campaigns performing?',
  'Which campaigns had the highest CTR last month?',
  'Compare performance between my Google and Amazon ads',
  'Show me underperforming campaigns with high spend',
  'What are the trends in my ad performance over the last 3 months?'
];

async function testRagDirect() {
  try {
    console.log('Starting direct RAG test...');
    
    // Test each query
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i];
      console.log(`\nTesting query ${i+1}/${TEST_QUERIES.length}: "${query}"`);
      
      // Call the test endpoint that doesn't require authentication
      console.log('Calling RAG test endpoint...');
      const testResponse = await fetch(`${BASE_URL}/api/rag/test-fallback?query=${encodeURIComponent(query)}`);
      
      if (!testResponse.ok) {
        console.error(`Test failed: ${testResponse.status} ${testResponse.statusText}`);
        continue;
      }
      
      const result = await testResponse.json();
      console.log('Response received!');
      
      // Log the results
      console.log('\n--- RAG Test Results ---');
      console.log(`Retrieval successful: ${result.retrievalSuccess}`);
      console.log(`Campaigns retrieved: ${result.campaigns?.length || 0}`);
      console.log(`Insights generated: ${Object.keys(result.insights || {}).length > 0 ? 'Yes' : 'No'}`);
      
      if (result.debugInfo) {
        console.log('\n--- Debug Info ---');
        console.log(`Query vector dimensions: ${result.debugInfo.queryVectorDimensions}`);
        console.log(`Similar vectors found: ${result.debugInfo.similarVectors?.length || 0}`);
        console.log(`Campaign IDs extracted: ${result.debugInfo.campaignIds?.join(', ') || 'none'}`);
        console.log(`Context length (chars): ${result.debugInfo.contextLength || 0}`);
        console.log(`Processing time (ms): ${result.debugInfo.processingTimeMs || 'unknown'}`);
      }
      
      // Print a snippet of the answer
      if (result.answer) {
        console.log('\n--- Answer Preview ---');
        console.log(result.answer.substring(0, 200) + '...');
      }
      
      console.log('------------------------\n');
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('Direct RAG test completed!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRagDirect();