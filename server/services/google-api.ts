/**
 * Google Ads API Service
 * 
 * Handles all interactions with the Google Ads API, including authentication,
 * campaign creation, ad group creation, and other advertising operations.
 */

import { storage } from "../storage";

/**
 * Google Ads API Service class
 */
export class GoogleAdsService {
  /**
   * Gets or refreshes a valid access token for the user
   */
  async getValidToken(userId: string): Promise<string> {
    let token = await storage.getGoogleToken(userId);
    
    // Check if token is expired or will expire soon (within 5 minutes)
    const isExpired = !token || new Date(token.expiresAt) < new Date(Date.now() + 5 * 60 * 1000);
    
    if (isExpired && token?.refreshToken) {
      // Refresh the token
      const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
      
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: token.refreshToken,
          client_id: clientId!,
          client_secret: clientSecret!,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${await response.text()}`);
      }
      
      const { access_token, refresh_token, expires_in } = await response.json();
      
      // Save the new token
      token = await storage.saveGoogleToken({
        userId,
        accessToken: access_token,
        refreshToken: refresh_token || token.refreshToken,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        lastRefreshed: new Date(),
        isActive: true,
      });
    }
    
    if (!token || !token.accessToken) {
      throw new Error("No valid token available for this user");
    }
    
    return token.accessToken;
  }
  
  /**
   * Gets the first Google Ads customer account for the user
   */
  async getFirstCustomerAccount(userId: string): Promise<any> {
    const accounts = await storage.getGoogleAdvertiserAccounts(userId);
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No Google Ads accounts found for this user");
    }
    
    return accounts[0];
  }
  
  /**
   * Creates a campaign budget for use with campaigns
   */
  async createCampaignBudget(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.name) {
        params.name = `Budget for ${new Date().toISOString().split('T')[0]}`;
      }
      
      if (!params.amountMicros && !params.amount) {
        throw new Error("Budget amount is required");
      }
      
      // Convert dollars to micros if needed
      const amountMicros = params.amountMicros || Math.floor(params.amount * 1000000);
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Prepare budget payload
      const budgetPayload = {
        campaignBudget: {
          name: params.name,
          amountMicros: amountMicros,
          deliveryMethod: params.deliveryMethod || "STANDARD",
          explicitlyShared: params.explicitlyShared || false
        }
      };
      
      // Make API call to create budget
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/campaignBudgets:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(budgetPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const budgetResourceName = responseData.results[0].resourceName;
        
        // Return success response
        return {
          success: true,
          budgetResourceName,
          name: params.name,
          amount: params.amount || (params.amountMicros / 1000000),
          message: `Budget "${params.name}" created successfully`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create budget: ${errorMessage}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating budget: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates a Google Ads campaign
   */
  async createCampaign(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.name) {
        throw new Error("Campaign name is required");
      }
      
      if (!params.budgetResourceName && !params.dailyBudget) {
        throw new Error("Either budgetResourceName or dailyBudget is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Create a budget first if dailyBudget is provided but not budgetResourceName
      let budgetResourceName = params.budgetResourceName;
      if (!budgetResourceName && params.dailyBudget) {
        const budgetResult = await this.createCampaignBudget(userId, {
          name: `Budget for ${params.name}`,
          amount: params.dailyBudget,
          deliveryMethod: "STANDARD",
          explicitlyShared: false
        }, customerId);
        
        if (!budgetResult.success) {
          return {
            success: false,
            error: budgetResult.error,
            message: `Failed to create budget for campaign: ${budgetResult.message}`
          };
        }
        
        budgetResourceName = budgetResult.budgetResourceName;
      }
      
      // Format dates
      const now = new Date();
      const startDate = params.startDate || 
                        new Date(now.setDate(now.getDate() + 1)).toISOString().split('T')[0].replace(/-/g, '');
      const endDate = params.endDate ? params.endDate.replace(/-/g, '') : undefined;
      
      // Prepare bidding strategy based on params
      let biddingConfig = {};
      if (params.bidding?.strategy) {
        switch(params.bidding.strategy) {
          case "targetCpa":
            if (!params.bidding.targetCpaMicros && params.bidding.targetCpa) {
              // Convert dollars to micros
              params.bidding.targetCpaMicros = Math.floor(params.bidding.targetCpa * 1000000);
            }
            biddingConfig = {
              targetCpa: {
                targetCpaMicros: params.bidding.targetCpaMicros
              }
            };
            break;
          case "targetRoas":
            biddingConfig = {
              targetRoas: {
                targetRoas: params.bidding.targetRoas
              }
            };
            break;
          case "maximizeConversions":
            biddingConfig = {
              maximizeConversions: params.bidding.config || {}
            };
            break;
          case "maximizeConversionValue":
            biddingConfig = {
              maximizeConversionValue: params.bidding.config || {}
            };
            break;
          case "manualCpc":
          default:
            biddingConfig = {
              manualCpc: {
                enhancedCpcEnabled: params.bidding.enhancedCpcEnabled || false
              }
            };
            break;
        }
      } else {
        // Default to manual CPC
        biddingConfig = { manualCpc: {} };
      }
      
      // Prepare campaign payload
      const campaignPayload = {
        campaign: {
          name: params.name,
          campaignBudget: budgetResourceName,
          advertisingChannelType: params.advertisingChannelType || "SEARCH",
          status: params.status?.toUpperCase() || "PAUSED",
          startDate: startDate,
          ...(endDate && { endDate }),
          // Add bidding strategy
          ...biddingConfig,
          // Add network settings
          networkSettings: {
            targetGoogleSearch: params.targetGoogleSearch !== false,
            targetSearchNetwork: params.targetSearchNetwork !== false,
            targetContentNetwork: params.targetContentNetwork || false,
            targetPartnerSearchNetwork: params.targetPartnerSearchNetwork || false
          }
        }
      };
      
      // Make API call to create campaign
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/campaigns:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(campaignPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const campaignResourceName = responseData.results[0].resourceName;
        const campaignId = campaignResourceName.split('/').pop();
        
        // Store campaign in database
        await storage.createCampaign({
          userId,
          profileId: customerAccount.customerId,
          campaignId,
          name: params.name,
          campaignType: params.advertisingChannelType || "SEARCH",
          targetingType: "manual",
          dailyBudget: params.dailyBudget,
          startDate: params.startDate || new Date().toISOString().split('T')[0],
          endDate: params.endDate || null,
          state: params.status?.toUpperCase() || "PAUSED"
        });
        
        // Return success response
        return {
          success: true,
          campaignId,
          campaignResourceName,
          name: params.name,
          message: `Campaign "${params.name}" created successfully with ID ${campaignId}`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create campaign: ${errorMessage}`
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
  async createAdGroup(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.name) {
        throw new Error("Ad group name is required");
      }
      
      if (!params.campaignResourceName && !params.campaignId) {
        throw new Error("Either campaignResourceName or campaignId is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build campaign resource name if only ID is provided
      let campaignResourceName = params.campaignResourceName;
      if (!campaignResourceName && params.campaignId) {
        campaignResourceName = `customers/${customerAccount.customerId}/campaigns/${params.campaignId}`;
      }
      
      // Convert bid to micros if needed
      const cpcBidMicros = params.cpcBidMicros || (params.defaultBid ? Math.floor(params.defaultBid * 1000000) : undefined);
      
      // Prepare ad group payload
      const adGroupPayload = {
        adGroup: {
          name: params.name,
          campaign: campaignResourceName,
          type: params.type || "SEARCH_STANDARD",
          status: params.status?.toUpperCase() || "ENABLED",
          ...(cpcBidMicros && { cpcBidMicros })
        }
      };
      
      // Make API call to create ad group
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/adGroups:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(adGroupPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const adGroupResourceName = responseData.results[0].resourceName;
        const adGroupId = adGroupResourceName.split('/').pop();
        
        // Store ad group in database
        await storage.createAdGroup({
          userId,
          profileId: customerAccount.customerId,
          campaignId: params.campaignId,
          adGroupId,
          name: params.name,
          state: params.status === "ENABLED" ? "enabled" : "paused",
          defaultBid: params.defaultBid || (cpcBidMicros ? cpcBidMicros / 1000000 : 0)
        });
        
        // Return success response
        return {
          success: true,
          adGroupId,
          adGroupResourceName,
          name: params.name,
          message: `Ad group "${params.name}" created successfully with ID ${adGroupId}`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create ad group: ${errorMessage}`
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
   * Creates keywords for an ad group
   */
  async createKeywords(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.adGroupResourceName && !params.adGroupId) {
        throw new Error("Either adGroupResourceName or adGroupId is required");
      }
      
      if (!params.keywords || !Array.isArray(params.keywords) || params.keywords.length === 0) {
        throw new Error("Keywords array is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build ad group resource name if only ID is provided
      let adGroupResourceName = params.adGroupResourceName;
      if (!adGroupResourceName && params.adGroupId) {
        adGroupResourceName = `customers/${customerAccount.customerId}/adGroups/${params.adGroupId}`;
      }
      
      // Map match types to Google format
      const matchTypeMap: {[key: string]: string} = {
        "exact": "EXACT",
        "phrase": "PHRASE",
        "broad": "BROAD"
      };
      
      // Prepare keyword operations
      const operations = params.keywords.map((keyword: any) => {
        // Handle different keyword formats
        let keywordText, matchType, bidMicros;
        
        if (typeof keyword === 'string') {
          keywordText = keyword;
          matchType = "EXACT"; // Default
        } else {
          keywordText = keyword.keywordText || keyword.text;
          matchType = keyword.matchType ? 
                      (matchTypeMap[keyword.matchType.toLowerCase()] || keyword.matchType) : 
                      "EXACT";
          bidMicros = keyword.bidMicros || (keyword.bid ? Math.floor(keyword.bid * 1000000) : undefined);
        }
        
        return {
          create: {
            adGroup: adGroupResourceName,
            text: keywordText,
            matchType: matchType,
            status: params.status?.toUpperCase() || keyword.status?.toUpperCase() || "ENABLED",
            ...(bidMicros && { cpcBidMicros: bidMicros })
          }
        };
      });
      
      // Prepare keywords payload
      const keywordsPayload = {
        operations: operations
      };
      
      // Make API call to create keywords
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/adGroupCriteria:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(keywordsPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const createdKeywords = responseData.results.map((result: any, index: number) => {
          const keywordResourceName = result.resourceName;
          const keywordId = keywordResourceName.split('/').pop();
          const keywordData = params.keywords[index];
          const keywordText = typeof keywordData === 'string' ? keywordData : keywordData.keywordText || keywordData.text;
          
          // Store keyword in database
          storage.createKeyword({
            userId,
            adGroupId: params.adGroupId,
            keywordId,
            keywordText,
            matchType: typeof keywordData === 'string' ? "EXACT" : 
                       keywordData.matchType ? 
                       (matchTypeMap[keywordData.matchType.toLowerCase()] || keywordData.matchType) : 
                       "EXACT",
            bid: typeof keywordData === 'string' ? undefined : keywordData.bid,
            state: params.status === "ENABLED" ? "enabled" : "paused"
          }).catch(error => console.error("Error storing keyword:", error));
          
          return {
            keywordId,
            keywordResourceName,
            text: keywordText
          };
        });
        
        // Return success response
        return {
          success: true,
          createdKeywords,
          message: `Created ${createdKeywords.length} keywords successfully`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create keywords: ${errorMessage}`
        };
      }
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
  async createNegativeKeywords(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.adGroupResourceName && !params.adGroupId) {
        throw new Error("Either adGroupResourceName or adGroupId is required");
      }
      
      if (!params.keywords || !Array.isArray(params.keywords) || params.keywords.length === 0) {
        throw new Error("Keywords array is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build ad group resource name if only ID is provided
      let adGroupResourceName = params.adGroupResourceName;
      if (!adGroupResourceName && params.adGroupId) {
        adGroupResourceName = `customers/${customerAccount.customerId}/adGroups/${params.adGroupId}`;
      }
      
      // Map match types to Google format
      const matchTypeMap: {[key: string]: string} = {
        "exact": "EXACT",
        "phrase": "PHRASE",
        "broad": "BROAD"
      };
      
      // Prepare negative keyword operations
      const operations = params.keywords.map((keyword: any) => {
        // Handle different keyword formats
        let keywordText, matchType;
        
        if (typeof keyword === 'string') {
          keywordText = keyword;
          matchType = "EXACT"; // Default
        } else {
          keywordText = keyword.keywordText || keyword.text;
          matchType = keyword.matchType ? 
                      (matchTypeMap[keyword.matchType.toLowerCase()] || keyword.matchType) : 
                      "EXACT";
        }
        
        return {
          create: {
            adGroup: adGroupResourceName,
            text: keywordText,
            matchType: matchType,
            negative: true,
            status: "ENABLED"
          }
        };
      });
      
      // Prepare negative keywords payload
      const negativeKeywordsPayload = {
        operations: operations
      };
      
      // Make API call to create negative keywords
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/adGroupCriteria:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(negativeKeywordsPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const createdNegativeKeywords = responseData.results.map((result: any, index: number) => {
          const keywordResourceName = result.resourceName;
          const keywordId = keywordResourceName.split('/').pop();
          const keywordData = params.keywords[index];
          const keywordText = typeof keywordData === 'string' ? keywordData : keywordData.keywordText || keywordData.text;
          
          // Store negative keyword in database
          storage.createNegativeKeyword({
            userId,
            adGroupId: params.adGroupId,
            keywordId,
            keywordText,
            matchType: typeof keywordData === 'string' ? "EXACT" : 
                       keywordData.matchType ? 
                       (matchTypeMap[keywordData.matchType.toLowerCase()] || keywordData.matchType) : 
                       "EXACT",
            state: "enabled"
          }).catch(error => console.error("Error storing negative keyword:", error));
          
          return {
            keywordId,
            keywordResourceName,
            text: keywordText
          };
        });
        
        // Return success response
        return {
          success: true,
          createdNegativeKeywords,
          message: `Created ${createdNegativeKeywords.length} negative keywords successfully`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create negative keywords: ${errorMessage}`
        };
      }
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
   * Deletes a Google Ads campaign
   */
  async deleteGoogleCampaign(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.campaignId && !params.campaignResourceName) {
        throw new Error("Either campaignId or campaignResourceName is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build campaign resource name if only ID is provided
      let campaignResourceName = params.campaignResourceName;
      if (!campaignResourceName && params.campaignId) {
        campaignResourceName = `customers/${customerAccount.customerId}/campaigns/${params.campaignId}`;
      }
      
      // Prepare delete payload
      const deletePayload = {
        operations: [
          {
            remove: campaignResourceName
          }
        ]
      };
      
      // Make API call to delete campaign
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/campaigns:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(deletePayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        // Instead of trying to update or delete from the database, just log the deletion
        // The actual database operations can be implemented later as needed
        if (params.campaignId) {
          console.log(`Campaign ${params.campaignId} deleted via Google Ads API. Database sync recommended.`);
        }
        
        // Return success response
        return {
          success: true,
          message: `Campaign deleted successfully`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to delete campaign: ${errorMessage}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error deleting campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Verifies connection to Google Ads API.
   * 
   * @param userId - The ID of the user whose credentials to verify
   * @returns Promise resolving to a success/error response object
   */
  async verifyApiConnection(userId: string): Promise<any> {
    try {
      // Validate parameters
      if (!userId) throw new Error("User ID is required");
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      const customerAccount = await this.getFirstCustomerAccount(userId);
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Make API call to list campaigns (simple test endpoint)
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/googleAds:search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify({
          query: "SELECT campaign.id, campaign.name FROM campaign LIMIT 5"
        })
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Check if response contains campaigns
      if (responseData.results) {
        // Extract campaign info
        const campaigns = responseData.results.map((result: any) => ({
          campaignId: result.campaign?.id,
          campaignName: result.campaign?.name
        }));
        
        return {
          success: true,
          message: `Successfully connected to Google Ads API. Found ${campaigns.length} campaigns.`,
          campaigns
        };
      } else if (responseData.error) {
        // Handle error response
        return {
          success: false,
          error: responseData.error.code || responseData.error,
          details: responseData.error.message || JSON.stringify(responseData.error),
          message: `Failed to verify Google Ads API connection: ${responseData.error.message || JSON.stringify(responseData.error)}`
        };
      } else {
        // No campaigns found (unusual but not an error)
        return {
          success: true,
          message: "Successfully connected to Google Ads API, but no campaigns were found.",
          campaigns: []
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error verifying Google Ads API connection: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Creates a responsive search ad in an ad group
   */
  async createResponsiveSearchAd(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.adGroupId && !params.adGroupResourceName) {
        throw new Error("Either adGroupId or adGroupResourceName is required");
      }
      
      if (!params.headlines || !Array.isArray(params.headlines) || params.headlines.length < 3) {
        throw new Error("At least 3 headlines are required");
      }
      
      if (!params.descriptions || !Array.isArray(params.descriptions) || params.descriptions.length < 2) {
        throw new Error("At least 2 descriptions are required");
      }
      
      if (!params.finalUrls || !Array.isArray(params.finalUrls) || params.finalUrls.length === 0) {
        throw new Error("At least one final URL is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build ad group resource name if only ID is provided
      let adGroupResourceName = params.adGroupResourceName;
      if (!adGroupResourceName && params.adGroupId) {
        adGroupResourceName = `customers/${customerAccount.customerId}/adGroups/${params.adGroupId}`;
      }
      
      // Format headlines with pinning options
      const headlineAssets = params.headlines.map((headline: any, index: number) => {
        const headlineText = typeof headline === 'string' ? headline : headline.text;
        const pinPosition = typeof headline === 'object' && headline.pinPosition ? headline.pinPosition : null;
        
        const asset = {
          text: headlineText,
          ...(pinPosition && { pinnedField: `HEADLINE_${pinPosition}` })
        };
        
        return asset;
      });
      
      // Format descriptions with pinning options
      const descriptionAssets = params.descriptions.map((description: any, index: number) => {
        const descriptionText = typeof description === 'string' ? description : description.text;
        const pinPosition = typeof description === 'object' && description.pinPosition ? description.pinPosition : null;
        
        const asset = {
          text: descriptionText,
          ...(pinPosition && { pinnedField: `DESCRIPTION_${pinPosition}` })
        };
        
        return asset;
      });
      
      // Prepare ad payload
      const adPayload = {
        operations: [
          {
            create: {
              adGroup: adGroupResourceName,
              status: params.status || "ENABLED",
              ad: {
                // Use specific type for responsive search ad
                responsiveSearchAd: {
                  headlines: headlineAssets,
                  descriptions: descriptionAssets,
                  path1: params.pathText1,
                  path2: params.pathText2
                },
                finalUrls: params.finalUrls
              }
            }
          }
        ]
      };
      
      // Make API call to create ad
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/adGroupAds:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(adPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        const adResourceName = responseData.results[0].resourceName;
        const adId = adResourceName.split('/').pop();
        
        // Return success response
        return {
          success: true,
          adId,
          adResourceName,
          message: `Responsive search ad created successfully with ID ${adId}`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to create responsive search ad: ${errorMessage}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error creating responsive search ad: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Helper method to get a specific customer account by ID
   */
  async getCustomerAccount(userId: string, customerId: string): Promise<any> {
    const accounts = await storage.getGoogleAdvertiserAccounts(userId);
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No Google Ads accounts found for this user");
    }
    
    const account = accounts.find(acc => acc.customerId === customerId);
    if (!account) {
      throw new Error(`Google Ads account with ID ${customerId} not found for this user`);
    }
    
    return account;
  }
  
  /**
   * Maps common location names to Google geo target constant IDs
   * This is a simplified mapping - in production, use the GeoTargetConstantService
   */
  private getLocationMapping(): Record<string, string> {
    return {
      // Countries
      "united states": "2840",
      "us": "2840",
      "usa": "2840",
      "canada": "2124",
      "united kingdom": "2826",
      "uk": "2826",
      "australia": "2036",
      "germany": "2276",
      "france": "2250",
      "india": "2356",
      "japan": "2392",
      
      // US States
      "california": "21137",
      "new york": "21167",
      "texas": "21184",
      "florida": "21144",
      "illinois": "21148",
      "pennsylvania": "21172",
      "ohio": "21168",
      "michigan": "21156",
      "georgia": "21146",
      "north carolina": "21167",
      
      // Major US Cities
      "new york city": "1023191",
      "los angeles": "1014221",
      "chicago": "1016367",
      "houston": "1015212",
      "phoenix": "1019108",
      "philadelphia": "10184758",
      "san antonio": "1020567",
      "san diego": "1020619",
      "dallas": "1013695",
      "san francisco": "1020617"
    };
  }
  
  /**
   * Maps common language names to Google language constant IDs
   * This is a simplified mapping - in production, use the LanguageConstantService
   */
  private getLanguageMapping(): Record<string, string> {
    return {
      "english": "1000",
      "spanish": "1003",
      "french": "1002",
      "german": "1001",
      "italian": "1004",
      "portuguese": "1014",
      "dutch": "1005",
      "chinese": "1017", // Simplified Chinese
      "japanese": "1005",
      "korean": "1012",
      "russian": "1031",
      "arabic": "1019"
    };
  }
  
  /**
   * Resolves location names to geo target constant IDs
   * @param locationNames Array of location names to resolve
   * @returns Map of resolved location IDs
   */
  private resolveLocationIds(locationNames: string[]): Record<string, string> {
    const locationMapping = this.getLocationMapping();
    const resolvedLocations: Record<string, string> = {};
    
    for (const location of locationNames) {
      const normalizedLocation = location.toLowerCase().trim();
      
      // Check if it's already an ID (numeric string)
      if (/^\d+$/.test(normalizedLocation)) {
        resolvedLocations[location] = normalizedLocation;
        continue;
      }
      
      // Look up in our mapping
      const locationId = locationMapping[normalizedLocation];
      if (locationId) {
        resolvedLocations[location] = locationId;
      } else {
        // If no match, log warning but keep the original for the API to try
        console.warn(`Could not resolve location: ${location}`);
        resolvedLocations[location] = normalizedLocation;
      }
    }
    
    return resolvedLocations;
  }
  
  /**
   * Resolves language names to language constant IDs
   * @param languageNames Array of language names to resolve
   * @returns Map of resolved language IDs
   */
  private resolveLanguageIds(languageNames: string[]): Record<string, string> {
    const languageMapping = this.getLanguageMapping();
    const resolvedLanguages: Record<string, string> = {};
    
    for (const language of languageNames) {
      const normalizedLanguage = language.toLowerCase().trim();
      
      // Check if it's already an ID (numeric string)
      if (/^\d+$/.test(normalizedLanguage)) {
        resolvedLanguages[language] = normalizedLanguage;
        continue;
      }
      
      // Look up in our mapping
      const languageId = languageMapping[normalizedLanguage];
      if (languageId) {
        resolvedLanguages[language] = languageId;
      } else {
        // If no match, log warning but keep the original for the API to try
        console.warn(`Could not resolve language: ${language}`);
        // Default to English if can't resolve
        resolvedLanguages[language] = "1000"; // English
      }
    }
    
    return resolvedLanguages;
  }
  
  /**
   * Adds location and language targeting to a campaign
   */
  async addCampaignTargeting(userId: string, params: any, customerId?: string): Promise<any> {
    try {
      // Validate parameters
      if (!params.campaignId && !params.campaignResourceName) {
        throw new Error("Either campaignId or campaignResourceName is required");
      }
      
      if (!params.locations || !Array.isArray(params.locations) || params.locations.length === 0) {
        throw new Error("At least one location is required");
      }
      
      // Get required credentials
      const accessToken = await this.getValidToken(userId);
      
      // Get customer account - either specific or first available
      const customerAccount = customerId 
        ? await this.getCustomerAccount(userId, customerId)
        : await this.getFirstCustomerAccount(userId);
      
      const developerToken = process.env.GOOGLE_DEVELOPER_TOKEN;
      
      if (!developerToken) {
        throw new Error("Google Developer Token is not configured");
      }
      
      // Build campaign resource name if only ID is provided
      let campaignResourceName = params.campaignResourceName;
      if (!campaignResourceName && params.campaignId) {
        campaignResourceName = `customers/${customerAccount.customerId}/campaigns/${params.campaignId}`;
      }
      
      // Resolve location IDs
      const locationMap = this.resolveLocationIds(params.locations);
      
      // Prepare location targeting operations
      const locationOperations = Object.entries(locationMap).map(([locationName, locationId]) => {
        return {
          create: {
            campaign: campaignResourceName,
            negative: false,
            type: "LOCATION",
            locationInfo: {
              geoTargetConstant: `geoTargetConstants/${locationId}`,
              targetType: params.locationTargetType || "PRESENCE"
            }
          }
        };
      });
      
      // Prepare language operations if languages provided
      const languageOperations = [];
      if (params.languages && Array.isArray(params.languages) && params.languages.length > 0) {
        const languageMap = this.resolveLanguageIds(params.languages);
        
        for (const [languageName, languageId] of Object.entries(languageMap)) {
          languageOperations.push({
            create: {
              campaign: campaignResourceName,
              negative: false,
              type: "LANGUAGE",
              languageInfo: {
                languageConstant: `languageConstants/${languageId}`
              }
            }
          });
        }
      }
      
      // Combine all operations
      const allOperations = [...locationOperations, ...languageOperations];
      
      // Prepare targeting payload
      const targetingPayload = {
        operations: allOperations
      };
      
      // Make API call to add targeting
      const response = await fetch(`https://googleads.googleapis.com/v16/customers/${customerAccount.customerId}/campaignCriteria:mutate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
          "login-customer-id": customerAccount.customerId
        },
        body: JSON.stringify(targetingPayload)
      });
      
      // Parse response
      const responseData = await response.json();
      
      // Handle successful response
      if (responseData.results && responseData.results.length > 0) {
        // Return success response
        return {
          success: true,
          addedTargeting: {
            locations: params.locations.length,
            languages: params.languages?.length || 0,
            total: responseData.results.length
          },
          message: `Added targeting to campaign: ${params.locations.length} locations and ${params.languages?.length || 0} languages`
        };
      } else {
        // Handle error response with better error parsing
        let errorMessage = "Unknown error";
        let errorDetails = {};
        
        if (responseData.error) {
          // Try to extract structured error data
          const apiErrors = responseData.error?.details?.[0]?.errors || [];
          if (apiErrors.length > 0) {
            const parsedErrors = apiErrors.map((err: any) => ({
              errorCode: err.errorCode,
              field: err.location,
              message: err.message
            }));
            
            errorMessage = parsedErrors[0].message || "API error";
            errorDetails = parsedErrors;
          } else {
            errorMessage = responseData.error.message || "API error";
            errorDetails = responseData.error;
          }
        }
        
        return {
          success: false,
          error: errorDetails,
          message: `Failed to add targeting to campaign: ${errorMessage}`
        };
      }
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: `Error adding targeting to campaign: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// Create a singleton instance for use throughout the application
export const googleAdsService = new GoogleAdsService(); 