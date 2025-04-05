/**
 * API-focused test script for onboarding data
 * 
 * This script tests:
 * 1. Using API endpoints for all onboarding flows
 * 2. Verifying the data via API endpoints
 * 3. Testing the reset functionality
 * 
 * Run with: node test-api-onboarding-data.js
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';  // Using existing user with completed onboarding
// This is a test password, assumed to match the database
// In a real scenario, you should use environment variables for sensitive data
const USER_PASSWORD = 'T1l1icron!';    // This is just for testing

// Global variables
let authToken = null;
let userId = null;

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "API Test Business",
    industry: "E-commerce",
    companySize: "51-200",
    marketplaces: ["Amazon", "Walmart", "eBay"],
    mainGoals: ["Increase Sales", "Brand Awareness", "Market Expansion"],
    monthlyAdSpend: "$20,000 - $50,000",
    website: "https://apitestbusiness.com",
  },
  
  brandIdentity: {
    brandName: "API TestBrand",
    brandDescription: "A test brand for API testing of onboarding flow",
    brandVoice: ["Professional", "Innovative", "Friendly"],
    targetAudience: ["Professionals", "Tech Enthusiasts", "Online Shoppers"],
    brandValues: ["Innovation", "Quality", "Customer Focus", "Sustainability"],
    primaryColor: "#336699",
    secondaryColor: "#FFCC00",
  },
  
  productsServices: {
    productTypes: ["Physical Products", "Digital Products", "Services"],
    topSellingProducts: [
      {
        name: "Premium API Suite",
        description: "All-in-one API integration solution",
        price: "$999",
        category: "Software"
      },
      {
        name: "E-commerce Starter Kit",
        description: "Everything you need to start selling online",
        price: "$499",
        category: "Digital Products"
      }
    ],
    pricingStrategy: "Value-based",
    competitiveAdvantage: ["Technology", "Support", "Integration"],
    targetMarkets: ["B2B", "B2C", "Enterprise"],
  },
  
  creativeExamples: {
    adExamples: [
      {
        type: "image",
        url: "https://example.com/api-ad1.jpg",
        description: "Product showcase advertisement"
      },
      {
        type: "video",
        url: "https://example.com/api-ad2.mp4",
        description: "Brand story promotional video"
      }
    ],
    preferredAdFormats: ["Video", "Display", "Search", "Social"],
    brandGuidelines: {
      doUse: ["Professional tone", "High-quality imagery", "Clear CTAs"],
      dontUse: ["Slang", "Low-resolution images", "Competitor mentions"]
    }
  },
  
  performanceContext: {
    currentPerformance: {
      ROI: "17%",
      ACOS: "20%",
      CTR: "3.2%"
    },
    keyMetrics: ["ROI", "Conversion Rate", "ACOS", "CTR", "Impressions"],
    performanceGoals: {
      ROI: "25%",
      ACOS: "15%",
      CTR: "4.0%"
    },
    seasonalTrends: [
      {
        season: "Holiday",
        months: ["November", "December"],
        notes: "35% increase in sales during Black Friday and Christmas"
      },
      {
        season: "Back to School",
        months: ["August", "September"],
        notes: "20% increase in certain product categories"
      }
    ],
    benchmarks: {
      industry: {
        ROI: "14%",
        ACOS: "22%",
        CTR: "2.8%"
      }
    }
  }
};

// Login and get auth token
async function login() {
  try {
    console.log('Logging in...');
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: USER_EMAIL,
        password: USER_PASSWORD
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const data = await response.json();
    authToken = data.token;
    console.log('Login successful. Got authentication token.');
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

// Get user ID from the API
async function getUserId(token) {
  try {
    console.log('Getting user ID...');
    const response = await fetch(`${API_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    userId = data.id;
    console.log(`Got user ID: ${userId}`);
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Submit data to an endpoint
async function submitData(endpoint, data) {
  try {
    console.log(`Submitting data to ${endpoint}...`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Submission to ${endpoint} failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Successfully submitted data to ${endpoint} ✓`);
    return result;
  } catch (error) {
    console.error(`Error submitting to ${endpoint}:`, error);
    return null;
  }
}

// Fetch data from an endpoint
async function fetchData(endpoint) {
  try {
    console.log(`Fetching data from ${endpoint}...`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`No data found at ${endpoint} (404)`);
        return { notFound: true };
      }
      const errorText = await response.text();
      throw new Error(`Fetch from ${endpoint} failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    return null;
  }
}

// Test the onboarding flow
async function testOnboardingFlow() {
  console.log('\n=== Testing Onboarding Flow ===\n');
  
  // Step 1: Submit Business Core
  const businessCoreResult = await submitData('/api/onboarding/business-core', testData.businessCore);
  if (!businessCoreResult) {
    console.error('Failed to submit Business Core data. Stopping test.');
    return false;
  }
  
  // Step 2: Get current progress
  const progressBeforeCompletion = await fetchData('/api/onboarding/progress');
  console.log('Onboarding progress:', progressBeforeCompletion?.currentStep || 'N/A');
  
  // Step 3: Submit Brand Identity
  const brandIdentityResult = await submitData('/api/onboarding/brand-identity', testData.brandIdentity);
  if (!brandIdentityResult) {
    console.error('Failed to submit Brand Identity data. Stopping test.');
    return false;
  }
  
  // Step 4: Submit Products/Services
  const productsServicesResult = await submitData('/api/onboarding/products-services', testData.productsServices);
  if (!productsServicesResult) {
    console.error('Failed to submit Products/Services data. Stopping test.');
    return false;
  }
  
  // Step 5: Submit Creative Examples
  const creativeExamplesResult = await submitData('/api/onboarding/creative-examples', testData.creativeExamples);
  if (!creativeExamplesResult) {
    console.error('Failed to submit Creative Examples data. Stopping test.');
    return false;
  }
  
  // Step 6: Submit Performance Context
  const performanceContextResult = await submitData('/api/onboarding/performance-context', testData.performanceContext);
  if (!performanceContextResult) {
    console.error('Failed to submit Performance Context data. Stopping test.');
    return false;
  }
  
  // Verify that all data was submitted successfully
  console.log('\n=== Verifying Submitted Data ===\n');
  
  // Get Business Core
  const businessCoreData = await fetchData('/api/user/business-core');
  console.log('Business Core Data:', businessCoreData ? 'Retrieved ✓' : 'Failed ✗');
  if (businessCoreData) {
    console.log(`- Business Name: ${businessCoreData.businessName}`);
    console.log(`- Industry: ${businessCoreData.industry}`);
  }
  
  // Get Brand Identity
  const brandIdentityData = await fetchData('/api/user/brand-identity');
  console.log('\nBrand Identity Data:', brandIdentityData ? 'Retrieved ✓' : 'Failed ✗');
  if (brandIdentityData) {
    console.log(`- Brand Name: ${brandIdentityData.brandName}`);
    console.log(`- Brand Voice: ${brandIdentityData.brandVoice?.join(', ')}`);
  }
  
  // Get Products/Services
  const productsServicesData = await fetchData('/api/user/products-services');
  console.log('\nProducts/Services Data:', productsServicesData ? 'Retrieved ✓' : 'Failed ✗');
  if (productsServicesData) {
    console.log(`- Product Types: ${productsServicesData.productTypes?.join(', ')}`);
    console.log(`- Target Markets: ${productsServicesData.targetMarkets?.join(', ')}`);
  }
  
  // Get Creative Examples
  const creativeExamplesData = await fetchData('/api/user/creative-examples');
  console.log('\nCreative Examples Data:', creativeExamplesData ? 'Retrieved ✓' : 'Failed ✗');
  if (creativeExamplesData) {
    console.log(`- Preferred Ad Formats: ${creativeExamplesData.preferredAdFormats?.join(', ')}`);
  }
  
  // Get Performance Context
  const performanceContextData = await fetchData('/api/user/performance-context');
  console.log('\nPerformance Context Data:', performanceContextData ? 'Retrieved ✓' : 'Failed ✗');
  if (performanceContextData) {
    console.log(`- Key Metrics: ${performanceContextData.keyMetrics?.join(', ')}`);
  }
  
  // Get final progress
  const progressAfterCompletion = await fetchData('/api/onboarding/progress');
  console.log('\nFinal Onboarding Progress:');
  console.log(`- Current Step: ${progressAfterCompletion?.currentStep || 'N/A'}`);
  console.log(`- Is Complete: ${progressAfterCompletion?.completed ? 'Yes ✓' : 'No ✗'}`);
  
  return true;
}

// Test reset functionality
async function testResetFunctionality() {
  console.log('\n=== Testing Reset Onboarding Functionality ===\n');
  
  try {
    console.log('Calling reset onboarding API...');
    const resetResponse = await fetch(`${API_URL}/api/user/reset-onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!resetResponse.ok) {
      const errorText = await resetResponse.text();
      throw new Error(`Reset API failed: ${resetResponse.status} ${resetResponse.statusText}\n${errorText}`);
    }
    
    const resetResult = await resetResponse.json();
    console.log('Reset API response:', resetResult);
    
    // Verify data was reset by checking each endpoint
    console.log('\nVerifying data after reset...');
    
    // Check Business Core
    const businessCoreData = await fetchData('/api/user/business-core');
    console.log(`Business Core: ${businessCoreData?.notFound || businessCoreData === null ? 'Deleted ✓' : 'Still exists ✗'}`);
    
    // Check Brand Identity
    const brandIdentityData = await fetchData('/api/user/brand-identity');
    console.log(`Brand Identity: ${brandIdentityData?.notFound || brandIdentityData === null ? 'Deleted ✓' : 'Still exists ✗'}`);
    
    // Check Products/Services
    const productsServicesData = await fetchData('/api/user/products-services');
    console.log(`Products/Services: ${productsServicesData?.notFound || productsServicesData === null ? 'Deleted ✓' : 'Still exists ✗'}`);
    
    // Check Creative Examples
    const creativeExamplesData = await fetchData('/api/user/creative-examples');
    console.log(`Creative Examples: ${creativeExamplesData?.notFound || creativeExamplesData === null ? 'Deleted ✓' : 'Still exists ✗'}`);
    
    // Check Performance Context
    const performanceContextData = await fetchData('/api/user/performance-context');
    console.log(`Performance Context: ${performanceContextData?.notFound || performanceContextData === null ? 'Deleted ✓' : 'Still exists ✗'}`);
    
    // Check onboarding progress
    const progressData = await fetchData('/api/onboarding/progress');
    console.log('\nOnboarding Progress After Reset:');
    console.log(`- Current Step: ${progressData?.currentStep || 'N/A'}`);
    console.log(`- Is Complete: ${progressData?.completed ? 'Yes ✗ (should be No)' : 'No ✓'}`);
    
    // Summary
    const allDeleted = 
      (businessCoreData?.notFound || businessCoreData === null) &&
      (brandIdentityData?.notFound || brandIdentityData === null) &&
      (productsServicesData?.notFound || productsServicesData === null) &&
      (creativeExamplesData?.notFound || creativeExamplesData === null) &&
      (performanceContextData?.notFound || performanceContextData === null) &&
      progressData?.currentStep === 1 &&
      !progressData?.completed;
      
    if (allDeleted) {
      console.log('\nRESET TEST PASSED: All onboarding data was successfully reset ✓');
    } else {
      console.log('\nRESET TEST FAILED: Some onboarding data was not properly reset ✗');
    }
    
    return true;
  } catch (error) {
    console.error('Error testing reset functionality:', error);
    return false;
  }
}

// Main function to run tests
async function runTests() {
  console.log('=== API Onboarding Data Tests ===');
  
  // Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('Login failed, cannot proceed with tests.');
    return;
  }
  
  // Get user ID
  const userIdResult = await getUserId(authToken);
  if (!userIdResult) {
    console.error('Failed to get user ID, cannot proceed with tests.');
    return;
  }
  
  // Test onboarding flow
  await testOnboardingFlow();
  
  // Test reset functionality
  await testResetFunctionality();
  
  console.log('\n=== API Onboarding Tests Completed ===');
}

// Run tests using top-level await
(async () => {
  try {
    await runTests();
  } catch (error) {
    console.error('Unhandled error in test execution:', error);
  }
})();