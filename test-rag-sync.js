import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import https from 'https';
import http from 'http';

// This script tests our RAG API by:
// 1. Getting a valid session cookie via login
// 2. Using that to call the RAG sync endpoint with a sample query
// 3. Analyzing the response to confirm SQL data is being used

// Configuration
const BASE_URL = 'http://localhost:5000';
const EMAIL = 'test@example.com';
const PASSWORD = 'password123';
const TEST_QUERY = 'What are my best performing campaigns by ROAS?';

// Extract cookies from curl response
function extractCookiesFromResponse(stdout) {
  const lines = stdout.toString().split('\n');
  const cookieLines = lines.filter(line => line.includes('Set-Cookie:'));
  
  return cookieLines.map(line => {
    const cookiePart = line.split('Set-Cookie:')[1].trim();
    return cookiePart.split(';')[0];
  }).join('; ');
}

// Main function
async function testRagSync() {
  console.log('Starting RAG sync test...');
  
  // Step 1: Login to get a valid session cookie
  console.log('Logging in to get session cookie...');
  
  const loginCmd = `curl -v -X POST ${BASE_URL}/api/auth/login -H "Content-Type: application/json" -d '{"email":"${EMAIL}","password":"${PASSWORD}"}'`;
  
  try {
    // Execute the login request
    const { stdout, stderr } = await new Promise((resolve, reject) => {
      exec(loginCmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
    
    // Extract cookies for subsequent requests
    const cookies = extractCookiesFromResponse(stderr);
    console.log('Login successful, got cookies');
    
    // Step 2: Call the RAG sync endpoint
    console.log('Calling RAG sync endpoint with query:', TEST_QUERY);
    
    const ragCmd = `curl -X POST ${BASE_URL}/api/rag/query/sync -H "Content-Type: application/json" -H "Cookie: ${cookies}" -d '{"query":"${TEST_QUERY}"}'`;
    
    const { stdout: ragResponse } = await new Promise((resolve, reject) => {
      exec(ragCmd, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
    
    // Step 3: Analyze the response
    console.log('Response received, analyzing...');
    
    try {
      const response = JSON.parse(ragResponse);
      
      console.log('== RAG QUERY TEST RESULTS ==');
      console.log('Query:', TEST_QUERY);
      console.log('Has answer:', !!response.answer);
      console.log('Number of campaigns retrieved:', response.campaigns?.length || 0);
      console.log('Retrieval success:', response.retrievalSuccess);
      
      if (response.campaigns && response.campaigns.length > 0) {
        console.log('\nSample campaign data retrieved:');
        console.log(JSON.stringify(response.campaigns[0], null, 2));
      }
      
      if (response.insights) {
        console.log('\nInsights generated from SQL data:');
        console.log(JSON.stringify(response.insights, null, 2));
      }
      
      console.log('\nTest conclusion:');
      if (response.retrievalSuccess && response.campaigns && response.campaigns.length > 0) {
        console.log('✅ SUCCESS: RAG query is successfully pulling data from SQL');
      } else {
        console.log('❌ FAILURE: RAG query is not retrieving SQL data');
        console.log('Error details:', response.error || 'No specific error message provided');
      }
      
    } catch (parseError) {
      console.error('Error parsing RAG response:', parseError);
      console.log('Raw response:', ragResponse);
    }
    
  } catch (error) {
    console.error('Error executing test:', error);
  }
}

// Run the test
testRagSync();