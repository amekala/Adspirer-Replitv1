/**
 * Amazon Advertising API Service
 * 
 * Handles all interactions with the Amazon Ads API, including authentication,
 * campaign creation, ad group creation, and other advertising operations.
 */

import { storage } from "../storage";

/**
 * Amazon Ads API Service class
 */
export class AmazonAdsService {
  /**
   * Gets or refreshes a valid access token for the user
   */
  async getValidToken(userId: string): Promise<string> {
    try {
      console.log(`Getting Amazon token for user: ${userId}`);
      let token = await storage.getAmazonToken(userId);
      
      if (!token) {
        console.log(`No token found for user ${userId}`);
        throw new Error("You need to connect your Amazon Advertising account first. Please set up your API credentials in the settings.");
      }
      
      // Check if token is expired or will expire soon (within 5 minutes)
      const isExpired = new Date(token.expiresAt) < new Date(Date.now() + 5 * 60 * 1000);
      
      if (isExpired && token?.refreshToken) {
        console.log(`Token expired for user ${userId}, attempting to refresh`);
        // Refresh the token
        const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
        const clientSecret = process.env.VITE_AMAZON_CLIENT_SECRET || process.env.AMAZON_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
          console.error("Missing Amazon API client credentials in environment");
          throw new Error("Application is missing Amazon API credentials. Please contact support.");
        }
        
        const response = await fetch("https://api.amazon.com/auth/o2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: token.refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
          }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to refresh token: ${errorText}`);
          throw new Error(`Failed to refresh your Amazon token. Please reconnect your account in settings.`);
        }
        
        const { access_token, refresh_token, expires_in } = await response.json();
        
        // Save the new token
        token = await storage.saveAmazonToken({
          userId,
          accessToken: access_token,
          refreshToken: refresh_token || token.refreshToken,
          tokenScope: "advertising::campaign_management",
          expiresAt: new Date(Date.now() + expires_in * 1000),
          lastRefreshed: new Date(),
          isActive: true,
        });
        console.log(`Token refreshed successfully for user ${userId}`);
      }
      
      if (!token || !token.accessToken) {
        console.error(`No valid token available for user ${userId}`);
        throw new Error("You need to connect your Amazon Advertising account. Please check your API credentials in settings.");
      }
      
      return token.accessToken;
    } catch (error) {
      console.error(`Error in getValidToken: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Get the first advertiser account for a user (helper method)
   */
  private async getFirstAdvertiserAccount(userId: string): Promise<any> {
    try {
      console.log(`Getting advertiser accounts for user: ${userId}`);
      const accounts = await storage.getAdvertiserAccounts(userId);
      
      if (!accounts || accounts.length === 0) {
        console.error(`No advertiser accounts found for user ${userId}`);
        throw new Error("No Amazon Advertising accounts found. Please make sure your account is properly connected in settings.");
      }
      
      console.log(`Found ${accounts.length} advertiser accounts for user ${userId}`);
      return accounts[0];
    } catch (error) {
      console.error(`Error in getFirstAdvertiserAccount: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Creates a Sponsored Products campaign
   */
  async createSpCampaign(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials and identifiers
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare dates in the correct format - always ensure they're strings
      const startDate = params.startDate ? params.startDate.toString() : new Date().toISOString().split('T')[0];
      let endDate = params.endDate ? params.endDate.toString() : null;
      
      // Format campaign payload for API V3
      const campaignPayload = {
        campaigns: [
          {
            name: params.name,
            campaignType: "sponsoredProducts",
            targetingType: params.targetingType || "MANUAL", // Ensure uppercase
            state: params.state || "PAUSED", // Ensure uppercase
            budget: {
              budgetType: "DAILY",
              budget: Number(params.dailyBudget)
            },
            startDate,
            ...(endDate && { endDate })
          }
        ]
      };
      
      // Make API call to create campaign
      const response = await fetch("https://advertising-api.amazon.com/sp/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.spCampaign.v3+json",
          "Accept": "application/vnd.spCampaign.v3+json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(campaignPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.campaigns?.success?.length > 0) {
        const campaignId = responseData.campaigns.success[0].campaignId;
        
        // Store campaign in database
        await storage.createCampaign({
          userId,
          profileId: advertiserAccount.profileId,
          campaignId,
          name: params.name,
          campaignType: "sponsoredProducts",
          targetingType: params.targetingType?.toUpperCase() || "MANUAL",
          dailyBudget: Number(params.dailyBudget),
          startDate: startDate,
          endDate: endDate,
          state: params.state?.toUpperCase() || "PAUSED",
          bidding: params.biddingStrategy ? { strategy: params.biddingStrategy } : undefined
        });
        
        // Return success response
        return {
          success: true,
          campaignId,
          name: params.name,
          message: `Campaign "${params.name}" created successfully with ID ${campaignId}`
        };
      } else {
        // Handle error response
        const errorDetails = responseData.campaigns?.error?.[0]?.errors || 
                            responseData.message || 
                            "Unknown error";
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create campaign: ${JSON.stringify(errorDetails)}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates an ad group within a campaign
   */
  async createAdGroup(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials and identifiers
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Format ad group payload for API V3
      const adGroupPayload = {
        adGroups: [
          {
            name: params.name,
            campaignId: params.campaignId,
            defaultBid: Number(params.defaultBid),
            state: params.state || "PAUSED" // Ensure uppercase
          }
        ]
      };
      
      // Make API call to create ad group
      const response = await fetch("https://advertising-api.amazon.com/sp/adGroups", {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.spAdGroup.v3+json",
          "Accept": "application/vnd.spAdGroup.v3+json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(adGroupPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.adGroups?.success?.length > 0) {
        const adGroupId = responseData.adGroups.success[0].adGroupId;
        
        // Store ad group in database
        await storage.createAdGroup({
          userId,
          campaignId: params.campaignId,
          profileId: advertiserAccount.profileId,
          adGroupId,
          name: params.name,
          defaultBid: Number(params.defaultBid),
          state: params.state?.toUpperCase() || "PAUSED"
        });
        
        // Return success response
        return {
          success: true,
          adGroupId,
          campaignId: params.campaignId,
          name: params.name,
          message: `Ad group "${params.name}" created successfully with ID ${adGroupId}`
        };
      } else {
        // Handle error response
        const errorDetails = responseData.adGroups?.error?.[0]?.errors || 
                            responseData.message || 
                            "Unknown error";
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create ad group: ${JSON.stringify(errorDetails)}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating ad group: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates product ads within an ad group
   */
  async createProductAds(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare product ads - could be ASINs or SKUs
      const productAds = [];
      if (params.asins && Array.isArray(params.asins)) {
        for (const asin of params.asins) {
          productAds.push({
            campaignId: params.campaignId,
            adGroupId: params.adGroupId,
            asin,
            state: params.state || "PAUSED"
          });
        }
      } else if (params.skus && Array.isArray(params.skus)) {
        for (const sku of params.skus) {
          productAds.push({
            campaignId: params.campaignId,
            adGroupId: params.adGroupId,
            sku,
            state: params.state || "PAUSED"
          });
        }
      }
      
      // Format product ads payload for API
      const payload = {
        productAds: productAds
      };
      
      // Make API call to create product ads
      const response = await fetch("https://advertising-api.amazon.com/sp/productAds", {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.spProductAd.v3+json",
          "Accept": "application/vnd.spProductAd.v3+json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Process results and save to database
      const createdAds = [];
      const errors = [];
      
      if (responseData.productAds?.success?.length > 0) {
        for (const successItem of responseData.productAds.success) {
          // Store product ad in database
          const productAdData = productAds[successItem.index];
          await storage.createProductAd({
            userId,
            adGroupId: params.adGroupId,
            ...(productAdData.asin ? { asin: productAdData.asin } : { sku: productAdData.sku }),
            state: productAdData.state
          });
          
          createdAds.push({
            productAdId: successItem.productAdId,
            ...(productAdData.asin ? { asin: productAdData.asin } : { sku: productAdData.sku })
          });
        }
      }
      
      if (responseData.productAds?.error?.length > 0) {
        for (const errorItem of responseData.productAds.error) {
          errors.push({
            index: errorItem.index,
            errors: errorItem.errors,
            ...(productAds[errorItem.index]?.asin 
                ? { asin: productAds[errorItem.index].asin } 
                : { sku: productAds[errorItem.index].sku })
          });
        }
      }
      
      // Return results
      return {
        success: createdAds.length > 0,
        createdAds,
        errors,
        message: createdAds.length > 0 
                ? `Created ${createdAds.length} product ads successfully` 
                : `Failed to create product ads: ${errors.length} errors`
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating product ads: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates keywords for an ad group
   */
  async createKeywords(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare keywords array
      const keywords = params.keywords.map((keywordText: string) => ({
        campaignId: params.campaignId,
        adGroupId: params.adGroupId,
        keywordText,
        matchType: params.matchType || "phrase",
        bid: params.bid || params.defaultBid || 1.0,
        state: params.state || "PAUSED"
      }));
      
      // Format keywords payload for API
      const payload = {
        keywords: keywords
      };
      
      // Make API call to create keywords
      const response = await fetch("https://advertising-api.amazon.com/sp/keywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.spKeyword.v3+json",
          "Accept": "application/vnd.spKeyword.v3+json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Process results and save to database
      const createdKeywords = [];
      const errors = [];
      
      if (responseData.keywords?.success?.length > 0) {
        for (const successItem of responseData.keywords.success) {
          // Store keyword in database
          const keywordData = keywords[successItem.index];
          await storage.createKeyword({
            userId,
            adGroupId: params.adGroupId,
            keywordText: keywordData.keywordText,
            matchType: keywordData.matchType,
            bid: Number(keywordData.bid), // Convert to number for storage
            state: keywordData.state
          });
          
          createdKeywords.push({
            keywordId: successItem.keywordId,
            keywordText: keywordData.keywordText,
            matchType: keywordData.matchType
          });
        }
      }
      
      if (responseData.keywords?.error?.length > 0) {
        for (const errorItem of responseData.keywords.error) {
          errors.push({
            index: errorItem.index,
            errors: errorItem.errors,
            keywordText: keywords[errorItem.index].keywordText
          });
        }
      }
      
      // Return results
      return {
        success: createdKeywords.length > 0,
        createdKeywords,
        errors,
        message: createdKeywords.length > 0 
                ? `Created ${createdKeywords.length} keywords successfully` 
                : `Failed to create keywords: ${errors.length} errors`
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating keywords: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates negative keywords for an ad group
   */
  async createNegativeKeywords(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare negative keywords array
      const negativeKeywords = params.negativeKeywords.map((keywordText: string) => ({
        campaignId: params.campaignId,
        adGroupId: params.adGroupId,
        keywordText,
        matchType: "negativePhrase", // Usually negative phrase for Amazon
        state: "ENABLED"
      }));
      
      // Format negative keywords payload for API
      const payload = {
        negativeKeywords: negativeKeywords
      };
      
      // Make API call to create negative keywords
      const response = await fetch("https://advertising-api.amazon.com/sp/negativeKeywords", {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.spNegativeKeyword.v3+json",
          "Accept": "application/vnd.spNegativeKeyword.v3+json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Process results and save to database
      const createdNegKeywords = [];
      const errors = [];
      
      if (responseData.negativeKeywords?.success?.length > 0) {
        for (const successItem of responseData.negativeKeywords.success) {
          // Store negative keyword in database
          const keywordData = negativeKeywords[successItem.index];
          await storage.createNegativeKeyword({
            userId,
            adGroupId: params.adGroupId,
            keywordText: keywordData.keywordText,
            matchType: keywordData.matchType,
            state: keywordData.state
          });
          
          createdNegKeywords.push({
            negativeKeywordId: successItem.negativeKeywordId,
            keywordText: keywordData.keywordText
          });
        }
      }
      
      if (responseData.negativeKeywords?.error?.length > 0) {
        for (const errorItem of responseData.negativeKeywords.error) {
          errors.push({
            index: errorItem.index,
            errors: errorItem.errors,
            keywordText: negativeKeywords[errorItem.index].keywordText
          });
        }
      }
      
      // Return results
      return {
        success: createdNegKeywords.length > 0,
        createdNegKeywords,
        errors,
        message: createdNegKeywords.length > 0 
                ? `Created ${createdNegKeywords.length} negative keywords successfully` 
                : `Failed to create negative keywords: ${errors.length} errors`
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating negative keywords: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates a Sponsored Video campaign
   */
  async createSvCampaign(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials and identifiers
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare dates in the correct format
      const startDate = params.startDate ? params.startDate.toString() : new Date().toISOString().split('T')[0];
      let endDate = params.endDate ? params.endDate.toString() : null;
      
      // Format campaign payload for API
      const campaignPayload = {
        campaigns: [
          {
            name: params.name,
            campaignType: "sponsoredBrands", // This is for Sponsored Video
            targetingType: params.targetingType || "MANUAL",
            state: params.state || "PAUSED",
            budget: {
              budgetType: "DAILY",
              budget: Number(params.dailyBudget)
            },
            startDate,
            ...(endDate && { endDate })
          }
        ]
      };
      
      // Make API call to create campaign
      const response = await fetch("https://advertising-api.amazon.com/sb/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(campaignPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.campaigns?.success?.length > 0) {
        const campaignId = responseData.campaigns.success[0].campaignId;
        
        // Store campaign in database
        await storage.createCampaign({
          userId,
          profileId: advertiserAccount.profileId,
          campaignId,
          name: params.name,
          campaignType: "sponsoredBrands",
          targetingType: params.targetingType?.toUpperCase() || "MANUAL",
          dailyBudget: Number(params.dailyBudget),
          startDate: startDate,
          endDate: endDate,
          state: params.state?.toUpperCase() || "PAUSED"
        });
        
        // Return success response
        return {
          success: true,
          campaignId,
          name: params.name,
          message: `Sponsored Video campaign "${params.name}" created successfully with ID ${campaignId}`
        };
      } else {
        // Handle error response
        const errorDetails = responseData.campaigns?.error?.[0]?.errors || 
                            responseData.message || 
                            "Unknown error";
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create Sponsored Video campaign: ${JSON.stringify(errorDetails)}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating Sponsored Video campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates a Sponsored Display campaign
   */
  async createSdCampaign(userId: string, params: any): Promise<any> {
    try {
      // Get required credentials and identifiers
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Prepare dates in the correct format
      const startDate = params.startDate ? params.startDate.toString() : new Date().toISOString().split('T')[0];
      let endDate = params.endDate ? params.endDate.toString() : null;
      
      // Format campaign payload for API
      const campaignPayload = {
        campaigns: [
          {
            name: params.name,
            campaignType: "sponsoredDisplay",
            targetingType: params.targetingType || "MANUAL",
            state: params.state || "PAUSED",
            budget: {
              budgetType: "DAILY",
              budget: Number(params.dailyBudget)
            },
            startDate,
            ...(endDate && { endDate })
          }
        ]
      };
      
      // Make API call to create campaign
      const response = await fetch("https://advertising-api.amazon.com/sd/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(campaignPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.campaigns?.success?.length > 0) {
        const campaignId = responseData.campaigns.success[0].campaignId;
        
        // Store campaign in database
        await storage.createCampaign({
          userId,
          profileId: advertiserAccount.profileId,
          campaignId,
          name: params.name,
          campaignType: "sponsoredDisplay",
          targetingType: params.targetingType?.toUpperCase() || "MANUAL",
          dailyBudget: Number(params.dailyBudget),
          startDate: startDate,
          endDate: endDate,
          state: params.state?.toUpperCase() || "PAUSED"
        });
        
        // Return success response
        return {
          success: true,
          campaignId,
          name: params.name,
          message: `Sponsored Display campaign "${params.name}" created successfully with ID ${campaignId}`
        };
      } else {
        // Handle error response
        const errorDetails = responseData.campaigns?.error?.[0]?.errors || 
                            responseData.message || 
                            "Unknown error";
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create Sponsored Display campaign: ${JSON.stringify(errorDetails)}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating Sponsored Display campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Deletes an Amazon campaign
   */
  async deleteAmazonCampaign(userId: string, params: { campaignId: string }): Promise<any> {
    try {
      // Get required credentials and identifiers
      const accessToken = await this.getValidToken(userId);
      const advertiserAccount = await this.getFirstAdvertiserAccount(userId);
      const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
      
      // Get campaign type from database to determine API endpoint
      // Since there's no direct lookup by campaignId, we need to get from campaigns by campaignId
      const campaigns = await storage.getCampaigns(userId);
      const campaign = campaigns.find(c => c.campaignId === params.campaignId);
      
      if (!campaign) {
        return {
          success: false,
          error: "Campaign not found",
          message: `Campaign with ID ${params.campaignId} not found`
        };
      }
      
      // Determine API endpoint based on campaign type
      let endpoint = "https://advertising-api.amazon.com/sp/campaigns";
      if (campaign.campaignType === "sponsoredBrands") {
        endpoint = "https://advertising-api.amazon.com/sb/campaigns";
      } else if (campaign.campaignType === "sponsoredDisplay") {
        endpoint = "https://advertising-api.amazon.com/sd/campaigns";
      }
      
      // Make API call to delete campaign
      const response = await fetch(`${endpoint}/${params.campaignId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Amazon-Advertising-API-ClientId": clientId!,
          "Amazon-Advertising-API-Scope": advertiserAccount.profileId,
          "Authorization": `Bearer ${accessToken}`
        }
      });
      
      // Handle response
      if (response.ok) {
        // Since there's no deleteCampaign in storage, update the state to ARCHIVED instead
        await storage.updateCampaignState(campaign.id, "ARCHIVED");
        
        return {
          success: true,
          campaignId: params.campaignId,
          message: `Campaign ${params.campaignId} deleted successfully`
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData,
          message: `Failed to delete campaign: ${JSON.stringify(errorData)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error deleting campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// Create a singleton instance for use throughout the application
export const amazonAdsService = new AmazonAdsService(); 