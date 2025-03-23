/**
 * E2E Tests for Adspirer application
 * Tests the main functionality including login, chat features, and navigation
 */

// Test credentials - should be environment variables in production
const TEST_EMAIL = 'abhilashreddi@gmail.com';
const TEST_PASSWORD = 'T1l1icron!';

// Selectors for important UI elements
const SELECTORS = {
  // Auth related selectors
  loginEmailInput: 'input[name="email"]',
  loginPasswordInput: 'input[name="password"]',
  loginButton: 'button[type="submit"]',
  logoutButton: 'button[aria-label="Logout"]',
  
  // Navigation
  dashboardLink: 'a[href="/dashboard"]',
  chatLink: 'a[href="/chat"]',
  
  // Chat related selectors
  newChatButton: 'button[aria-label="New Chat"]',
  chatInput: 'textarea[placeholder="Send a message..."]',
  sendButton: 'button[aria-label="Send message"]',
  chatMessage: '.chat-message',
  assistantMessage: '.chat-message.assistant',
  deleteConversationButton: 'button[aria-label="Delete conversation"]',
  confirmDeleteButton: 'button[data-action="confirm-delete"]',
  conversationList: '[data-testid="conversation-list"]',
  conversationItem: '[data-testid="conversation-item"]',
};

// Wait times 
const SHORT_WAIT = 1000;
const MEDIUM_WAIT = 3000;
const LONG_WAIT = 5000;

// Helper functions
const waitForElement = async (page, selector, timeout = 5000) => {
  await page.waitForSelector(selector, { visible: true, timeout });
};

const randomString = () => Math.random().toString(36).substring(2, 10);

describe('Adspirer Application E2E Tests', () => {
  // Set default navigation timeout
  jest.setTimeout(30000);
  
  beforeAll(async () => {
    // Navigate to the app
    await page.goto('http://localhost:5000');
    await page.setViewport({ width: 1280, height: 800 });
  });
  
  describe('Authentication', () => {
    test('Should login successfully', async () => {
      // Check if already logged in by looking for logout button
      const isLoggedIn = await page.$(SELECTORS.logoutButton) !== null;
      
      // If already logged in, logout first
      if (isLoggedIn) {
        await page.click(SELECTORS.logoutButton);
        await page.waitForNavigation();
      }
      
      // Navigate to login page if not already there
      const currentUrl = page.url();
      if (!currentUrl.includes('/login') && !currentUrl.includes('/auth')) {
        // Find the login link and navigate
        await page.goto('http://localhost:5000/auth');
      }
      
      // Fill in login form
      await waitForElement(page, SELECTORS.loginEmailInput);
      await page.type(SELECTORS.loginEmailInput, TEST_EMAIL);
      await page.type(SELECTORS.loginPasswordInput, TEST_PASSWORD);
      
      // Submit form and wait for navigation
      await Promise.all([
        page.click(SELECTORS.loginButton),
        page.waitForNavigation({ waitUntil: 'networkidle0' })
      ]);
      
      // Verify login success - should be redirected to dashboard or home
      const url = page.url();
      expect(url).toMatch(/(dashboard|home|chat)/);
    });
  });
  
  describe('Chat Functionality', () => {
    test('Should navigate to chat page', async () => {
      // Navigate to chat page
      await page.click(SELECTORS.chatLink);
      
      // Verify navigation was successful
      const url = page.url();
      expect(url).toContain('/chat');
    });
    
    test('Should create a new chat conversation', async () => {
      // Wait for the page to load
      await waitForElement(page, SELECTORS.newChatButton);
      
      // Click on new chat button
      await page.click(SELECTORS.newChatButton);
      await page.waitForTimeout(MEDIUM_WAIT); // Wait for conversation to be created
      
      // Verify new chat is created - check for welcome message
      await waitForElement(page, SELECTORS.assistantMessage);
      const messages = await page.$$(SELECTORS.assistantMessage);
      expect(messages.length).toBeGreaterThan(0);
    });
    
    test('Should send a message and receive a response', async () => {
      // Wait for the chat input to be visible
      await waitForElement(page, SELECTORS.chatInput);
      
      // Type a test message
      const testMessage = `Test message ${randomString()}`;
      await page.type(SELECTORS.chatInput, testMessage);
      
      // Send the message
      await page.click(SELECTORS.sendButton);
      
      // Wait for the assistant to respond
      await page.waitForTimeout(LONG_WAIT);
      
      // Verify the response was received
      const messages = await page.$$(SELECTORS.assistantMessage);
      expect(messages.length).toBeGreaterThan(1); // Should have welcome message + new response
    });
    
    test('Should display existing chat conversations', async () => {
      // Verify conversation list exists
      await waitForElement(page, SELECTORS.conversationList);
      
      // Check that at least one conversation exists
      const conversations = await page.$$(SELECTORS.conversationItem);
      expect(conversations.length).toBeGreaterThan(0);
      
      // Click on the first conversation
      if (conversations.length > 1) {
        await conversations[1].click();
        await page.waitForTimeout(MEDIUM_WAIT);
        
        // Verify message history is loaded
        const messages = await page.$$(SELECTORS.chatMessage);
        expect(messages.length).toBeGreaterThan(0);
      }
    });
    
    test('Should delete a chat conversation', async () => {
      // Create a new conversation to delete
      await page.click(SELECTORS.newChatButton);
      await page.waitForTimeout(MEDIUM_WAIT);
      
      // Get the current number of conversations
      const beforeCount = (await page.$$(SELECTORS.conversationItem)).length;
      
      // Find and click the delete button
      await waitForElement(page, SELECTORS.deleteConversationButton);
      await page.click(SELECTORS.deleteConversationButton);
      
      // Confirm deletion
      await waitForElement(page, SELECTORS.confirmDeleteButton);
      await page.click(SELECTORS.confirmDeleteButton);
      
      // Wait for deletion to process
      await page.waitForTimeout(MEDIUM_WAIT);
      
      // Verify the conversation was deleted
      const afterCount = (await page.$$(SELECTORS.conversationItem)).length;
      expect(afterCount).toBeLessThan(beforeCount);
    });
  });
  
  describe('Navigation', () => {
    test('Should navigate to dashboard', async () => {
      // Navigate to dashboard
      await page.click(SELECTORS.dashboardLink);
      
      // Verify navigation
      const url = page.url();
      expect(url).toContain('/dashboard');
    });
    
    test('Should logout successfully', async () => {
      // Find and click logout button
      await waitForElement(page, SELECTORS.logoutButton);
      await page.click(SELECTORS.logoutButton);
      
      // Wait for redirection to login page
      await page.waitForNavigation();
      
      // Verify logout by checking for login form
      const url = page.url();
      expect(url).toMatch(/(login|auth)/);
      
      // Check for login form elements
      const emailInput = await page.$(SELECTORS.loginEmailInput);
      expect(emailInput).not.toBeNull();
    });
  });
});