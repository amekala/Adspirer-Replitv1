/**
 * Google Campaign Function Definitions
 * 
 * This file contains function schemas that define what the LLM can call
 * to interact with the Google Ads API.
 */

/**
 * Tool definitions for Google campaign operations
 */
export const googleCampaignTools = [
  {
    name: "create_google_campaign_budget",
    description: "Creates a campaign budget for Google Ads campaigns",
    parameters: {
      type: "object",
      properties: {
        name: { 
          type: "string", 
          description: "Name for the budget (optional - will be auto-generated if not provided)" 
        },
        amount: { 
          type: "number", 
          description: "Daily budget amount in the account's currency (e.g., 10.00 for $10)" 
        },
        deliveryMethod: { 
          type: "string", 
          enum: ["STANDARD", "ACCELERATED"], 
          description: "Budget delivery method - STANDARD (even throughout day) or ACCELERATED (as quickly as possible)",
          default: "STANDARD"
        },
        explicitlyShared: { 
          type: "boolean", 
          description: "Whether this budget can be used by multiple campaigns", 
          default: false
        }
      },
      required: ["amount"]
    }
  },
  {
    
    name: "create_google_campaign",
    description: "Creates a campaign on Google Ads",
    parameters: {
      type: "object",
      properties: {
        name: { 
          type: "string", 
          description: "Name of the campaign" 
        },
        dailyBudget: { 
          type: "number", 
          description: "Daily budget amount (if not providing budgetResourceName)" 
        },
        budgetResourceName: { 
          type: "string", 
          description: "Resource name of an existing budget (alternative to dailyBudget)" 
        },
        advertisingChannelType: { 
          type: "string", 
          enum: ["SEARCH", "DISPLAY", "SHOPPING", "VIDEO", "MULTI_CHANNEL", "LOCAL", "SMART", "PERFORMANCE_MAX"], 
          description: "The type of campaign",
          default: "SEARCH"
        },
        status: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial campaign status", 
          default: "PAUSED" 
        },
        startDate: { 
          type: "string", 
          description: "Start date in YYYY-MM-DD format" 
        },
        endDate: { 
          type: "string", 
          description: "End date in YYYY-MM-DD format (optional)" 
        },
        bidding: { 
          type: "object",
          description: "Bidding strategy configuration",
          properties: {
            strategy: {
              type: "string",
              enum: ["manualCpc", "maximizeConversions", "maximizeConversionValue", "targetCpa", "targetRoas", "targetImpressionShare"],
              description: "Bidding strategy to use"
            },
            config: {
              type: "object",
              description: "Configuration for the specified bidding strategy"
            }
          }
        },
        targetGoogleSearch: {
          type: "boolean",
          description: "Show ads on Google Search",
          default: true
        },
        targetSearchNetwork: {
          type: "boolean",
          description: "Show ads on search partners",
          default: true
        },
        targetContentNetwork: {
          type: "boolean",
          description: "Show ads on the Google Display Network",
          default: false
        }
      },
      required: ["name"]
    }
  },
  {
    
    name: "create_google_ad_group",
    description: "Creates an ad group within a Google Ads campaign",
    parameters: {
      type: "object",
      properties: {
        name: { 
          type: "string", 
          description: "Name of the ad group" 
        },
        campaignId: { 
          type: "string", 
          description: "ID of the campaign (if not providing campaignResourceName)" 
        },
        campaignResourceName: { 
          type: "string", 
          description: "Resource name of the campaign (alternative to campaignId)" 
        },
        type: { 
          type: "string", 
          enum: ["SEARCH_STANDARD", "DISPLAY_STANDARD", "SHOPPING_PRODUCT_ADS", "SHOPPING_SMART_ADS", "VIDEO_STANDARD"], 
          description: "Type of ad group", 
          default: "SEARCH_STANDARD" 
        },
        status: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial ad group status", 
          default: "ENABLED" 
        },
        defaultBid: { 
          type: "number", 
          description: "Default CPC bid amount in the account's currency (e.g., 1.50 for $1.50)" 
        }
      },
      required: ["name", "campaignId"]
    }
  },
  {
    
    name: "create_google_keywords",
    description: "Creates keywords within a Google Ads ad group",
    parameters: {
      type: "object",
      properties: {
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group (if not providing adGroupResourceName)" 
        },
        adGroupResourceName: { 
          type: "string", 
          description: "Resource name of the ad group (alternative to adGroupId)" 
        },
        keywords: { 
          type: "array", 
          description: "List of keywords to add. Can be strings or objects with detailed settings", 
          items: {
            oneOf: [
              { 
                type: "string",
                description: "Simple keyword text (will use default match type: EXACT)"
              },
              {
                type: "object",
                description: "Keyword with detailed settings",
                properties: {
                  keywordText: { 
                    type: "string", 
                    description: "The keyword text" 
                  },
                  matchType: { 
                    type: "string", 
                    enum: ["EXACT", "PHRASE", "BROAD", "exact", "phrase", "broad"], 
                    description: "Keyword match type", 
                    default: "EXACT" 
                  },
                  bid: { 
                    type: "number", 
                    description: "CPC bid amount in the account's currency (e.g., 1.50 for $1.50)" 
                  },
                  status: { 
                    type: "string", 
                    enum: ["ENABLED", "PAUSED"], 
                    description: "Keyword status", 
                    default: "ENABLED" 
                  }
                },
                required: ["keywordText"]
              }
            ]
          }
        },
        status: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Status for all keywords (overridden by individual settings)" 
        }
      },
      required: ["adGroupId", "keywords"]
    }
  },
  {
    
    name: "create_google_negative_keywords",
    description: "Creates negative keywords within a Google Ads ad group",
    parameters: {
      type: "object",
      properties: {
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group (if not providing adGroupResourceName)" 
        },
        adGroupResourceName: { 
          type: "string", 
          description: "Resource name of the ad group (alternative to adGroupId)" 
        },
        keywords: { 
          type: "array", 
          description: "List of negative keywords to add. Can be strings or objects with detailed settings", 
          items: {
            oneOf: [
              { 
                type: "string",
                description: "Simple negative keyword text (will use default match type: EXACT)"
              },
              {
                type: "object",
                description: "Negative keyword with detailed settings",
                properties: {
                  keywordText: { 
                    type: "string", 
                    description: "The negative keyword text" 
                  },
                  matchType: { 
                    type: "string", 
                    enum: ["EXACT", "PHRASE", "BROAD", "exact", "phrase", "broad"], 
                    description: "Keyword match type", 
                    default: "EXACT" 
                  }
                },
                required: ["keywordText"]
              }
            ]
          }
        }
      },
      required: ["adGroupId", "keywords"]
    }
  },
  {
    
    name: "delete_google_campaign",
    description: "Deletes a Google Ads campaign",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign to delete (if not providing campaignResourceName)" 
        },
        campaignResourceName: { 
          type: "string", 
          description: "Resource name of the campaign to delete (alternative to campaignId)" 
        }
      },
      required: ["campaignId"]
    }
  },
  {
    
    name: "create_google_responsive_search_ad",
    description: "Creates a responsive search ad within a Google Ads ad group",
    parameters: {
      type: "object",
      properties: {
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group (if not providing adGroupResourceName)" 
        },
        adGroupResourceName: { 
          type: "string", 
          description: "Resource name of the ad group (alternative to adGroupId)" 
        },
        headlines: {
          type: "array",
          items: { 
            type: "object",
            properties: {
              text: { type: "string", description: "Headline text (max 30 characters)" },
              pinPosition: { type: "integer", description: "Optional position to pin this headline (1-3)", nullable: true }
            },
            required: ["text"]
          },
          description: "List of headlines (3-15 headlines recommended)"
        },
        descriptions: {
          type: "array",
          items: { 
            type: "object", 
            properties: {
              text: { type: "string", description: "Description text (max 90 characters)" },
              pinPosition: { type: "integer", description: "Optional position to pin this description (1-2)", nullable: true }
            },
            required: ["text"]
          },
          description: "List of descriptions (2-4 descriptions recommended)"
        },
        finalUrls: {
          type: "array",
          items: { type: "string" },
          description: "Landing page URLs"
        },
        pathText1: {
          type: "string",
          description: "Optional display path 1 (max 15 characters)",
          nullable: true
        },
        pathText2: {
          type: "string",
          description: "Optional display path 2 (max 15 characters)",
          nullable: true
        },
        status: {
          type: "string",
          enum: ["ENABLED", "PAUSED"],
          description: "Ad status",
          default: "ENABLED"
        },
        customerId: {
          type: "string",
          description: "Optional specific customer ID to use (if managing multiple accounts)"
        }
      },
      required: ["adGroupId", "headlines", "descriptions", "finalUrls"]
    }
  },
  {
    
    name: "add_google_campaign_targeting",
    description: "Adds location and language targeting to a Google Ads campaign",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign (if not providing campaignResourceName)" 
        },
        campaignResourceName: { 
          type: "string", 
          description: "Resource name of the campaign (alternative to campaignId)" 
        },
        locations: {
          type: "array",
          items: { 
            type: "string"
          },
          description: "List of location names or geo target codes (e.g., 'United States', 'California', 'New York')"
        },
        languages: {
          type: "array",
          items: { 
            type: "string"
          },
          description: "List of language names (e.g., 'English', 'Spanish', 'French')"
        },
        locationTargetType: {
          type: "string",
          enum: ["PRESENCE", "AREA_OF_INTEREST", "LOCATION_OF_PRESENCE"],
          description: "Type of location targeting",
          default: "PRESENCE"
        },
        customerId: {
          type: "string",
          description: "Optional specific customer ID to use (if managing multiple accounts)"
        }
      },
      required: ["campaignId", "locations"]
    }
  }
]; 