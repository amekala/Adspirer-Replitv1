/**
 * Test script for onboarding data
 * 
 * This script tests:
 * 1. Filling out the 6 onboarding steps with dummy data
 * 2. Verifying the data is saved to the database
 * 3. Testing the reset functionality under compliance
 * 
 * Run with: node test-onboarding-data.js
 */

import fetch from 'node-fetch';
import { db } from './server/db.js';
import { eq } from 'drizzle-orm';
import { 
  businessCore, 
  brandIdentity, 
  productsServices, 
  creativeExamples, 
  performanceContext,
  onboardingProgress
} from './shared/schema.js';

// Configuration
const API_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';  // Using existing user with completed onboarding
// This is a test password, assumed to match the database
// In a real scenario, you should use environment variables for sensitive data
const USER_PASSWORD = 'T1l1icron!';    // This is just for testing

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "Test Business",
    industry: "Technology",
    companySize: "11-50",
    marketplaces: ["Amazon", "Walmart"],
    mainGoals: ["Increase Sales", "Brand Awareness"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://testbusiness.com",
  },
  
  brandIdentity: {
    brandName: "TestBrand",
    brandDescription: "A test brand for validating onboarding data flow",
    brandVoice: ["Professional", "Friendly", "Technical"],
    targetAudience: ["Professionals", "Tech Enthusiasts"],
    brandValues: ["Innovation", "Quality", "Customer Focus"],
    primaryColor: "#4B0082",
    secondaryColor: "#E6E6FA",
  },
  
  productsServices: {
    productTypes: ["Digital Products", "Software", "Services"],
    topSellingProducts: [
      {
        name: "Premium Software Suite",
        description: "All-in-one business solution",
        price: "$499",
        category: "Software"
      },
      {
        name: "Consulting Package",
        description: "Expert advice for your business",
        price: "$999",
        category: "Services"
      }
    ],
    pricingStrategy: "Tiered",
    competitiveAdvantage: ["Quality", "Innovation", "Technology"],
    targetMarkets: ["B2B", "Enterprise"],
  },
  
  creativeExamples: {
    adExamples: [
      {
        type: "image",
        url: "https://example.com/ad1.jpg",
        description: "Product showcase ad"
      },
      {
        type: "video",
        url: "https://example.com/ad2.mp4",
        description: "Brand story video"
      }
    ],
    preferredAdFormats: ["Video", "Display", "Search"],
    brandGuidelines: {
      doUse: ["Professional tone", "High-quality imagery"],
      dontUse: ["Slang", "Low-resolution images"]
    }
  },
  
  performanceContext: {
    currentPerformance: {
      ROI: "15%",
      ACOS: "22%",
      CTR: "2.8%"
    },
    keyMetrics: ["ROI", "Conversion Rate", "ACOS"],
    performanceGoals: {
      ROI: "20%",
      ACOS: "18%",
      CTR: "3.5%"
    },
    seasonalTrends: [
      {
        season: "Holiday",
        months: ["November", "December"],
        notes: "30% increase in sales"
      },
      {
        season: "Summer",
        months: ["June", "July", "August"],
        notes: "15% decrease in engagement"
      }
    ],
    benchmarks: {
      industry: {
        ROI: "12%",
        ACOS: "25%"
      }
    }
  }
};

