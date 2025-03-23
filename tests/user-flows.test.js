/**
 * Comprehensive User Flows Testing for Adspirer Application
 * 
 * This test suite verifies critical end-to-end user journeys including:
 * - Login/logout flow
 * - Navigation between different sections
 * - Chat conversation creation and interaction
 * - Campaign data analysis queries
 */

const { baseUrl, testUser, selectors, timeouts } = require('./config');
const helpers = require('./helpers');

describe('Adspirer UI Tests', () => {
  beforeAll(async () => {
    // Set default navigation timeout
    await page.setDefaultNavigationTimeout(30000);
    
    // Create screenshots directory if it doesn't exist
    const fs = require('fs');
    if (!fs.existsSync('./screenshots')) {
      fs.mkdirSync('./screenshots');
    }
  });

  beforeEach(async () => {
    await page.goto(baseUrl);
  });

  test('Full user flow: Login -> Chat -> New Conversation -> Send Message -> Logout', async () => {
    // Step 1: Login
    await helpers.login(page, testUser);
    
    // Take screenshot after login (helpful for debugging)
    await helpers.takeScreenshot(page, 'after-login');
    
    // Verify login was successful (look for dashboard element)
    const isLoggedIn = await page.$eval('body', el => 
      el.textContent.includes('Dashboard') || 
      el.textContent.includes('Welcome') || 
      el.textContent.includes(testUser.email)
    );
    expect(isLoggedIn).toBe(true);
    
    // Step 2: Navigate to Chat
    await helpers.navigateTo(page, 'chat');
    
    // Verify on chat page
    const isChatPage = await page.$eval('body', el => 
      el.textContent.includes('New Conversation') || 
      el.textContent.includes('Chat')
    );
    expect(isChatPage).toBe(true);
    
    // Step 3: Create a new conversation
    await helpers.createNewConversation(page);
    
    // Step 4: Send a message and verify response
    const testMessage = "Hello, this is a test message";
    const gotResponse = await helpers.sendMessageAndWaitForResponse(page, testMessage);
    
    await helpers.takeScreenshot(page, 'after-message');
    
    // Verify we got a response
    expect(gotResponse).toBe(true);
    
    // Step 5: Navigate back to home
    await helpers.navigateTo(page, 'home');
    
    // Verify we're on home page
    const isHomePage = await page.$eval('body', el => 
      el.textContent.includes('Welcome to Adspirer') || 
      el.textContent.includes('Transform Your Retail Media Strategy')
    );
    expect(isHomePage).toBe(true);
    
    // Step 6: Logout
    await helpers.logout(page);
    
    // Verify logout was successful (login form is visible)
    const isLoggedOut = await page.$(selectors.emailInput) !== null;
    expect(isLoggedOut).toBe(true);
  });
  
  // Add more specialized tests
  test('Login with invalid credentials fails', async () => {
    // Try to login with wrong password
    await helpers.login(page, {
      email: testUser.email,
      password: 'wrongpassword'
    });
    
    // Verify we're still on login page
    const isStillOnLoginPage = await page.$(selectors.emailInput) !== null;
    expect(isStillOnLoginPage).toBe(true);
    
    // Check for error message
    const hasErrorMessage = await page.$eval('body', el => 
      el.textContent.includes('Invalid') || 
      el.textContent.includes('failed') || 
      el.textContent.includes('incorrect')
    );
    expect(hasErrorMessage).toBe(true);
  });
  
  test('Chat interaction with campaign data queries', async () => {
    // Login
    await helpers.login(page, testUser);
    
    // Navigate to chat
    await helpers.navigateTo(page, 'chat');
    
    // Create new conversation
    await helpers.createNewConversation(page);
    
    // Test a sequence of messages
    const messages = [
      "What can you help me with?",
      "Show me my top performing campaigns",
      "Compare Amazon and Google performance"
    ];
    
    for (const message of messages) {
      const gotResponse = await helpers.sendMessageAndWaitForResponse(page, message);
      expect(gotResponse).toBe(true);
      
      // Take a screenshot after each response
      await helpers.takeScreenshot(page, `chat-${message.slice(0, 10)}`);
      
      // Allow time for any animations to complete
      await page.waitForTimeout(timeouts.short);
    }
  });
  
  test('Dashboard navigation and data visualization test', async () => {
    // Login
    await helpers.login(page, testUser);
    
    // Navigate to dashboard
    await helpers.navigateTo(page, 'dashboard');
    
    // Verify dashboard components loaded
    const hasDashboardComponents = await page.$eval('body', el => 
      el.textContent.includes('Dashboard') && 
      (el.textContent.includes('Campaigns') || 
       el.textContent.includes('Performance') || 
       el.textContent.includes('Analytics'))
    );
    expect(hasDashboardComponents).toBe(true);
    
    // Take screenshot of dashboard
    await helpers.takeScreenshot(page, 'dashboard-view');
    
    // Test any dashboard interactive elements if applicable
    // This would depend on your specific dashboard implementation
  });
});