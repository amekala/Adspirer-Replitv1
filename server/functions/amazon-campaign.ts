/**
 * Amazon Campaign Function Definitions
 * 
 * This file contains function schemas that define what the LLM can call
 * to interact with the Amazon Advertising API.
 */

/**
 * Tool definitions for Amazon campaign operations
 */
export const amazonCampaignTools = [
  {
    type: "function",
    name: "get_current_date",
    description: "Returns the current date and time information",
    parameters: {
      type: "object",
      properties: {
        format: { 
          type: "string", 
          enum: ["YYYY-MM-DD", "ISO", "full"], 
          description: "Format of the date to return: YYYY-MM-DD, ISO format, or full date information", 
          default: "YYYY-MM-DD"
        }
      },
      required: []
    }
  },
  {
    type: "function",
    name: "create_amazon_sp_campaign",
    description: "Creates a Sponsored Products campaign on Amazon Ads",
    parameters: {
      type: "object",
      properties: {
        name: { 
          type: "string", 
          description: "Name of the campaign" 
        },
        targetingType: { 
          type: "string", 
          enum: ["MANUAL", "AUTO"], 
          description: "Campaign targeting type" 
        },
        state: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial campaign state" 
        },
        dailyBudget: { 
          type: "number", 
          description: "Daily budget amount in dollars" 
        },
        startDate: { 
          type: "string", 
          description: "Campaign start date in YYYY-MM-DD format" 
        },
        endDate: { 
          type: "string", 
          description: "Campaign end date in YYYY-MM-DD format (optional)", 
          nullable: true 
        },
        biddingStrategy: {
          type: "string",
          enum: ["autoForSales", "autoForConversions", "fixed"],
          description: "The bidding strategy: 'autoForSales' (down only), 'autoForConversions' (up and down), or 'fixed'"
        }
      },
      required: ["name", "targetingType", "state", "dailyBudget", "startDate"]
    }
  },
  {
    type: "function",
    name: "create_amazon_ad_group",
    description: "Creates an ad group within an Amazon Sponsored Products campaign",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign to create this ad group in" 
        },
        name: { 
          type: "string", 
          description: "Name of the ad group" 
        },
        defaultBid: { 
          type: "number", 
          description: "Default bid amount in dollars" 
        },
        state: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial ad group state" 
        }
      },
      required: ["campaignId", "name", "defaultBid", "state"]
    }
  },
  {
    type: "function",
    name: "create_amazon_product_ads",
    description: "Creates product ads within an ad group",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign" 
        },
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group to add products to" 
        },
        state: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial product ad state" 
        },
        asins: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Array of Amazon Standard Identification Numbers (ASINs)" 
        },
        skus: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Array of Stock Keeping Units (SKUs)" 
        }
      },
      required: ["campaignId", "adGroupId"]
    }
  },
  {
    type: "function",
    name: "create_amazon_keywords",
    description: "Creates keywords for an ad group",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign" 
        },
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group to add keywords to" 
        },
        keywords: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Array of keyword text strings" 
        },
        matchType: { 
          type: "string", 
          enum: ["broad", "phrase", "exact"], 
          description: "Match type for all keywords" 
        },
        defaultBid: { 
          type: "number", 
          description: "Default bid amount in dollars for all keywords" 
        },
        state: { 
          type: "string", 
          enum: ["ENABLED", "PAUSED"], 
          description: "Initial keyword state" 
        }
      },
      required: ["campaignId", "adGroupId", "keywords", "matchType"]
    }
  },
  {
    type: "function",
    name: "create_amazon_negative_keywords",
    description: "Creates negative keywords for an ad group",
    parameters: {
      type: "object",
      properties: {
        campaignId: { 
          type: "string", 
          description: "ID of the campaign" 
        },
        adGroupId: { 
          type: "string", 
          description: "ID of the ad group to add negative keywords to" 
        },
        negativeKeywords: { 
          type: "array", 
          items: { type: "string" }, 
          description: "Array of negative keyword text strings" 
        }
      },
      required: ["campaignId", "adGroupId", "negativeKeywords"]
    }
  }
]; 