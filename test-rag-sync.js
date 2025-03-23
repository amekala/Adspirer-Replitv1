/**
 * Test script for RAG (Retrieval-Augmented Generation) synchronization
 * 
 * This script validates the complete RAG pipeline:
 * 1. Text to embedding conversion
 * 2. Vector similarity search
 * 3. Campaign ID extraction
 * 4. SQL data retrieval
 * 5. Context assembly
 * 6. AI response generation
 * 
 * Run this script to verify the entire RAG system is working correctly
 */

import fetch from 'node-fetch';
import { writeFile } from 'fs/promises';

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'demo@adspirer.io';
const TEST_PASSWORD = 'password123';

// Test queries that should trigger RAG
const TEST_QUERIES = [
  'How are my Amazon campaigns performing?',
  'Which campaigns had the highest CTR last month?',
  'Compare performance between my Google and Amazon ads',
  'Show me underperforming campaigns with high spend',
  'What are the trends in my ad performance over the last 3 months?'
];

function extractCookiesFromResponse(stdout) {
  // Extract the cookies from the response headers
  const cookieRegex = /set-cookie:([^;]*;)/gi;
  const matches = [...stdout.matchAll(cookieRegex)];
  return matches.map(match => match[1].trim()).join(' ');
}

async function testRagSync() {
  try {
    console.log('Starting RAG sync test...');
    
    // Step 1: Login to get session cookie
    console.log('Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
      redirect: 'follow',
      credentials: 'include',
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    // Extract cookies for subsequent requests
    const cookieHeader = loginResponse.headers.get('set-cookie');
    const cookies = cookieHeader || '';
    console.log('Login successful, obtained session cookie');
    
    // Create a cookie jar for session management
    const parsedCookies = cookies.split(',').map(cookie => cookie.split(';')[0].trim()).join('; ');
    console.log(`Session cookies: ${parsedCookies ? '[cookies received]' : '[no cookies]'}`);
    
    // Create a test log file
    const logFile = `rag-test-results-${new Date().toISOString().replace(/:/g, '-')}.json`;
    const testResults = [];
    
    // Step 2: Create a new conversation
    console.log('Creating new conversation...');
    const conversationResponse = await fetch(`${BASE_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookies ? { Cookie: cookies } : {}),
      },
      credentials: 'include',
      body: JSON.stringify({
        title: 'RAG Test Conversation',
      }),
    });
    
    if (!conversationResponse.ok) {
      throw new Error(`Failed to create conversation: ${conversationResponse.status} ${conversationResponse.statusText}`);
    }
    
    const conversation = await conversationResponse.json();
    console.log(`Created conversation with ID: ${conversation.id}`);
    
    // Step 3: Test each query
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i];
      console.log(`\nTesting query ${i+1}/${TEST_QUERIES.length}: "${query}"`);
      
      // Step 3.1: Send a message
      console.log('Sending message...');
      const messageResponse = await fetch(`${BASE_URL}/api/chat/conversations/${conversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookies ? { Cookie: cookies } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          role: 'user',
          content: query,
        }),
      });
      
      if (!messageResponse.ok) {
        console.error(`Failed to send message: ${messageResponse.status} ${messageResponse.statusText}`);
        continue;
      }
      
      const message = await messageResponse.json();
      console.log(`Sent message with ID: ${message.id}`);
      
      // Step 3.2: Trigger the RAG query with additional debugging
      console.log('Triggering RAG query with debug info...');
      const ragResponse = await fetch(`${BASE_URL}/api/rag/query/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookies ? { Cookie: cookies } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: conversation.id,
          query: query,
          includeDebugInfo: true
        }),
      });
      
      if (!ragResponse.ok) {
        console.error(`RAG query failed: ${ragResponse.status} ${ragResponse.statusText}`);
        continue;
      }
      
      const ragResult = await ragResponse.json();
      console.log(`RAG response received with ${ragResult.campaigns?.length || 0} campaigns`);
      
      // Record test results
      testResults.push({
        query,
        queryTimestamp: new Date().toISOString(),
        retrievalSuccess: ragResult.retrievalSuccess,
        campaignsCount: ragResult.campaigns?.length || 0,
        insightsGenerated: Object.keys(ragResult.insights || {}).length > 0,
        answer: ragResult.answer?.substring(0, 100) + '...' // First 100 chars of answer
      });
      
      // If we have debug info, log vector search details
      if (ragResult.debugInfo) {
        console.log('--- Vector Search Debug Info ---');
        console.log(`Query vector dimensions: ${ragResult.debugInfo.queryVectorDimensions}`);
        console.log(`Similar vectors found: ${ragResult.debugInfo.similarVectors?.length || 0}`);
        console.log(`Campaign IDs extracted: ${ragResult.debugInfo.campaignIds?.join(', ') || 'none'}`);
        console.log(`Context length (chars): ${ragResult.debugInfo.contextLength || 0}`);
        console.log('-----------------------------');
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Save test results to file
    await writeFile(logFile, JSON.stringify(testResults, null, 2));
    console.log(`\nTest completed! Results saved to ${logFile}`);
    
    // Summary statistics
    const successfulQueries = testResults.filter(r => r.retrievalSuccess).length;
    console.log(`\nSuccess rate: ${successfulQueries}/${testResults.length} (${Math.round(successfulQueries/testResults.length*100)}%)`);
    console.log(`Average campaigns retrieved: ${testResults.reduce((acc, r) => acc + r.campaignsCount, 0) / testResults.length}`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testRagSync();