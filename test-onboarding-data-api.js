/**
 * API-focused test script for onboarding data
 * 
 * This script tests:
 * 1. Using API endpoints for all onboarding flows
 * 2. Verifying the data via API endpoints
 * 3. Testing the reset functionality
 * 
 * Run with: node test-onboarding-data-api.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';  // Using an existing user from the database
const USER_PASSWORD = 'password123';    // Update with correct password if needed

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "API Test Business",
    industry: "Technology",
    companySize: "11-50",
    marketplaces: ["Amazon", "Google Ads"],
    mainGoals: ["Increase Sales", "Brand Awareness", "Market Expansion"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://apitestbusiness.com",
  },
  
  brandIdentity: {
    brandName: "APITestBrand",
    brandDescription: "A test brand for validating onboarding API endpoints",
    brandVoice: ["Professional", "Technical", "Innovative"],
    targetAudience: ["Developers", "Tech Enthusiasts", "Businesses"],
    brandValues: ["Innovation", "Excellence", "User Experience"],
    primaryColor: "#336699",
    secondaryColor: "#CCDDEE",
  },
  
  productsServices: {
    productTypes: ["SaaS", "API Services", "Development Tools"],
    topSellingProducts: [
      {
        name: "API Testing Suite",
        description: "Comprehensive API testing platform",
        price: "$299/month",
        category: "SaaS"
      },
      {
        name: "Developer Toolkit",
        description: "Essential tools for API developers",
        price: "$499",
        category: "Development Tools"
      }
    ],
    pricingStrategy: "Subscription",
    competitiveAdvantage: ["Technology", "Speed", "Reliability"],
    targetMarkets: ["B2B", "Enterprise", "Developers"],
  },
  
  creativeExamples: {
    adExamples: [
      {
        type: "image",
        url: "https://example.com/api-ad1.jpg",
        description: "API features showcase"
      },
      {
        type: "video",
        url: "https://example.com/api-ad2.mp4",
        description: "API integration tutorial"
      }
    ],
    preferredAdFormats: ["Video", "Rich Media", "Interactive"],
    brandGuidelines: {
      doUse: ["Technical diagrams", "Code snippets", "Performance metrics"],
      dontUse: ["Generic tech images", "Confusing terminology"]
    }
  },
  
  performanceContext: {
    currentPerformance: {
      ROI: "18%",
      ACOS: "20%",
      CTR: "3.2%"
    },
    keyMetrics: ["ROI", "API Adoption Rate", "Customer Lifetime Value"],
    performanceGoals: {
      ROI: "25%",
      ACOS: "15%",
      CTR: "4.0%"
    },
    seasonalTrends: [
      {
        season: "Q4",
        months: ["October", "November", "December"],
        notes: "25% increase in developer signups"
      },
      {
        season: "Summer",
        months: ["June", "July"],
        notes: "10% decrease in enterprise subscriptions"
      }
    ],
    benchmarks: {
      industry: {
        ROI: "15%",
        ACOS: "22%"
      }
    }
  }
};

// Global token for API access
let authToken = null;
let userId = null;

// Login to get an authentication token
async function login() {
  try {
    console.log(`Attempting to login with email: ${USER_EMAIL}`);
    
    const response = await fetch(`${API_URL}/api/auth/login`, {
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
    console.log('Login successful!');
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Get user ID
async function getUserId(token) {
  try {
    const response = await fetch(`${API_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.status} ${response.statusText}`);
    }
    
    const userData = await response.json();
    return userData.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Submit data via API endpoint
async function submitData(endpoint, data) {
  try {
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
      throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error submitting data to ${endpoint}:`, error);
    return null;
  }
}

// Fetch data via API endpoint
async function fetchData(endpoint) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      // If 404, it might mean no data yet, which is acceptable
      if (response.status === 404) {
        return { notFound: true };
      }
      
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching from ${endpoint}:`, error);
    return null;
  }
}

// Test the onboarding flow
async function testOnboardingFlow() {
  console.log('\n=== Testing Onboarding Flow ===\n');
  
  // Submit and verify each step
  
  // Step 1: Business Core
  console.log('\n--- Step 1: Business Core ---\n');
  const businessCoreResult = await submitData('/api/onboarding/business-core', testData.businessCore);
  
  if (businessCoreResult) {
    console.log('Business Core data submitted successfully ✓');
    
    // Verify via API
    const businessCoreData = await fetchData('/api/user/business-core');
    
    if (businessCoreData && !businessCoreData.notFound) {
      console.log('Business Core data retrieved successfully ✓');
      console.log('Verification:');
      console.log(`- Business Name: ${businessCoreData.businessName === testData.businessCore.businessName ? '✓' : '✗'} ${businessCoreData.businessName}`);
      console.log(`- Industry: ${businessCoreData.industry === testData.businessCore.industry ? '✓' : '✗'} ${businessCoreData.industry}`);
      console.log(`- Company Size: ${businessCoreData.companySize === testData.businessCore.companySize ? '✓' : '✗'} ${businessCoreData.companySize}`);
      
      const marketplacesMatch = JSON.stringify(businessCoreData.marketplaces) === JSON.stringify(testData.businessCore.marketplaces);
      console.log(`- Marketplaces: ${marketplacesMatch ? '✓' : '✗'} ${businessCoreData.marketplaces.join(', ')}`);
    } else {
      console.log('Failed to retrieve Business Core data ✗');
    }
  } else {
    console.log('Failed to submit Business Core data ✗');
  }
  
  // Step 3: Brand Identity (step 2 is connect platforms, which we'll skip in this test)
  console.log('\n--- Step 3: Brand Identity ---\n');
  const brandIdentityResult = await submitData('/api/onboarding/brand-identity', testData.brandIdentity);
  
  if (brandIdentityResult) {
    console.log('Brand Identity data submitted successfully ✓');
    
    // Verify via API
    const brandIdentityData = await fetchData('/api/user/brand-identity');
    
    if (brandIdentityData && !brandIdentityData.notFound) {
      console.log('Brand Identity data retrieved successfully ✓');
      console.log('Verification:');
      console.log(`- Brand Name: ${brandIdentityData.brandName === testData.brandIdentity.brandName ? '✓' : '✗'} ${brandIdentityData.brandName}`);
      console.log(`- Brand Description: ${brandIdentityData.brandDescription === testData.brandIdentity.brandDescription ? '✓' : '✗'} ${brandIdentityData.brandDescription}`);
      
      const brandVoiceMatch = JSON.stringify(brandIdentityData.brandVoice) === JSON.stringify(testData.brandIdentity.brandVoice);
      console.log(`- Brand Voice: ${brandVoiceMatch ? '✓' : '✗'} ${brandIdentityData.brandVoice.join(', ')}`);
    } else {
      console.log('Failed to retrieve Brand Identity data ✗');
    }
  } else {
    console.log('Failed to submit Brand Identity data ✗');
  }
  
  // Step 4: Products/Services
  console.log('\n--- Step 4: Products/Services ---\n');
  const productsServicesResult = await submitData('/api/onboarding/products-services', testData.productsServices);
  
  if (productsServicesResult) {
    console.log('Products/Services data submitted successfully ✓');
    
    // Verify via API
    const productsServicesData = await fetchData('/api/user/products-services');
    
    if (productsServicesData && !productsServicesData.notFound) {
      console.log('Products/Services data retrieved successfully ✓');
      console.log('Verification:');
      
      const productTypesMatch = JSON.stringify(productsServicesData.productTypes) === JSON.stringify(testData.productsServices.productTypes);
      console.log(`- Product Types: ${productTypesMatch ? '✓' : '✗'} ${productsServicesData.productTypes.join(', ')}`);
      
      console.log(`- Pricing Strategy: ${productsServicesData.pricingStrategy === testData.productsServices.pricingStrategy ? '✓' : '✗'} ${productsServicesData.pricingStrategy}`);
      
      // Verify we have the right number of top selling products
      const productCountMatch = productsServicesData.topSellingProducts?.length === testData.productsServices.topSellingProducts.length;
      console.log(`- Top Products Count: ${productCountMatch ? '✓' : '✗'} ${productsServicesData.topSellingProducts?.length || 0}`);
    } else {
      console.log('Failed to retrieve Products/Services data ✗');
    }
  } else {
    console.log('Failed to submit Products/Services data ✗');
  }
  
  // Step 5: Creative Examples
  console.log('\n--- Step 5: Creative Examples ---\n');
  const creativeExamplesResult = await submitData('/api/onboarding/creative-examples', testData.creativeExamples);
  
  if (creativeExamplesResult) {
    console.log('Creative Examples data submitted successfully ✓');
    
    // Verify via API
    const creativeExamplesData = await fetchData('/api/user/creative-examples');
    
    if (creativeExamplesData && !creativeExamplesData.notFound) {
      console.log('Creative Examples data retrieved successfully ✓');
      console.log('Verification:');
      
      // Check preferred ad formats
      const adFormatsMatch = JSON.stringify(creativeExamplesData.preferredAdFormats) === JSON.stringify(testData.creativeExamples.preferredAdFormats);
      console.log(`- Preferred Ad Formats: ${adFormatsMatch ? '✓' : '✗'} ${creativeExamplesData.preferredAdFormats.join(', ')}`);
      
      // Check number of ad examples
      const adExamplesCountMatch = creativeExamplesData.adExamples?.length === testData.creativeExamples.adExamples.length;
      console.log(`- Ad Examples Count: ${adExamplesCountMatch ? '✓' : '✗'} ${creativeExamplesData.adExamples?.length || 0}`);
    } else {
      console.log('Failed to retrieve Creative Examples data ✗');
    }
  } else {
    console.log('Failed to submit Creative Examples data ✗');
  }
  
  // Step 6: Performance Context
  console.log('\n--- Step 6: Performance Context ---\n');
  const performanceContextResult = await submitData('/api/onboarding/performance-context', testData.performanceContext);
  
  if (performanceContextResult) {
    console.log('Performance Context data submitted successfully ✓');
    
    // Verify via API
    const performanceContextData = await fetchData('/api/user/performance-context');
    
    if (performanceContextData && !performanceContextData.notFound) {
      console.log('Performance Context data retrieved successfully ✓');
      console.log('Verification:');
      
      // Check key metrics
      const keyMetricsMatch = JSON.stringify(performanceContextData.keyMetrics) === JSON.stringify(testData.performanceContext.keyMetrics);
      console.log(`- Key Metrics: ${keyMetricsMatch ? '✓' : '✗'} ${performanceContextData.keyMetrics.join(', ')}`);
      
      // Check current performance exists
      console.log(`- Has Current Performance: ${performanceContextData.currentPerformance ? '✓' : '✗'}`);
      
      // Check seasonal trends count
      const trendsCountMatch = performanceContextData.seasonalTrends?.length === testData.performanceContext.seasonalTrends.length;
      console.log(`- Seasonal Trends Count: ${trendsCountMatch ? '✓' : '✗'} ${performanceContextData.seasonalTrends?.length || 0}`);
    } else {
      console.log('Failed to retrieve Performance Context data ✗');
    }
  } else {
    console.log('Failed to submit Performance Context data ✗');
  }
  
  // Check onboarding progress
  console.log('\n--- Checking Onboarding Progress ---\n');
  const progressData = await fetchData('/api/onboarding/progress');
  
  if (progressData) {
    console.log('Onboarding progress retrieved successfully ✓');
    console.log(`- Current Step: ${progressData.currentStep}`);
    console.log(`- Completed: ${progressData.isComplete ? 'Yes' : 'No'}`);
  } else {
    console.log('Failed to retrieve onboarding progress ✗');
  }
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
    
    // Check onboarding progress was reset
    const progressData = await fetchData('/api/onboarding/progress');
    
    if (progressData) {
      console.log(`Onboarding Progress Reset: ${progressData.currentStep === 1 && !progressData.isComplete ? 'Reset to step 1 ✓' : 'Not properly reset ✗'}`);
      console.log(`- Current Step: ${progressData.currentStep}`);
      console.log(`- Completed: ${progressData.isComplete ? 'Yes' : 'No'}`);
    } else {
      console.log('Failed to retrieve onboarding progress after reset ✗');
    }
    
    // Determine overall success
    const allReset = (businessCoreData?.notFound || businessCoreData === null) &&
                    (brandIdentityData?.notFound || brandIdentityData === null) &&
                    (productsServicesData?.notFound || productsServicesData === null) &&
                    (creativeExamplesData?.notFound || creativeExamplesData === null) &&
                    (performanceContextData?.notFound || performanceContextData === null);
                    
    const progressReset = progressData && progressData.currentStep === 1 && !progressData.isComplete;
    
    if (allReset && progressReset) {
      console.log('\nRESET TEST PASSED: All onboarding data was successfully deleted and progress reset ✓');
    } else {
      console.log('\nRESET TEST FAILED: Some data was not properly reset ✗');
    }
    
    return allReset && progressReset;
  } catch (error) {
    console.error('Error testing reset functionality:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== Starting Onboarding API Tests ===');
  
  // Login
  console.log('\nLogging in...');
  authToken = await login();
  
  if (!authToken) {
    console.error('Failed to login. Cannot proceed with tests.');
    return;
  }
  
  // Get user ID
  userId = await getUserId(authToken);
  
  if (!userId) {
    console.error('Failed to get user ID. Cannot proceed with tests.');
    return;
  }
  
  console.log(`Testing with user ID: ${userId}`);
  
  // Run onboarding flow tests
  await testOnboardingFlow();
  
  // Test reset functionality
  const resetSuccess = await testResetFunctionality();
  
  console.log(`\n=== Onboarding API Tests ${resetSuccess ? 'PASSED' : 'COMPLETED WITH ISSUES'} ===`);
}

// Run the tests
runTests().catch(console.error);