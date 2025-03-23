/**
 * Test for SQL Builder LLM Feature
 * This test specifically checks the data querying functionality
 */

// Test credentials
const TEST_EMAIL = 'abhilashreddi@gmail.com';
const TEST_PASSWORD = 'T1l1icron!';

// Selectors 
const SELECTORS = {
  // Auth related selectors
  loginEmailInput: 'input[name="email"]',
  loginPasswordInput: 'input[name="password"]',
  loginButton: 'button[type="submit"]',
  
  // Chat related selectors
  chatLink: 'a[href="/chat"]',
  newChatButton: 'button[aria-label="New Chat"]',
  chatInput: 'textarea[placeholder="Send a message..."]',
  sendButton: 'button[aria-label="Send message"]',
  chatMessage: '.chat-message',
  assistantMessage: '.chat-message.assistant',
};

// Wait times 
const SHORT_WAIT = 1000;
const MEDIUM_WAIT = 3000;
const LONG_WAIT = 8000; // Longer wait for data query processing

// Helper functions
const waitForElement = async (page, selector, timeout = 5000) => {
  await page.waitForSelector(selector, { visible: true, timeout });
};

const randomString = () => Math.random().toString(36).substring(2, 10);

// Data query test messages
const DATA_QUERIES = [
  "How are my Amazon campaigns performing?",
  "Show me the metrics for my Google ads",
  "What's my best performing campaign?",
  "How many clicks did my campaigns get last week?",
  "What is my average ACOS for Amazon campaigns?"
];

describe('SQL Builder LLM Feature Tests', () => {
  // Set longer default timeout for data queries
  jest.setTimeout(60000);
  
  beforeAll(async () => {
    // Navigate to the app
    await page.goto('http://localhost:5000');
    await page.setViewport({ width: 1280, height: 800 });
    
    // Login first
    await page.goto('http://localhost:5000/auth');
    await waitForElement(page, SELECTORS.loginEmailInput);
    await page.type(SELECTORS.loginEmailInput, TEST_EMAIL);
    await page.type(SELECTORS.loginPasswordInput, TEST_PASSWORD);
    
    // Submit form and wait for navigation
    await Promise.all([
      page.click(SELECTORS.loginButton),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Navigate to chat
    await waitForElement(page, SELECTORS.chatLink);
    await page.click(SELECTORS.chatLink);
  });
  
  describe('Data Query Processing', () => {
    beforeEach(async () => {
      // Create a new chat for each test
      await waitForElement(page, SELECTORS.newChatButton);
      await page.click(SELECTORS.newChatButton);
      await page.waitForTimeout(MEDIUM_WAIT);
      
      // Wait for welcome message
      await waitForElement(page, SELECTORS.assistantMessage);
    });
    
    test('Should process a data query about Amazon campaigns', async () => {
      // Type a data query
      const query = DATA_QUERIES[0];
      await waitForElement(page, SELECTORS.chatInput);
      await page.type(SELECTORS.chatInput, query);
      
      // Send the message
      await page.click(SELECTORS.sendButton);
      
      // Wait for SQL Builder to process and respond
      await page.waitForTimeout(LONG_WAIT);
      
      // Get all messages
      const messages = await page.$$(SELECTORS.assistantMessage);
      expect(messages.length).toBeGreaterThan(1);
      
      // The most recent message should contain data-related content
      // Get text of the latest message
      const latestMessageContent = await page.evaluate(el => el.textContent, messages[messages.length - 1]);
      console.log("Response to data query:", latestMessageContent);
      
      // Check for data-related keywords in the response
      const dataRelatedTerms = ['campaign', 'data', 'performance', 'metrics'];
      const containsDataTerms = dataRelatedTerms.some(term => 
        latestMessageContent.toLowerCase().includes(term));
      
      expect(containsDataTerms).toBe(true);
    });
    
    test('Should handle a complex data query', async () => {
      // Type a more complex data query
      const query = DATA_QUERIES[3]; // "How many clicks did my campaigns get last week?"
      await waitForElement(page, SELECTORS.chatInput);
      await page.type(SELECTORS.chatInput, query);
      
      // Send the message
      await page.click(SELECTORS.sendButton);
      
      // Wait for SQL Builder to process and respond
      await page.waitForTimeout(LONG_WAIT);
      
      // Get all messages
      const messages = await page.$$(SELECTORS.assistantMessage);
      expect(messages.length).toBeGreaterThan(1);
      
      // Check the response
      const latestMessageContent = await page.evaluate(el => el.textContent, messages[messages.length - 1]);
      console.log("Response to complex query:", latestMessageContent);
      
      // Should contain either data results or a message about no data
      const validResponseTerms = ['click', 'data', 'campaign', 'last week', 'result', 'found'];
      const isValidResponse = validResponseTerms.some(term => 
        latestMessageContent.toLowerCase().includes(term));
      
      expect(isValidResponse).toBe(true);
    });
    
    // Check that the SQL Builder returns an appropriate no-data message when applicable
    test('Should handle queries for data that might not exist', async () => {
      // Use a very specific query that might not have data
      const query = "Show me campaign metrics from January 1st 2022";
      await waitForElement(page, SELECTORS.chatInput);
      await page.type(SELECTORS.chatInput, query);
      
      // Send the message
      await page.click(SELECTORS.sendButton);
      
      // Wait for SQL Builder to process and respond
      await page.waitForTimeout(LONG_WAIT);
      
      // Get all messages
      const messages = await page.$$(SELECTORS.assistantMessage);
      
      // Check the response - should either contain data or a message about no data
      const latestMessageContent = await page.evaluate(el => el.textContent, messages[messages.length - 1]);
      console.log("Response to no-data query:", latestMessageContent);
      
      // Should not contain error messages
      expect(latestMessageContent).not.toContain("error");
      expect(latestMessageContent).not.toContain("Error");
      
      // Should be a complete, helpful response
      expect(latestMessageContent.length).toBeGreaterThan(20);
    });
  });
});