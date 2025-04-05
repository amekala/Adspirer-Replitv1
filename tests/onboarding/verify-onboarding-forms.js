/**
 * Test script to verify onboarding form components
 * 
 * This script uses Puppeteer to:
 * 1. Check that all onboarding steps are accessible
 * 2. Verify all form fields are present in each step
 * 3. Test form validation
 * 
 * Run with: node tests/onboarding/verify-onboarding-forms.js
 */

import puppeteer from 'puppeteer';

// Configuration
const APP_URL = 'http://localhost:5000';
const USER_EMAIL = 'abhilashreddi@gmail.com';
const USER_PASSWORD = 'T1l1icron!';

// Expected form fields for each step
const expectedFields = {
  businessCore: [
    'businessName',
    'industry',
    'companySize',
    'marketplaces',
    'mainGoals',
    'monthlyAdSpend',
    'website'
  ],
  
  brandIdentity: [
    'brandName',
    'brandDescription',
    'brandVoice',
    'targetAudience',
    'brandValues',
    'primaryColor',
    'secondaryColor',
    'logoUrl'
  ],
  
  productsServices: [
    'productTypes',
    'topSellingProducts',
    'pricingStrategy',
    'competitiveAdvantage',
    'targetMarkets'
  ],
  
  creativeExamples: [
    'adExamples',
    'preferredAdFormats',
    'brandGuidelines'
  ],
  
  performanceContext: [
    'currentPerformance',
    'keyMetrics',
    'performanceGoals',
    'seasonalTrends',
    'benchmarks'
  ]
};

// Test the onboarding forms
async function testOnboardingForms() {
  console.log('=== TESTING ONBOARDING FORM COMPONENTS ===\n');
  
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
    
    // Check for 6 onboarding steps
    const stepsCount = await page.evaluate(() => {
      const stepElements = document.querySelectorAll('[data-test="onboarding-step"]');
      return stepElements.length;
    });
    
    console.log(`\nFound ${stepsCount} onboarding steps ${stepsCount === 6 ? '✅' : '❌'}`);
    
    // Check each step
    for (let step = 1; step <= 6; step++) {
      console.log(`\n--- Testing Step ${step} ---`);
      
      // Click on step in sidebar
      await page.evaluate((currentStep) => {
        const steps = document.querySelectorAll('[data-test="onboarding-step"]');
        if (steps[currentStep - 1]) {
          steps[currentStep - 1].click();
        }
      }, step);
      
      // Wait for step content to load
      await page.waitForSelector('[data-test="step-content"]');
      
      // Check form fields based on step
      let stepKey;
      switch (step) {
        case 1: stepKey = 'businessCore'; break;
        case 2: stepKey = 'connectPlatforms'; break; // Special case
        case 3: stepKey = 'brandIdentity'; break;
        case 4: stepKey = 'productsServices'; break;
        case 5: stepKey = 'creativeExamples'; break;
        case 6: stepKey = 'performanceContext'; break;
      }
      
      // Skip Connect Platforms (step 2) as it's handled differently
      if (stepKey === 'connectPlatforms') {
        console.log('Skipping Connect Platforms form field verification (handled separately)');
        continue;
      }
      
      // Check expected fields for current step
      const expectedStepFields = expectedFields[stepKey];
      const foundFields = await page.evaluate(() => {
        // Select all form elements that would typically have name attributes
        const formElements = Array.from(document.querySelectorAll('input, select, textarea'));
        return formElements.map(element => element.name).filter(Boolean);
      });
      
      console.log(`Expected fields: ${expectedStepFields.join(', ')}`);
      console.log(`Found fields: ${foundFields.join(', ')}`);
      
      // Check missing fields
      const missingFields = expectedStepFields.filter(field => !foundFields.includes(field));
      if (missingFields.length > 0) {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ All expected fields found');
      }
    }
    
    console.log('\n=== TESTING ONBOARDING FORM VALIDATION ===');
    
    // Test form validation on first step
    console.log('\nTesting validation on Business Core step...');
    await page.evaluate(() => {
      const steps = document.querySelectorAll('[data-test="onboarding-step"]');
      if (steps[0]) {
        steps[0].click();
      }
    });
    
    // Wait for form to load
    await page.waitForSelector('[data-test="step-content"]');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    await page.waitForTimeout(500); // Give time for validation errors to appear
    
    const validationErrors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('[data-test="form-error"]');
      return Array.from(errorElements).map(el => el.textContent);
    });
    
    console.log(`Found ${validationErrors.length} validation errors:`);
    validationErrors.forEach(error => console.log(`- ${error}`));
    
    if (validationErrors.length > 0) {
      console.log('✅ Form validation is working');
    } else {
      console.log('❌ Form validation not detected');
    }
    
    console.log('\n=== ONBOARDING FORM VERIFICATION COMPLETED ===');
    
  } catch (error) {
    console.error('Error during onboarding form testing:', error);
  } finally {
    await browser.close();
  }
}

// Run the tests
testOnboardingForms().catch(error => {
  console.error('Unhandled error in form testing:', error);
});