// Login to get an authentication token
async function login() {
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
    return data.token;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

// Submit data for each onboarding step
async function submitOnboardingData(token, userId) {
  console.log('\n=== Submitting Test Data for Onboarding Steps ===\n');
  
  // Step 1: Business Core
  try {
    console.log('Submitting Business Core data...');
    const businessCoreResponse = await fetch(`${API_URL}/api/onboarding/business-core`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.businessCore)
    });
    
    if (!businessCoreResponse.ok) {
      console.error(`Business Core submission failed: ${businessCoreResponse.status} ${businessCoreResponse.statusText}`);
      const errorText = await businessCoreResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Business Core submission failed');
    }
    
    console.log('Business Core data submitted successfully.');
  } catch (error) {
    console.error('Error submitting Business Core data:', error);
  }
  
  // Step 3: Brand Identity
  try {
    console.log('\nSubmitting Brand Identity data...');
    const brandIdentityResponse = await fetch(`${API_URL}/api/onboarding/brand-identity`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.brandIdentity)
    });
    
    if (!brandIdentityResponse.ok) {
      console.error(`Brand Identity submission failed: ${brandIdentityResponse.status} ${brandIdentityResponse.statusText}`);
      const errorText = await brandIdentityResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Brand Identity submission failed');
    }
    
    console.log('Brand Identity data submitted successfully.');
  } catch (error) {
    console.error('Error submitting Brand Identity data:', error);
  }
  
  // Step 4: Products/Services
  try {
    console.log('\nSubmitting Products/Services data...');
    const productsServicesResponse = await fetch(`${API_URL}/api/onboarding/products-services`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.productsServices)
    });
    
    if (!productsServicesResponse.ok) {
      console.error(`Products/Services submission failed: ${productsServicesResponse.status} ${productsServicesResponse.statusText}`);
      const errorText = await productsServicesResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Products/Services submission failed');
    }
    
    console.log('Products/Services data submitted successfully.');
  } catch (error) {
    console.error('Error submitting Products/Services data:', error);
  }
  
  // Step 5: Creative Examples
  try {
    console.log('\nSubmitting Creative Examples data...');
    const creativeExamplesResponse = await fetch(`${API_URL}/api/onboarding/creative-examples`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.creativeExamples)
    });
    
    if (!creativeExamplesResponse.ok) {
      console.error(`Creative Examples submission failed: ${creativeExamplesResponse.status} ${creativeExamplesResponse.statusText}`);
      const errorText = await creativeExamplesResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Creative Examples submission failed');
    }
    
    console.log('Creative Examples data submitted successfully.');
  } catch (error) {
    console.error('Error submitting Creative Examples data:', error);
  }
  
  // Step 6: Performance Context
  try {
    console.log('\nSubmitting Performance Context data...');
    const performanceContextResponse = await fetch(`${API_URL}/api/onboarding/performance-context`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData.performanceContext)
    });
    
    if (!performanceContextResponse.ok) {
      console.error(`Performance Context submission failed: ${performanceContextResponse.status} ${performanceContextResponse.statusText}`);
      const errorText = await performanceContextResponse.text();
      console.error('Error details:', errorText);
      throw new Error('Performance Context submission failed');
    }
    
    console.log('Performance Context data submitted successfully.');
  } catch (error) {
    console.error('Error submitting Performance Context data:', error);
  }
}

