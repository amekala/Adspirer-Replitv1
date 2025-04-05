/**
 * Test script for onboarding data persistence
 * 
 * This script tests:
 * 1. Filling out all onboarding steps via UI
 * 2. Checking data persistence in database
 * 3. Testing reset functionality
 * 
 * Run with: node tests/onboarding/test-onboarding-data.js
 */

import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Configuration
const APP_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';
const USER_PASSWORD = 'T1l1icron!';

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "Test Business UI",
    industry: "E-Commerce",
    companySize: "11-50",
    marketplaces: ["Amazon", "Walmart", "eBay"],
    mainGoals: ["Increase Sales", "Improve ROAS", "Brand Awareness"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://testbusiness.com"
  },
  
  brandIdentity: {
    brandName: "TestBrand UI",
    brandDescription: "A premium brand focused on quality products",
    brandVoice: ["Professional", "Friendly", "Inspirational"],
    targetAudience: ["Millennials", "Health Enthusiasts"],
    brandValues: ["Quality", "Innovation", "Sustainability"],
    primaryColor: "#4B0082",
    secondaryColor: "#E6E6FA",
    logoUrl: "https://example.com/logo.png"
  }
};

// Fill a form with test data
async function fillForm(page, step, data) {
  console.log(`Filling form for step ${step}...`);
  
  switch (step) {
    case 1: // Business Core
      await page.type('input[name="businessName"]', data.businessName);
      await page.select('select[name="industry"]', data.industry);
      await page.select('select[name="companySize"]', data.companySize);
      
      // Handle multiple select for marketplaces
      for (const marketplace of data.marketplaces) {
        await page.click(`[data-value="${marketplace}"]`);
      }
      
      // Handle multiple select for goals
      for (const goal of data.mainGoals) {
        await page.click(`[data-value="${goal}"]`);
      }
      
      await page.select('select[name="monthlyAdSpend"]', data.monthlyAdSpend);
      await page.type('input[name="website"]', data.website);
      break;
      
    case 3: // Brand Identity
      await page.type('input[name="brandName"]', data.brandName);
      await page.type('textarea[name="brandDescription"]', data.brandDescription);
      
      // Handle multiple select for brand voice
      for (const voice of data.brandVoice) {
        await page.click(`[data-value="${voice}"]`);
      }
      
      // Handle multiple select for target audience
      for (const audience of data.targetAudience) {
        await page.click(`[data-value="${audience}"]`);
      }
      
      // Handle multiple select for brand values
      for (const value of data.brandValues) {
        await page.click(`[data-value="${value}"]`);
      }
      
      await page.type('input[name="primaryColor"]', data.primaryColor);
      await page.type('input[name="secondaryColor"]', data.secondaryColor);
      await page.type('input[name="logoUrl"]', data.logoUrl);
      break;
      
    default:
      console.log(`No fill logic for step ${step}, skipping`);
  }
  
  // Submit the form
  await page.click('button[type="submit"]');
  console.log(`Submitted form for step ${step}`);
}

// Check database for saved data
async function checkDatabaseData(userId) {
  console.log('\n=== CHECKING DATABASE FOR SAVED DATA ===\n');
  
  const results = {
    businessCore: null,
    brandIdentity: null
  };
  
  try {
    // Check Business Core
    const businessCoreQuery = 'SELECT * FROM business_core WHERE user_id = $1';
    const businessCoreResult = await pool.query(businessCoreQuery, [userId]);
    
    if (businessCoreResult.rows.length > 0) {
      results.businessCore = businessCoreResult.rows[0];
      console.log('Business Core data found in database ✅');
      console.log('Data:', results.businessCore);
    } else {
      console.log('Business Core data not found in database ❌');
    }
    
    // Check Brand Identity
    const brandIdentityQuery = 'SELECT * FROM brand_identity WHERE user_id = $1';
    const brandIdentityResult = await pool.query(brandIdentityQuery, [userId]);
    
    if (brandIdentityResult.rows.length > 0) {
      results.brandIdentity = brandIdentityResult.rows[0];
      console.log('\nBrand Identity data found in database ✅');
      console.log('Data:', results.brandIdentity);
    } else {
      console.log('\nBrand Identity data not found in database ❌');
    }
    
    return results;
  } catch (error) {
    console.error('Error checking database data:', error);
    return results;
  }
}

// Reset onboarding data in database
async function resetDatabaseData(userId) {
  console.log('\n=== RESETTING ONBOARDING DATA ===\n');
  
  try {
    // Delete from all onboarding tables
    const tables = [
      'business_core',
      'brand_identity',
      'products_services',
      'creative_examples',
      'performance_context',
      'onboarding_progress'
    ];
    
    for (const table of tables) {
      const query = `DELETE FROM ${table} WHERE user_id = $1`;
      await pool.query(query, [userId]);
      console.log(`Deleted data from ${table} ✅`);
    }
    
    return true;
  } catch (error) {
    console.error('Error resetting database data:', error);
    return false;
  }
}

