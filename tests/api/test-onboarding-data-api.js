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

import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';  // Provided by user
const USER_PASSWORD = 'T1l1icron!';    // Provided by user

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "Test Business API",
    industry: "E-Commerce",
    companySize: "11-50",
    marketplaces: ["Amazon", "Walmart", "eBay"],
    mainGoals: ["Increase Sales", "Improve ROAS", "Brand Awareness"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://testbusiness.com"
  },
  
  brandIdentity: {
    brandName: "TestBrand API",
    brandDescription: "A premium brand focused on quality products for active lifestyles",
    brandVoice: ["Professional", "Friendly", "Inspirational"],
    targetAudience: ["Millennials", "Health Enthusiasts", "Professionals"],
    brandValues: ["Quality", "Innovation", "Sustainability"],
    primaryColor: "#4B0082",
    secondaryColor: "#E6E6FA",
    logoUrl: "https://example.com/logo.png"
  },
  
  productsServices: {
    productTypes: ["Physical Products", "Digital Products", "Services"],
    topSellingProducts: [
      {
        name: "Premium Fitness Tracker API",
        description: "Advanced health and fitness monitoring",
        price: "$129.99",
        category: "Electronics"
      },
      {
        name: "Eco-Friendly Water Bottle",
        description: "Sustainable and stylish hydration",
        price: "$34.99",
        category: "Lifestyle"
      }
    ],
    pricingStrategy: "Premium",
    competitiveAdvantage: ["Quality", "Customer Service", "Sustainability"],
    targetMarkets: ["North America", "Europe", "Australia"]
  },
  
  creativeExamples: {
    adExamples: [
      {
        title: "Summer Campaign API",
        description: "Product showcase featuring sustainable packaging",
        imageUrl: "https://example.com/ad1.jpg",
        performanceNotes: "High CTR but low conversion rate"
      },
      {
        title: "Winter Campaign",
        description: "Customer testimonial video highlighting product benefits",
        imageUrl: "https://example.com/ad2.mp4",
        performanceNotes: "Strong ROAS of 5.2"
      }
    ],
    preferredAdFormats: ["Video", "Responsive Display", "Search"],
    brandGuidelines: {
      doUse: ["High-quality imagery", "Consistent brand colors", "Clear value proposition"],
      dontUse: ["Stock photos without editing", "Cluttered layouts", "Generic messaging"]
    }
  },
  
  performanceContext: {
    currentPerformance: {
      ROI: "12%",
      ACOS: "28%",
      CTR: "1.8%",
      ConversionRate: "3.2%"
    },
    keyMetrics: ["ROI", "ACOS", "CTR", "Conversion Rate"],
    performanceGoals: {
      ROI: "18%",
      ACOS: "22%",
      CTR: "2.5%",
      ConversionRate: "4.5%"
    },
    seasonalTrends: [
      {
        season: "Holiday API",
        performance: "35% increase in sales",
        notes: "Higher competition for ad space during November-December"
      },
      {
        season: "Back to School",
        performance: "20% increase in sales",
        notes: "Increased traffic in August-September for certain product categories"
      }
    ],
    benchmarks: {
      industry: {
        ROI: "10%",
        ACOS: "30%",
        CTR: "1.5%"
      }
    }
  }
};

// Login to get an authentication token
async function login() {
  console.log(`Attempting to login with ${USER_EMAIL}...`);
  try {
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
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Login successful!`);
    return data.token;
  } catch (error) {
    console.error(`Login error:`, error);
    return null;
  }
}

// Get user ID from token
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
    console.log(`User ID: ${userData.id}`);
    return userData.id;
  } catch (error) {
    console.error(`Error getting user ID:`, error);
    return null;
  }
}

// Submit data through API
async function submitData(endpoint, data) {
  try {
    const token = await login();
    if (!token) {
      throw new Error('Failed to authenticate');
    }
    
    console.log(`\nSubmitting data to ${endpoint}...`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Data submitted successfully to ${endpoint} ✓`);
    return result;
  } catch (error) {
    console.error(`Error submitting data to ${endpoint}:`, error);
    return null;
  }
}

