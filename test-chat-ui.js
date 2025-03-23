const puppeteer = require('puppeteer');
const colors = require('colors');

/**
 * Test script to validate that user messages are showing in the chat UI
 * 
 * This script:
 * 1. Launches a headless browser
 * 2. Logs in to the application
 * 3. Navigates to the chat page
 * 4. Creates a new conversation if needed
 * 5. Sends a test message
 * 6. Validates that the user message appears in the UI
 * 7. Reports the results
 */

// Configuration
const config = {
  baseUrl: 'http://localhost:5000',
  loginCredentials: {
    email: 'test@example.com', 
    password: 'password123'
  },
  testMessage: 'This is a test message ' + new Date().toISOString()
};

// Test results
const testResults = {
  loginSuccess: false,
  navigatedToChat: false,
  sentMessage: false,
  messageVisible: false
};

// Main test function
async function runTest() {
  console.log('Starting Chat UI Test'.green.bold);
  console.log('==================='.green);
  
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to true for production use
    defaultViewport: null,
    args: ['--window-size=1280,800']
  });
  
  try {
    const page = await browser.newPage();
    console.log('Browser launched'.cyan);
    
    // Navigate to the application
    await page.goto(config.baseUrl, { waitUntil: 'networkidle2' });
    console.log(`Navigated to ${config.baseUrl}`.cyan);
    
    // Check if we need to log in
    const isLoggedIn = await checkIfLoggedIn(page);
    
    if (!isLoggedIn) {
      // Log in to the application
      await login(page);
    } else {
      testResults.loginSuccess = true;
      console.log('Already logged in'.green);
    }
    
    // Navigate to chat page
    await navigateToChat(page);
    
    // Create new conversation or use existing
    await createOrSelectConversation(page);
    
    // Send a test message
    await sendMessage(page, config.testMessage);
    
    // Validate message visibility
    await validateMessageVisible(page, config.testMessage);
    
    // Print test report
    printTestReport();
    
  } catch (error) {
    console.error('Error during test:'.red.bold, error);
  } finally {
    console.log('Closing browser in 5 seconds...'.yellow);
    // Keep browser open for a moment to see results
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
    console.log('Test completed'.green.bold);
  }
}

// Check if already logged in
async function checkIfLoggedIn(page) {
  try {
    // Check for elements that would indicate we're logged in
    const loggedInElement = await page.$('.user-profile, .dashboard-nav, nav a[href="/dashboard"]');
    return !!loggedInElement;
  } catch (error) {
    console.log('Error checking login status:', error);
    return false;
  }
}

// Login to the application
async function login(page) {
  try {
    console.log('Attempting to log in...'.cyan);
    
    // Check if we are on the login page, if not navigate there
    const currentUrl = page.url();
    if (!currentUrl.includes('/auth')) {
      await page.goto(`${config.baseUrl}/auth`, { waitUntil: 'networkidle2' });
    }
    
    // Wait for login form
    await page.waitForSelector('form');
    
    // Fill login credentials
    await page.type('input[name="email"]', config.loginCredentials.email);
    await page.type('input[name="password"]', config.loginCredentials.password);
    
    // Submit form
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // Check if login was successful by looking for dashboard elements
    const dashboardElement = await page.$('nav a[href="/dashboard"]');
    testResults.loginSuccess = !!dashboardElement;
    
    if (testResults.loginSuccess) {
      console.log('Login successful'.green);
    } else {
      console.log('Login failed'.red);
    }
  } catch (error) {
    console.error('Error during login:'.red, error);
    testResults.loginSuccess = false;
  }
}

