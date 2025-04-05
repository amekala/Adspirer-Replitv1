/**
 * API-only Test Script for Onboarding Workflow
 * 
 * This script tests:
 * 1. Filling out all 6 onboarding steps with dummy data via API calls
 * 2. Testing the reset functionality
 * 
 * Run with: node test-onboarding-api.js
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';  // Provided by user
const USER_PASSWORD = 'T1l1icron!';    // Provided by user

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "Test Business",
    industry: "E-Commerce",
    companySize: "11-50",
    marketplaces: ["Amazon", "Walmart", "eBay"],
    mainGoals: ["Increase Sales", "Improve ROAS", "Brand Awareness"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://testbusiness.com"
  },
  
  brandIdentity: {
    brandName: "TestBrand",
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
        name: "Premium Fitness Tracker",
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
        title: "Summer Campaign",
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
        season: "Holiday",
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

// Function to get current time for logging
function getTimeStamp() {
  return new Date().toLocaleTimeString();
}

// Login to get an authentication token
async function login() {
  console.log(`[${getTimeStamp()}] Attempting to login with ${USER_EMAIL}...`);
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
    console.log(`[${getTimeStamp()}] Login successful! ✓`);
    return data.token;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Login error:`, error);
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
    return userData.id;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error getting user ID:`, error);
    return null;
  }
}

// Check onboarding progress
async function checkProgress(token) {
  console.log(`\n[${getTimeStamp()}] Checking onboarding progress...`);
  try {
    const response = await fetch(`${API_URL}/api/onboarding/progress`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get progress: ${response.status} ${response.statusText}`);
    }
    
    const progressData = await response.json();
    console.log(`[${getTimeStamp()}] Current step: ${progressData.currentStep}`);
    console.log(`[${getTimeStamp()}] Completed: ${progressData.completed ? 'Yes' : 'No'}`);
    
    // Log individual step statuses
    console.log('\nStep completion status:');
    for (const [step, data] of Object.entries(progressData.steps || {})) {
      console.log(`- Step ${step}: ${data.completed ? 'Complete ✓' : 'Incomplete ✗'} ${data.lastUpdated ? `(Last updated: ${new Date(data.lastUpdated).toLocaleString()})` : ''}`);
    }
    
    return progressData;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error checking progress:`, error);
    return null;
  }
}

// Submit data for each onboarding step
async function submitOnboardingData(token) {
  console.log(`\n[${getTimeStamp()}] === Submitting Test Data for Onboarding Steps ===\n`);
  const results = {
    businessCore: false,
    connectPlatforms: false,
    brandIdentity: false,
    productsServices: false,
    creativeExamples: false,
    performanceContext: false
  };
  
  // Step 1: Business Core
  try {
    console.log(`[${getTimeStamp()}] Submitting Business Core data...`);
    const businessCoreResponse = await fetch(`${API_URL}/api/onboarding/business-core`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.businessCore)
    });
    
    if (!businessCoreResponse.ok) {
      console.error(`[${getTimeStamp()}] Business Core submission failed: ${businessCoreResponse.status} ${businessCoreResponse.statusText}`);
      const errorText = await businessCoreResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Business Core submission failed');
    }
    
    console.log(`[${getTimeStamp()}] Business Core data submitted successfully. ✓`);
    results.businessCore = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error submitting Business Core data:`, error);
  }
  
  // Step 2: Connect Platforms (mock step, since handled elsewhere)
  try {
    console.log(`\n[${getTimeStamp()}] Simulating Connect Platforms step...`);
    const connectPlatformsResponse = await fetch(`${API_URL}/api/onboarding/connect-platforms`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    if (!connectPlatformsResponse.ok) {
      console.error(`[${getTimeStamp()}] Connect Platforms step failed: ${connectPlatformsResponse.status} ${connectPlatformsResponse.statusText}`);
      throw new Error('Connect Platforms step failed');
    }
    
    console.log(`[${getTimeStamp()}] Connect Platforms step completed successfully. ✓`);
    results.connectPlatforms = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error in Connect Platforms step:`, error);
  }
  
  // Step 3: Brand Identity
  try {
    console.log(`\n[${getTimeStamp()}] Submitting Brand Identity data...`);
    const brandIdentityResponse = await fetch(`${API_URL}/api/onboarding/brand-identity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.brandIdentity)
    });
    
    if (!brandIdentityResponse.ok) {
      console.error(`[${getTimeStamp()}] Brand Identity submission failed: ${brandIdentityResponse.status} ${brandIdentityResponse.statusText}`);
      const errorText = await brandIdentityResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Brand Identity submission failed');
    }
    
    console.log(`[${getTimeStamp()}] Brand Identity data submitted successfully. ✓`);
    results.brandIdentity = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error submitting Brand Identity data:`, error);
  }
  
  // Step 4: Products/Services
  try {
    console.log(`\n[${getTimeStamp()}] Submitting Products/Services data...`);
    const productsServicesResponse = await fetch(`${API_URL}/api/onboarding/products-services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.productsServices)
    });
    
    if (!productsServicesResponse.ok) {
      console.error(`[${getTimeStamp()}] Products/Services submission failed: ${productsServicesResponse.status} ${productsServicesResponse.statusText}`);
      const errorText = await productsServicesResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Products/Services submission failed');
    }
    
    console.log(`[${getTimeStamp()}] Products/Services data submitted successfully. ✓`);
    results.productsServices = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error submitting Products/Services data:`, error);
  }
  
  // Step 5: Creative Examples
  try {
    console.log(`\n[${getTimeStamp()}] Submitting Creative Examples data...`);
    const creativeExamplesResponse = await fetch(`${API_URL}/api/onboarding/creative-examples`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.creativeExamples)
    });
    
    if (!creativeExamplesResponse.ok) {
      console.error(`[${getTimeStamp()}] Creative Examples submission failed: ${creativeExamplesResponse.status} ${creativeExamplesResponse.statusText}`);
      const errorText = await creativeExamplesResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Creative Examples submission failed');
    }
    
    console.log(`[${getTimeStamp()}] Creative Examples data submitted successfully. ✓`);
    results.creativeExamples = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error submitting Creative Examples data:`, error);
  }
  
  // Step 6: Performance Context
  try {
    console.log(`\n[${getTimeStamp()}] Submitting Performance Context data...`);
    const performanceContextResponse = await fetch(`${API_URL}/api/onboarding/performance-context`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.performanceContext)
    });
    
    if (!performanceContextResponse.ok) {
      console.error(`[${getTimeStamp()}] Performance Context submission failed: ${performanceContextResponse.status} ${performanceContextResponse.statusText}`);
      const errorText = await performanceContextResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Performance Context submission failed');
    }
    
    console.log(`[${getTimeStamp()}] Performance Context data submitted successfully. ✓`);
    results.performanceContext = true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error submitting Performance Context data:`, error);
  }
  
  return results;
}

// Test reset functionality
async function testResetFunctionality(token) {
  console.log(`\n[${getTimeStamp()}] === Testing Reset Onboarding Functionality ===\n`);
  
  try {
    // Check progress before reset
    console.log(`[${getTimeStamp()}] Checking progress before reset...`);
    await checkProgress(token);
    
    // Call reset API
    console.log(`\n[${getTimeStamp()}] Calling reset onboarding API...`);
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
    console.log(`[${getTimeStamp()}] Reset API response:`, resetResult);
    
    // Check progress after reset
    console.log(`\n[${getTimeStamp()}] Checking progress after reset...`);
    const afterResetProgress = await checkProgress(token);
    
    if (afterResetProgress && afterResetProgress.currentStep === 1 && !afterResetProgress.completed) {
      console.log(`\n[${getTimeStamp()}] RESET TEST PASSED: Onboarding progress was successfully reset to step 1 ✓`);
    } else {
      console.log(`\n[${getTimeStamp()}] RESET TEST FAILED: Onboarding progress was not properly reset ✗`);
    }
    
    return true;
  } catch (error) {
    console.error(`[${getTimeStamp()}] Error testing reset functionality:`, error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log(`\n[${getTimeStamp()}] === Starting Onboarding API Tests ===\n`);
  
  // Login
  console.log(`[${getTimeStamp()}] Step 1: Authentication`);
  const token = await login();
  
  if (!token) {
    console.error(`[${getTimeStamp()}] Failed to login. Cannot proceed with test.`);
    return;
  }
  
  // Get user ID
  const userId = await getUserId(token);
  
  if (!userId) {
    console.error(`[${getTimeStamp()}] Failed to get user ID. Cannot proceed with test.`);
    return;
  }
  
  console.log(`[${getTimeStamp()}] Testing with user ID: ${userId}`);
  
  // Check initial progress
  console.log(`\n[${getTimeStamp()}] Step 2: Checking Initial Onboarding State`);
  const initialProgress = await checkProgress(token);
  
  // If onboarding is already completed, reset it first
  if (initialProgress && initialProgress.completed) {
    console.log(`\n[${getTimeStamp()}] Onboarding is already marked as complete. Resetting before testing...`);
    await testResetFunctionality(token);
  }
  
  // Submit test data for each step
  console.log(`\n[${getTimeStamp()}] Step 3: Submitting Onboarding Data`);
  const submissionResults = await submitOnboardingData(token);
  
  // Check final progress
  console.log(`\n[${getTimeStamp()}] Step 4: Checking Progress After Submissions`);
  await checkProgress(token);
  
  // Test reset functionality
  console.log(`\n[${getTimeStamp()}] Step 5: Testing Reset Functionality`);
  await testResetFunctionality(token);
  
  // Final summary
  console.log(`\n[${getTimeStamp()}] === Test Summary ===\n`);
  console.log(`Authentication: ${token ? 'Successful ✓' : 'Failed ✗'}`);
  
  if (submissionResults) {
    console.log(`\nData Submission Results:`);
    console.log(`- Business Core: ${submissionResults.businessCore ? 'Successful ✓' : 'Failed ✗'}`);
    console.log(`- Connect Platforms: ${submissionResults.connectPlatforms ? 'Successful ✓' : 'Failed ✗'}`);
    console.log(`- Brand Identity: ${submissionResults.brandIdentity ? 'Successful ✓' : 'Failed ✗'}`);
    console.log(`- Products/Services: ${submissionResults.productsServices ? 'Successful ✓' : 'Failed ✗'}`);
    console.log(`- Creative Examples: ${submissionResults.creativeExamples ? 'Successful ✓' : 'Failed ✗'}`);
    console.log(`- Performance Context: ${submissionResults.performanceContext ? 'Successful ✓' : 'Failed ✗'}`);
  }
  
  console.log(`\n[${getTimeStamp()}] === Test Completed ===\n`);
}

// Run the tests
runTests().catch(error => {
  console.error(`[${getTimeStamp()}] Unhandled error in test script:`, error);
});