// Get user ID from email
async function getUserIdFromEmail(email) {
  try {
    const query = 'SELECT id FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Test onboarding data persistence
async function testOnboardingData() {
  console.log('=== TESTING ONBOARDING DATA PERSISTENCE ===\n');
  
  // Get user ID for test user
  const userId = await getUserIdFromEmail(USER_EMAIL);
  
  if (!userId) {
    console.error(`Could not find user ID for ${USER_EMAIL}`);
    return false;
  }
  
  console.log(`Testing with user ID: ${userId}`);
  
  // Reset onboarding data first
  await resetDatabaseData(userId);
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Login first
    console.log('Logging in...');
    await page.goto(`${APP_URL}/login`);
    await page.waitForSelector('input[name="email"]');
    
    // Fill login form
    await page.type('input[name="email"]', USER_EMAIL);
    await page.type('input[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
    console.log('Login successful ✅');
    
    // Navigate to onboarding
    console.log('\nNavigating to onboarding...');
    await page.goto(`${APP_URL}/onboarding`);
    await page.waitForSelector('[data-test="onboarding-wizard"]');
    console.log('Onboarding page loaded ✅');
    
    // Fill Step 1 (Business Core)
    console.log('\n--- Step 1: Business Core ---');
    await fillForm(page, 1, testData.businessCore);
    
    // Wait for navigation to next step
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {
      console.log('No navigation occurred after form submission, continuing...');
    });
    
    // Skip Step 2 (Connect Platforms) for testing
    console.log('\n--- Step 2: Connect Platforms (skipping) ---');
    await page.evaluate(() => {
      const steps = document.querySelectorAll('[data-test="onboarding-step"]');
      if (steps[2]) { // Index 2 is step 3
        steps[2].click();
      }
    });
    
    // Wait for step content to load
    await page.waitForSelector('[data-test="step-content"]');
    
    // Fill Step 3 (Brand Identity)
    console.log('\n--- Step 3: Brand Identity ---');
    await fillForm(page, 3, testData.brandIdentity);
    
    // Wait for form processing
    await page.waitForTimeout(1000);
    
    // Check if data was saved in the database
    const dbData = await checkDatabaseData(userId);
    
    // Verify data matches what we submitted
    console.log('\n=== VERIFYING DATA CONSISTENCY ===\n');
    
    let businessCoreVerified = false;
    if (dbData.businessCore) {
      const bc = dbData.businessCore;
      businessCoreVerified = 
        bc.business_name === testData.businessCore.businessName &&
        bc.industry === testData.businessCore.industry;
      
      console.log(`Business Core verification: ${businessCoreVerified ? '✅ Passed' : '❌ Failed'}`);
      
      if (!businessCoreVerified) {
        console.log('Business Core data mismatch:');
        console.log('Expected:', testData.businessCore);
        console.log('Actual:', bc);
      }
    }
    
    let brandIdentityVerified = false;
    if (dbData.brandIdentity) {
      const bi = dbData.brandIdentity;
      brandIdentityVerified = 
        bi.brand_name === testData.brandIdentity.brandName &&
        bi.brand_description === testData.brandIdentity.brandDescription;
      
      console.log(`Brand Identity verification: ${brandIdentityVerified ? '✅ Passed' : '❌ Failed'}`);
      
      if (!brandIdentityVerified) {
        console.log('Brand Identity data mismatch:');
        console.log('Expected:', testData.brandIdentity);
        console.log('Actual:', bi);
      }
    }
    
    // Final result
    console.log('\n=== TEST SUMMARY ===\n');
    console.log(`Business Core data saved: ${dbData.businessCore ? '✅ Yes' : '❌ No'}`);
    console.log(`Brand Identity data saved: ${dbData.brandIdentity ? '✅ Yes' : '❌ No'}`);
    console.log(`Business Core data verified: ${businessCoreVerified ? '✅ Yes' : '❌ No'}`);
    console.log(`Brand Identity data verified: ${brandIdentityVerified ? '✅ Yes' : '❌ No'}`);
    
    const testPassed = dbData.businessCore && dbData.brandIdentity && businessCoreVerified && brandIdentityVerified;
    console.log(`\nOverall test result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    return testPassed;
  } catch (error) {
    console.error('Error during onboarding data testing:', error);
    return false;
  } finally {
    await browser.close();
    await pool.end();
  }
}

// Run the tests
testOnboardingData().catch(error => {
  console.error('Unhandled error in data testing:', error);
});