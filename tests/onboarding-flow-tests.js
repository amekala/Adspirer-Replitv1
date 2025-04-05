/**
 * Onboarding Flow Tests
 * 
 * This file contains tests to verify that the onboarding flow works correctly,
 * including data submission and the reset onboarding functionality.
 */

const puppeteer = require('puppeteer');
const { setTimeout } = require('timers/promises');

// Constants
const APP_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!'
};

// Test data for onboarding flow
const TEST_BUSINESS_CORE = {
  businessName: 'Test Company',
  industry: 'Technology',
  businessSize: 'Medium',
  targetAudience: 'Small businesses and startups',
  marketingBudget: '10000-50000',
  primaryGoals: 'Increase brand awareness and lead generation'
};

const TEST_BRAND_IDENTITY = {
  brandValues: 'Innovation, Reliability, Customer-focused',
  brandVoice: 'Professional yet approachable',
  competitiveAdvantages: 'Superior technology, excellent customer service',
  visualStylePreferences: 'Modern, clean design with blue and green color scheme'
};

describe('Onboarding Flow Tests', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // Create new page
    page = await browser.newPage();
    
    // Login
    await login(page);
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('User can submit business core information', async () => {
    // Navigate to onboarding flow
    await page.goto(`${APP_URL}/onboarding`, { waitUntil: 'networkidle0' });
    
    // Fill out business core form
    await page.waitForSelector('input[name="businessName"]');
    await page.type('input[name="businessName"]', TEST_BUSINESS_CORE.businessName);
    await page.type('input[name="industry"]', TEST_BUSINESS_CORE.industry);
    await page.select('select[name="businessSize"]', TEST_BUSINESS_CORE.businessSize);
    await page.type('textarea[name="targetAudience"]', TEST_BUSINESS_CORE.targetAudience);
    await page.select('select[name="marketingBudget"]', TEST_BUSINESS_CORE.marketingBudget);
    await page.type('textarea[name="primaryGoals"]', TEST_BUSINESS_CORE.primaryGoals);
    
    // Submit the form
    await page.click('button[type="submit"]');
    
    // Verify navigation to next step
    await page.waitForSelector('h2:contains("Connect Platforms")');
    
    // Verify data was saved (by checking for presence in database or by checking UI state)
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/user/business-core');
      return await res.json();
    });
    
    expect(response).toBeTruthy();
    expect(response.businessName).toBe(TEST_BUSINESS_CORE.businessName);
  });
  
  test('User can reset onboarding data', async () => {
    // Navigate to settings page
    await page.goto(`${APP_URL}/settings/compliance`, { waitUntil: 'networkidle0' });
    
    // Click on "Data Rights" tab
    await page.click('button[value="dataRights"]');
    
    // Click reset onboarding data button
    await page.waitForSelector('button:contains("Reset Onboarding Data")');
    
    // Setup response listener before clicking
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/user/reset-onboarding') && response.status() === 200
    );
    
    // Click reset button
    await page.click('button:contains("Reset Onboarding Data")');
    
    // Wait for response
    const response = await responsePromise;
    const responseData = await response.json();
    
    // Verify response
    expect(responseData.success).toBe(true);
    
    // Verify data was deleted by checking onboarding progress
    await page.goto(`${APP_URL}/onboarding`, { waitUntil: 'networkidle0' });
    
    // Should be back to step 1
    await page.waitForSelector('h2:contains("Business Core")');
    
    // Verify business core data is reset
    const businessCore = await page.evaluate(async () => {
      const res = await fetch('/api/user/business-core');
      return await res.json();
    });
    
    expect(businessCore).toBeNull();
  });
});

/**
 * Helper function to login to the application
 */
async function login(page) {
  await page.goto(`${APP_URL}/login`, { waitUntil: 'networkidle0' });
  
  // Fill in login form
  await page.waitForSelector('input[name="email"]');
  await page.type('input[name="email"]', TEST_USER.email);
  await page.type('input[name="password"]', TEST_USER.password);
  
  // Submit login form
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForNavigation({ waitUntil: 'networkidle0' });
  
  // Verify login was successful
  const isLoggedIn = await page.evaluate(() => {
    return !!document.querySelector('a:contains("Dashboard")');
  });
  
  expect(isLoggedIn).toBe(true);
}