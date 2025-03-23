/**
 * Helper functions for Adspirer UI testing
 * Contains reusable test utilities for common operations
 */

const { selectors, timeouts } = require('./config');

/**
 * Helper functions for UI testing
 */
module.exports = {
  /**
   * Login to the application
   * @param {Page} page - Puppeteer page object
   * @param {Object} credentials - User credentials
   */
  async login(page, credentials) {
    await page.waitForSelector(selectors.emailInput);
    await page.type(selectors.emailInput, credentials.email);
    await page.type(selectors.passwordInput, credentials.password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(selectors.loginButton)
    ]);
  },
  
  /**
   * Navigate to specified route
   * @param {Page} page - Puppeteer page object
   * @param {string} route - Route to navigate to
   */
  async navigateTo(page, route) {
    let selector;
    switch (route) {
      case 'dashboard':
        selector = selectors.dashboardLink;
        break;
      case 'chat':
        selector = selectors.chatLink;
        break;
      case 'home':
        selector = selectors.homeLink;
        break;
      default:
        throw new Error(`Unknown route: ${route}`);
    }
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(selector)
    ]);
  },
  
  /**
   * Create a new chat conversation
   * @param {Page} page - Puppeteer page object
   */
  async createNewConversation(page) {
    await page.waitForSelector(selectors.newConversationButton);
    await page.click(selectors.newConversationButton);
    await page.waitForTimeout(timeouts.short);
  },
  
  /**
   * Send a message in chat and wait for response
   * @param {Page} page - Puppeteer page object
   * @param {string} message - Message to send
   * @returns {boolean} Whether an AI response was received
   */
  async sendMessageAndWaitForResponse(page, message) {
    await page.waitForSelector(selectors.chatInput);
    await page.type(selectors.chatInput, message);
    
    await page.click(selectors.sendButton);
    
    try {
      // Wait for AI response with timeout
      await page.waitForSelector(selectors.aiResponse, { 
        timeout: timeouts.long 
      });
      
      // Wait a bit more for streaming to complete
      await page.waitForTimeout(timeouts.medium);
      
      // Check if we got a non-empty response
      const responseText = await page.$eval(selectors.aiResponse, el => el.textContent);
      return responseText.length > 0 && responseText !== '...';
    } catch (error) {
      console.error('Error waiting for AI response:', error);
      return false;
    }
  },
  
  /**
   * Logout from the application
   * @param {Page} page - Puppeteer page object
   */
  async logout(page) {
    // Look for user menu if it exists
    const hasUserMenu = await page.$(selectors.userMenu) !== null;
    
    if (hasUserMenu) {
      await page.click(selectors.userMenu);
      await page.waitForTimeout(timeouts.short); // Wait for menu to open
    }
    
    // Find and click logout button
    await page.waitForSelector(selectors.logoutButton);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
      page.click(selectors.logoutButton)
    ]);
  },
  
  /**
   * Wait for a specific element with timeout
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - Element selector
   * @param {number} timeout - Wait timeout in ms
   */
  async waitForElement(page, selector, timeout = timeouts.medium) {
    await page.waitForSelector(selector, { visible: true, timeout });
  },
  
  /**
   * Check if element exists on page
   * @param {Page} page - Puppeteer page object
   * @param {string} selector - Element selector
   * @returns {boolean} Whether element exists
   */
  async elementExists(page, selector) {
    return await page.$(selector) !== null;
  },
  
  /**
   * Take a screenshot (useful for debugging)
   * @param {Page} page - Puppeteer page object 
   * @param {string} name - Screenshot name
   */
  async takeScreenshot(page, name) {
    await page.screenshot({ 
      path: `./screenshots/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  },
  
  /**
   * Test campaign data visualization components
   * @param {Page} page - Puppeteer page object
   * @returns {boolean} Whether visualization components are present
   */
  async checkDataVisualization(page) {
    // Look for data visualization components
    const hasCharts = await page.evaluate(() => {
      const charts = document.querySelectorAll('svg, canvas, [data-testid*="chart"], [data-testid*="metric"]');
      return charts.length > 0;
    });
    
    // Look for campaign data
    const hasCampaignData = await page.evaluate(() => {
      const dataElements = document.querySelectorAll('[data-testid*="campaign"], [class*="campaign"]');
      return dataElements.length > 0;
    });
    
    return hasCharts || hasCampaignData;
  },
  
  /**
   * Test AI data responses
   * @param {Page} page - Puppeteer page object
   * @param {Array<string>} dataKeywords - Keywords expected in response
   * @returns {boolean} Whether response contains expected data keywords
   */
  async verifyAIDataResponse(page, dataKeywords = ['campaign', 'performance', 'metrics']) {
    const responseContent = await page.$eval(selectors.aiResponse, el => el.textContent);
    
    return dataKeywords.some(keyword => 
      responseContent.toLowerCase().includes(keyword.toLowerCase())
    );
  }
};