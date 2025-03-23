/**
 * Test configuration for Adspirer UI testing
 * Contains URL, credentials, selectors, and timing configurations
 */

module.exports = {
  baseUrl: 'http://localhost:5000', // Change to your app URL
  testUser: {
    email: 'test@example.com', // Replace with a valid test user email
    password: 'password123'    // Replace with a valid test user password
  },
  selectors: {
    // Login page
    emailInput: 'input[name="email"]',
    passwordInput: 'input[name="password"]',
    loginButton: 'button[type="submit"]',
    
    // Navigation
    dashboardLink: 'a[href="/dashboard"]',
    chatLink: 'a[href="/chat"]',
    homeLink: 'a[href="/"]',
    
    // Chat page
    newConversationButton: 'button[aria-label="New Chat"]',
    chatInput: 'textarea[placeholder="Send a message..."]',
    sendButton: 'button[aria-label="Send message"]',
    messageContainer: '.overflow-y-auto',
    aiResponse: '[role="assistant"]',
    chatMessage: '.chat-message',
    
    // Dashboard elements
    dashboardMetrics: '[data-testid="dashboard-metrics"]',
    campaignCards: '[data-testid="campaign-card"]',
    
    // Logout (assuming a user menu)
    userMenu: 'button[aria-label="User menu"]',
    logoutButton: 'button[aria-label="Logout"]'
  },
  timeouts: {
    short: 2000,
    medium: 5000,
    long: 10000,
    extraLong: 15000 // For data-heavy operations
  }
};