// Fetch data through API
async function fetchData(endpoint) {
  try {
    const token = await login();
    if (!token) {
      throw new Error('Failed to authenticate');
    }
    
    console.log(`\nFetching data from ${endpoint}...`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log(`Data fetched successfully from ${endpoint} ✓`);
    return result;
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    return null;
  }
}

// Test the onboarding flow
async function testOnboardingFlow() {
  console.log('\n=== TESTING ONBOARDING FLOW ===\n');
  
  // First, check progress
  const initialProgress = await fetchData('/api/onboarding/progress');
  console.log('Initial onboarding progress:', initialProgress);
  
  // Reset onboarding if already completed
  if (initialProgress && initialProgress.completed) {
    console.log('\nResetting onboarding data first since it shows as completed...');
    await resetOnboarding();
  }
  
  // Submit test data for all steps
  console.log('\n--- Submitting data for all steps ---');
  
  // Step 1: Business Core
  const businessCoreResult = await submitData('/api/onboarding/business-core', testData.businessCore);
  console.log('Business Core submission result:', businessCoreResult || 'Failed');
  
  // Step 2: Connect Platforms (mock step)
  const connectPlatformsResult = await submitData('/api/onboarding/connect-platforms', {});
  console.log('Connect Platforms submission result:', connectPlatformsResult || 'Failed');
  
  // Step 3: Brand Identity
  const brandIdentityResult = await submitData('/api/onboarding/brand-identity', testData.brandIdentity);
  console.log('Brand Identity submission result:', brandIdentityResult || 'Failed');
  
  // Step 4: Products/Services
  const productsServicesResult = await submitData('/api/onboarding/products-services', testData.productsServices);
  console.log('Products/Services submission result:', productsServicesResult || 'Failed');
  
  // Step 5: Creative Examples
  const creativeExamplesResult = await submitData('/api/onboarding/creative-examples', testData.creativeExamples);
  console.log('Creative Examples submission result:', creativeExamplesResult || 'Failed');
  
  // Step 6: Performance Context
  const performanceContextResult = await submitData('/api/onboarding/performance-context', testData.performanceContext);
  console.log('Performance Context submission result:', performanceContextResult || 'Failed');
  
  // Check final progress
  const finalProgress = await fetchData('/api/onboarding/progress');
  console.log('\nFinal onboarding progress after all submissions:', finalProgress);
  
  // Verify all data exists in the API
  console.log('\n--- Verifying all data exists via API ---');
  
  // Verify all data was saved
  const verifyBusinessCore = await fetchData('/api/onboarding/business-core');
  console.log('\nVerified Business Core data:', verifyBusinessCore || 'Not found');
  
  const verifyBrandIdentity = await fetchData('/api/onboarding/brand-identity');
  console.log('\nVerified Brand Identity data:', verifyBrandIdentity || 'Not found');
  
  const verifyProductsServices = await fetchData('/api/onboarding/products-services');
  console.log('\nVerified Products/Services data:', verifyProductsServices || 'Not found');
  
  const verifyCreativeExamples = await fetchData('/api/onboarding/creative-examples');
  console.log('\nVerified Creative Examples data:', verifyCreativeExamples || 'Not found');
  
  const verifyPerformanceContext = await fetchData('/api/onboarding/performance-context');
  console.log('\nVerified Performance Context data:', verifyPerformanceContext || 'Not found');
  
  return {
    businessCore: !!verifyBusinessCore,
    brandIdentity: !!verifyBrandIdentity,
    productsServices: !!verifyProductsServices,
    creativeExamples: !!verifyCreativeExamples,
    performanceContext: !!verifyPerformanceContext
  };
}

// Reset the onboarding data
async function resetOnboarding() {
  try {
    const token = await login();
    if (!token) {
      throw new Error('Failed to authenticate');
    }
    
    console.log('\nResetting onboarding data...');
    const response = await fetch(`${API_URL}/api/user/reset-onboarding`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Reset API failed: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const result = await response.json();
    console.log('Reset result:', result);
    return true;
  } catch (error) {
    console.error('Error resetting onboarding data:', error);
    return false;
  }
}

// Test reset functionality
async function testResetFunctionality() {
  console.log('\n=== TESTING RESET FUNCTIONALITY ===\n');
  
  // First check progress before reset
  const beforeResetProgress = await fetchData('/api/onboarding/progress');
  console.log('Progress before reset:', beforeResetProgress);
  
  // Reset the onboarding data
  const resetResult = await resetOnboarding();
  
  if (!resetResult) {
    console.log('❌ Reset functionality failed');
    return false;
  }
  
  // Check progress after reset
  const afterResetProgress = await fetchData('/api/onboarding/progress');
  console.log('\nProgress after reset:', afterResetProgress);
  
  // Verify all data was deleted by trying to fetch it
  console.log('\n--- Verifying all data was deleted via API ---');
  
  // Verify data was reset
  const verifyBusinessCore = await fetchData('/api/onboarding/business-core');
  const businessCoreReset = !verifyBusinessCore || Object.keys(verifyBusinessCore).length === 0;
  console.log('Business Core data reset:', businessCoreReset ? '✅ Yes' : '❌ No');
  
  const verifyBrandIdentity = await fetchData('/api/onboarding/brand-identity');
  const brandIdentityReset = !verifyBrandIdentity || Object.keys(verifyBrandIdentity).length === 0;
  console.log('Brand Identity data reset:', brandIdentityReset ? '✅ Yes' : '❌ No');
  
  const verifyProductsServices = await fetchData('/api/onboarding/products-services');
  const productsServicesReset = !verifyProductsServices || Object.keys(verifyProductsServices).length === 0;
  console.log('Products/Services data reset:', productsServicesReset ? '✅ Yes' : '❌ No');
  
  const verifyCreativeExamples = await fetchData('/api/onboarding/creative-examples');
  const creativeExamplesReset = !verifyCreativeExamples || Object.keys(verifyCreativeExamples).length === 0;
  console.log('Creative Examples data reset:', creativeExamplesReset ? '✅ Yes' : '❌ No');
  
  const verifyPerformanceContext = await fetchData('/api/onboarding/performance-context');
  const performanceContextReset = !verifyPerformanceContext || Object.keys(verifyPerformanceContext).length === 0;
  console.log('Performance Context data reset:', performanceContextReset ? '✅ Yes' : '❌ No');
  
  // Check if progress was reset
  const progressReset = afterResetProgress && afterResetProgress.currentStep === 1 && !afterResetProgress.completed;
  console.log('\nOnboarding progress reset to step 1:', progressReset ? '✅ Yes' : '❌ No');
  
  // Overall reset status
  const allReset = businessCoreReset && 
                   brandIdentityReset && 
                   productsServicesReset && 
                   creativeExamplesReset && 
                   performanceContextReset &&
                   progressReset;
  
  console.log('\nOverall reset status:', allReset ? '✅ SUCCESS' : '❌ FAILED');
  
  return allReset;
}

// Run all tests
async function runTests() {
  console.log('=== STARTING ONBOARDING DATA API TESTS ===\n');
  
  // Test both flows
  const onboardingResults = await testOnboardingFlow();
  
  // Sleep for 1 second before testing reset
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const resetResults = await testResetFunctionality();
  
  // Final summary
  console.log('\n=== TEST SUMMARY ===\n');
  
  if (onboardingResults) {
    console.log('Onboarding Steps Completion:');
    Object.entries(onboardingResults).forEach(([step, result]) => {
      console.log(`- ${step}: ${result ? '✅ Passed' : '❌ Failed'}`);
    });
  } else {
    console.log('❌ Onboarding flow testing failed');
  }
  
  console.log(`\nReset Functionality: ${resetResults ? '✅ Passed' : '❌ Failed'}`);
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Run the tests
runTests().catch(error => {
  console.error('Unhandled error in test script:', error);
});