// Navigate to chat page
async function navigateToChat(page) {
  try {
    console.log('Navigating to chat page...'.cyan);
    
    // Click on the chat link in the navigation
    const chatLink = await page.$('a[href="/chat"], nav a:contains("AI Chat")');
    if (chatLink) {
      await Promise.all([
        chatLink.click(),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
    } else {
      // Directly navigate to the chat page
      await page.goto(`${config.baseUrl}/chat`, { waitUntil: 'networkidle2' });
    }
    
    // Check if navigation was successful
    const chatContainer = await page.$('.chat-container, form textarea, .chat-input');
    testResults.navigatedToChat = !!chatContainer;
    
    if (testResults.navigatedToChat) {
      console.log('Navigation to chat page successful'.green);
    } else {
      console.log('Navigation to chat page failed'.red);
    }
  } catch (error) {
    console.error('Error navigating to chat page:'.red, error);
    testResults.navigatedToChat = false;
  }
}

// Create new conversation or select existing
async function createOrSelectConversation(page) {
  try {
    console.log('Setting up conversation...'.cyan);
    
    // Check if we need to create a new conversation
    const newChatButton = await page.$('button:contains("New Chat"), button:contains("New Conversation")');
    if (newChatButton) {
      await newChatButton.click();
      await page.waitForTimeout(2000); // Wait for potential welcome message
    }
    
    console.log('Conversation ready'.green);
  } catch (error) {
    console.error('Error setting up conversation:'.red, error);
  }
}

// Send a test message
async function sendMessage(page, message) {
  try {
    console.log(`Sending test message: "${message}"`.cyan);
    
    // Find the message input field
    const inputField = await page.$('textarea, input[type="text"].chat-input');
    if (!inputField) {
      console.log('Message input field not found'.red);
      return;
    }
    
    // Type the message
    await inputField.type(message);
    
    // Find the send button
    const sendButton = await page.$('button[type="submit"], button.send-button');
    if (sendButton) {
      await sendButton.click();
    } else {
      // Try pressing Enter instead
      await inputField.press('Enter');
    }
    
    // Wait for the message to be processed
    await page.waitForTimeout(1000);
    testResults.sentMessage = true;
    console.log('Message sent'.green);
  } catch (error) {
    console.error('Error sending message:'.red, error);
    testResults.sentMessage = false;
  }
}

// Validate that the message is visible in the UI
async function validateMessageVisible(page, message) {
  try {
    console.log('Checking if message is visible in UI...'.cyan);
    
    // Wait a bit for the message to appear in the UI
    await page.waitForTimeout(2000);
    
    // Look for the message content in the DOM
    const escapedMessage = message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const messageElements = await page.$x(`//div[contains(text(), "${escapedMessage}")]`);
    
    // Alternative approach - also check for the message in a more general way
    const messageText = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('.message-bubble, .chat-bubble, .message'));
      return messages.map(el => el.textContent).join(' ');
    });
    
    testResults.messageVisible = messageElements.length > 0 || messageText.includes(message);
    
    if (testResults.messageVisible) {
      console.log('Message is visible in the UI'.green.bold);
    } else {
      console.log('Message is NOT visible in the UI'.red.bold);
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'chat-ui-test.png' });
      console.log('Screenshot saved as chat-ui-test.png'.yellow);
      
      // Log more details about messages in the DOM
      console.log('Messages found in the DOM:'.yellow);
      const allMessages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.message-bubble, .chat-bubble, .message'))
          .map(el => el.textContent.trim());
      });
      console.log(allMessages);
    }
  } catch (error) {
    console.error('Error validating message visibility:'.red, error);
    testResults.messageVisible = false;
  }
}

// Print a test report
function printTestReport() {
  console.log('\nTEST REPORT'.bold);
  console.log('==========='.bold);
  console.log(`Login Success: ${formatResult(testResults.loginSuccess)}`);
  console.log(`Navigated to Chat: ${formatResult(testResults.navigatedToChat)}`);
  console.log(`Sent Message: ${formatResult(testResults.sentMessage)}`);
  console.log(`Message Visible: ${formatResult(testResults.messageVisible)}`);
  
  const allTestsPassed = Object.values(testResults).every(result => result === true);
  if (allTestsPassed) {
    console.log('\nOVERALL RESULT: '.green.bold + 'PASSED'.green.bold);
  } else {
    console.log('\nOVERALL RESULT: '.red.bold + 'FAILED'.red.bold);
  }
}

// Format test result for display
function formatResult(result) {
  return result ? 'PASS'.green.bold : 'FAIL'.red.bold;
}

// Run the test
runTest().catch(console.error);