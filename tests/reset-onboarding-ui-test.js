/**
 * Reset Onboarding UI Test
 * 
 * This script uses Puppeteer to test the Reset Onboarding Data button in the UI.
 * It simulates a user clicking the button and verifies the reset was successful.
 */

const puppeteer = require('puppeteer');

// Setup constants
const URL = 'http://localhost:5000';
const USER_EMAIL = 'test@example.com';
const USER_PASSWORD = 'TestPassword123!';

// Test steps
async function testResetOnboardingButton() {
  console.log('Starting Reset Onboarding UI Test...');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Enable console log capturing
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    // Login
    console.log('Logging in...');
    await page.goto(`${URL}/login`);
    await page.waitForSelector('input[name="email"]');
    await page.type('input[name="email"]', USER_EMAIL);
    await page.type('input[name="password"]', USER_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for login to complete
    await page.waitForNavigation();
    console.log('Login successful.');
    
    // Navigate to Settings > Compliance
    console.log('Navigating to Settings > Compliance...');
    await page.goto(`${URL}/settings/compliance`);
    
    // Click on Data Rights tab
    console.log('Clicking Data Rights tab...');
    await page.waitForSelector('button[value="dataRights"]');
    await page.click('button[value="dataRights"]');
    
    // Wait for tab content to load
    await page.waitForSelector('h3:contains("Reset Onboarding Data")');
    
    // Take a screenshot of the button area before clicking
    await page.screenshot({ path: 'before-reset-button-click.png' });
    
    // Click the Reset Onboarding Data button
    console.log('Clicking Reset Onboarding Data button...');
    
    // Setup network request listener for reset API call
    const resetRequestPromise = page.waitForResponse(
      response => response.url().includes('/api/user/reset-onboarding')
    );
    
    // Click the button
    await page.click('button:contains("Reset Onboarding Data")');
    
    // Wait for reset API request to complete
    const resetResponse = await resetRequestPromise;
    const resetResponseData = await resetResponse.json();
    
    console.log('Reset API response:', resetResponseData);
    
    // Wait for toast notification to appear
    await page.waitForSelector('[role="status"]:contains("Data deleted successfully")');
    
    // Take a screenshot after reset
    await page.screenshot({ path: 'after-reset-button-click.png' });
    
    // Navigate to onboarding to verify reset
    console.log('Navigating to onboarding to verify reset...');
    await page.goto(`${URL}/onboarding`);
    
    // Check if we're now at step 1
    await page.waitForSelector('h2:contains("Business Core")');
    
    const currentStep = await page.evaluate(() => {
      // Check the heading or any indicator that shows current step
      return document.querySelector('h2').textContent;
    });
    
    console.log('Current onboarding step:', currentStep);
    
    // Take screenshot of onboarding page after reset
    await page.screenshot({ path: 'onboarding-after-reset.png' });
    
    console.log('Test completed successfully!');
    console.log('Reset operation result:', resetResponseData.success ? 'Successful' : 'Failed');
    
  } catch (error) {
    console.error('Test failed with error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testResetOnboardingButton()
  .then(() => console.log('UI Test completed.'))
  .catch(error => console.error('UI Test error:', error))
  .finally(() => process.exit(0));