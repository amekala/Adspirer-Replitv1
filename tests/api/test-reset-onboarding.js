/**
 * Test Script for Reset Onboarding API
 * 
 * This script tests the reset onboarding API endpoint by:
 * 1. Logging in to get an auth token
 * 2. Making a direct API call to reset onboarding data
 * 3. Verifying the database state before and after
 */

import fetch from 'node-fetch';
import { db } from '../server/db.js';
import { eq } from 'drizzle-orm';
import { businessCore, brandIdentity, productsServices, creativeExamples, performanceContext, onboardingProgress } from '../shared/schema.js';

// Configuration
const API_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

// Function to login and get token
async function login() {
  try {
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error during login:', error);
    return null;
  }
}

// Function to get user onboarding data counts
async function getOnboardingDataCounts(userId) {
  try {
    // Count records for each onboarding table
    const businessCoreCount = await db.query.businessCore.findMany({
      where: eq(businessCore.userId, userId)
    });
    
    const brandIdentityCount = await db.query.brandIdentity.findMany({
      where: eq(brandIdentity.userId, userId)
    });
    
    const productsServicesCount = await db.query.productsServices.findMany({
      where: eq(productsServices.userId, userId)
    });
    
    const creativeExamplesCount = await db.query.creativeExamples.findMany({
      where: eq(creativeExamples.userId, userId)
    });
    
    const performanceContextCount = await db.query.performanceContext.findMany({
      where: eq(performanceContext.userId, userId)
    });
    
    // Get onboarding progress
    const progressData = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId)
    });
    
    return {
      businessCore: businessCoreCount.length,
      brandIdentity: brandIdentityCount.length,
      productsServices: productsServicesCount.length,
      creativeExamples: creativeExamplesCount.length,
      performanceContext: performanceContextCount.length,
      progress: progressData
    };
  } catch (error) {
    console.error('Error getting onboarding data counts:', error);
    return null;
  }
}

// Function to test the reset onboarding API
async function testResetOnboarding() {
  try {
    console.log('=== Testing Reset Onboarding API ===\n');
    
    // Login to get token
    console.log('Logging in...');
    const token = await login();
    
    if (!token) {
      console.error('Failed to login. Cannot proceed with test.');
      return;
    }
    
    console.log('Login successful. Got authentication token.');
    
    // Get user ID
    const userResponse = await fetch(`${API_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user: ${userResponse.status} ${userResponse.statusText}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.id;
    
    console.log(`Testing with user ID: ${userId}`);
    
    // Get data counts before reset
    console.log('\nChecking onboarding data before reset...');
    const beforeCounts = await getOnboardingDataCounts(userId);
    
    console.log('Data counts before reset:');
    console.log(`- Business Core records: ${beforeCounts.businessCore}`);
    console.log(`- Brand Identity records: ${beforeCounts.brandIdentity}`);
    console.log(`- Products/Services records: ${beforeCounts.productsServices}`);
    console.log(`- Creative Examples records: ${beforeCounts.creativeExamples}`);
    console.log(`- Performance Context records: ${beforeCounts.performanceContext}`);
    console.log(`- Onboarding progress: Step ${beforeCounts.progress?.currentStep || 'N/A'}, Completed: ${beforeCounts.progress?.isComplete ? 'Yes' : 'No'}`);
    
    // Call reset API
    console.log('\nCalling reset onboarding API...');
    const resetResponse = await fetch(`${API_URL}/api/user/reset-onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      throw new Error(`Reset API failed: ${resetResponse.status} ${resetResponse.statusText}\n${errorText}`);
    }
    
    const resetResult = await resetResponse.json();
    console.log('Reset API response:', resetResult);
    
    // Check data after reset
    console.log('\nChecking onboarding data after reset...');
    const afterCounts = await getOnboardingDataCounts(userId);
    
    console.log('Data counts after reset:');
    console.log(`- Business Core records: ${afterCounts.businessCore}`);
    console.log(`- Brand Identity records: ${afterCounts.brandIdentity}`);
    console.log(`- Products/Services records: ${afterCounts.productsServices}`);
    console.log(`- Creative Examples records: ${afterCounts.creativeExamples}`);
    console.log(`- Performance Context records: ${afterCounts.performanceContext}`);
    console.log(`- Onboarding progress: Step ${afterCounts.progress?.currentStep || 'N/A'}, Completed: ${afterCounts.progress?.isComplete ? 'Yes' : 'No'}`);
    
    // Verify reset was successful
    const resetSuccessful = afterCounts.businessCore === 0 &&
                          afterCounts.brandIdentity === 0 &&
                          afterCounts.productsServices === 0 &&
                          afterCounts.creativeExamples === 0 &&
                          afterCounts.performanceContext === 0 &&
                          afterCounts.progress?.currentStep === 1 &&
                          !afterCounts.progress?.isComplete;
    
    console.log('\n=== Test Results ===');
    console.log(`API Response Success: ${resetResult.success ? '✅' : '❌'}`);
    console.log(`Data Reset Verified: ${resetSuccessful ? '✅' : '❌'}`);
    console.log(`Overall Test Result: ${resetResult.success && resetSuccessful ? '✅ PASSED' : '❌ FAILED'}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Exit when done
    process.exit(0);
  }
}

// Run the test
testResetOnboarding();