// Verify data in the database
async function verifyDataInDatabase(userId) {
  console.log('\n=== Verifying Data in Database ===\n');
  
  try {
    // Check Business Core
    const businessCoreData = await db.query.businessCore.findFirst({
      where: eq(businessCore.userId, userId)
    });
    
    console.log('Business Core Data:');
    console.log(businessCoreData ? '- Found in database ✓' : '- Not found in database ✗');
    if (businessCoreData) {
      console.log(`- Business Name: ${businessCoreData.businessName}`);
      console.log(`- Industry: ${businessCoreData.industry}`);
      console.log(`- Company Size: ${businessCoreData.companySize}`);
    }
    
    // Check Brand Identity
    const brandIdentityData = await db.query.brandIdentity.findFirst({
      where: eq(brandIdentity.userId, userId)
    });
    
    console.log('\nBrand Identity Data:');
    console.log(brandIdentityData ? '- Found in database ✓' : '- Not found in database ✗');
    if (brandIdentityData) {
      console.log(`- Brand Name: ${brandIdentityData.brandName}`);
      console.log(`- Brand Description: ${brandIdentityData.brandDescription}`);
      console.log(`- Brand Voice: ${brandIdentityData.brandVoice?.join(', ')}`);
    }
    
    // Check Products/Services
    const productsServicesData = await db.query.productsServices.findFirst({
      where: eq(productsServices.userId, userId)
    });
    
    console.log('\nProducts/Services Data:');
    console.log(productsServicesData ? '- Found in database ✓' : '- Not found in database ✗');
    if (productsServicesData) {
      console.log(`- Product Types: ${productsServicesData.productTypes?.join(', ')}`);
      console.log(`- Top Selling Products: ${productsServicesData.topSellingProducts ? JSON.stringify(productsServicesData.topSellingProducts).substring(0, 100) + '...' : 'None'}`);
      console.log(`- Pricing Strategy: ${productsServicesData.pricingStrategy}`);
    }
    
    // Check Creative Examples
    const creativeExamplesData = await db.query.creativeExamples.findFirst({
      where: eq(creativeExamples.userId, userId)
    });
    
    console.log('\nCreative Examples Data:');
    console.log(creativeExamplesData ? '- Found in database ✓' : '- Not found in database ✗');
    if (creativeExamplesData) {
      console.log(`- Ad Examples: ${creativeExamplesData.adExamples ? JSON.stringify(creativeExamplesData.adExamples).substring(0, 100) + '...' : 'None'}`);
      console.log(`- Preferred Ad Formats: ${creativeExamplesData.preferredAdFormats?.join(', ')}`);
    }
    
    // Check Performance Context
    const performanceContextData = await db.query.performanceContext.findFirst({
      where: eq(performanceContext.userId, userId)
    });
    
    console.log('\nPerformance Context Data:');
    console.log(performanceContextData ? '- Found in database ✓' : '- Not found in database ✗');
    if (performanceContextData) {
      console.log(`- Current Performance: ${performanceContextData.currentPerformance ? JSON.stringify(performanceContextData.currentPerformance).substring(0, 100) + '...' : 'None'}`);
      console.log(`- Key Metrics: ${performanceContextData.keyMetrics?.join(', ')}`);
    }
    
    // Check Onboarding Progress
    const progressData = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId)
    });
    
    console.log('\nOnboarding Progress:');
    console.log(progressData ? '- Found in database ✓' : '- Not found in database ✗');
    if (progressData) {
      console.log(`- Current Step: ${progressData.currentStep}`);
      console.log(`- Is Complete: ${progressData.isComplete ? 'Yes' : 'No'}`);
      console.log(`- Last Updated: ${progressData.lastUpdated}`);
    }
    
    return {
      businessCoreExists: !!businessCoreData,
      brandIdentityExists: !!brandIdentityData,
      productsServicesExists: !!productsServicesData,
      creativeExamplesExists: !!creativeExamplesData,
      performanceContextExists: !!performanceContextData,
      progressExists: !!progressData
    };
  } catch (error) {
    console.error('Error verifying data in database:', error);
    return null;
  }
}

// Test reset functionality
async function testResetFunctionality(token, userId) {
  console.log('\n=== Testing Reset Onboarding Functionality ===\n');
  
  try {
    console.log('Calling reset onboarding API...');
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
    
    // Verify data was reset
    console.log('\nVerifying data after reset...');
    const afterResetData = await verifyDataInDatabase(userId);
    
    // Check if all data was deleted
    if (afterResetData) {
      const allDeleted = !afterResetData.businessCoreExists && 
                         !afterResetData.brandIdentityExists && 
                         !afterResetData.productsServicesExists && 
                         !afterResetData.creativeExamplesExists && 
                         !afterResetData.performanceContextExists;
                         
      if (allDeleted) {
        console.log('\nRESET TEST PASSED: All onboarding data was successfully deleted ✓');
      } else {
        console.log('\nRESET TEST FAILED: Some onboarding data was not deleted ✗');
      }
      
      // Check if progress was reset
      if (afterResetData.progressExists) {
        const progressData = await db.query.onboardingProgress.findFirst({
          where: eq(onboardingProgress.userId, userId)
        });
        
        if (progressData && progressData.currentStep === 1 && !progressData.isComplete) {
          console.log('Onboarding progress was successfully reset to step 1 ✓');
        } else {
          console.log('Onboarding progress was not properly reset ✗');
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error testing reset functionality:', error);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('=== Starting Onboarding Data Tests ===');
  
  // Login
  console.log('\nLogging in...');
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
    console.error(`Failed to get user: ${userResponse.status} ${userResponse.statusText}`);
    return;
  }
  
  const userData = await userResponse.json();
  const userId = userData.id;
  
  console.log(`Testing with user ID: ${userId}`);
  
  // Submit test data
  await submitOnboardingData(token, userId);
  
  // Verify data in database
  await verifyDataInDatabase(userId);
  
  // Test reset functionality
  await testResetFunctionality(token, userId);
  
  console.log('\n=== Onboarding Data Tests Completed ===');
}

// Run the tests
runTests().catch(console.error);