/**
 * Function Call Handler
 * 
 * This file handles routing LLM function calls to the appropriate service methods.
 * It serves as the bridge between the LLM and the various API services.
 */

import { amazonAdsService } from "../services/amazon-api";
import { googleAdsService } from "../services/google-api";

/**
 * Interface for function call objects from the LLM
 */
interface FunctionCall {
  name?: string;
  arguments?: string | Record<string, any>; // Can be string or object depending on API
  function?: {
    name: string;
    arguments: string;
  };
}

/**
 * Get the current date in various formats
 */
function getCurrentDate(format?: string): { 
  date: string, 
  iso?: string, 
  timestamp?: number,
  year?: number,
  month?: number,
  day?: number,
  hours?: number,
  minutes?: number,
  seconds?: number,
  dayOfWeek?: number,
  tomorrow?: string,
  nextWeek?: string,
  message?: string
} {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Calculate tomorrow and next week
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  // Format dates as YYYY-MM-DD strings
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];
  
  if (format === 'ISO') {
    return { 
      date, 
      iso: now.toISOString(),
      tomorrow: tomorrowStr,
      nextWeek: nextWeekStr,
      message: `Today is ${date}, tomorrow is ${tomorrowStr}`
    };
  } else if (format === 'full') {
    return { 
      date, 
      iso: now.toISOString(), 
      timestamp: now.getTime(),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds(),
      dayOfWeek: now.getDay(),
      tomorrow: tomorrowStr,
      nextWeek: nextWeekStr,
      message: `Today is ${date}, tomorrow is ${tomorrowStr}`
    };
  }
  
  return { 
    date,
    tomorrow: tomorrowStr,
    nextWeek: nextWeekStr,
    message: `Today is ${date}, tomorrow is ${tomorrowStr}`
  };
}

/**
 * Extract function data from different API formats
 */
function extractFunctionData(functionCall: FunctionCall): { name: string, args: Record<string, any> } {
  let name: string;
  let args: Record<string, any>;
  
  // OpenAI format (v1)
  if (functionCall.name) {
    name = functionCall.name;
    args = typeof functionCall.arguments === 'string' 
      ? JSON.parse(functionCall.arguments) 
      : functionCall.arguments || {};
  } 
  // OpenAI format (v2)
  else if (functionCall.function?.name) {
    name = functionCall.function.name;
    args = typeof functionCall.function.arguments === 'string'
      ? JSON.parse(functionCall.function.arguments)
      : functionCall.function.arguments || {};
  }
  // Anthropic format
  else {
    throw new Error("Unsupported function call format");
  }
  
  return { name, args };
}

/**
 * Handle function calls from the LLM
 */
export async function handleFunctionCall(functionCall: FunctionCall, userId: string): Promise<any> {
  // Handle different function call formats
  const { name, args } = extractFunctionData(functionCall);
  
  console.log(`Handling function call: ${name} with args:`, args);
  
  // Add detailed logging for date-related parameters
  if (name.includes('amazon') && name.includes('campaign')) {
    if (args.startDate) {
      console.log(`StartDate parameter for ${name}: "${args.startDate}" (type: ${typeof args.startDate})`);
      
      // Validate date format
      const isValidDateFormat = /^\d{4}-\d{2}-\d{2}$/.test(String(args.startDate));
      console.log(`StartDate is in valid YYYY-MM-DD format: ${isValidDateFormat}`);
      
      if (!isValidDateFormat) {
        console.warn(`WARNING: StartDate "${args.startDate}" is not in YYYY-MM-DD format`);
      }
    } else {
      console.log(`No startDate parameter provided for ${name}`);
    }
  }
  
  try {
    // Route to appropriate handler based on function name
    switch (name) {
      case "get_current_date":
        return {
          success: true,
          ...getCurrentDate(typeof args === 'object' ? args.format : undefined)
        };
      
      // Amazon API functions
      case "create_amazon_sp_campaign":
        console.log("Calling createSpCampaign with userId:", userId);
        return await amazonAdsService.createSpCampaign(userId, args);
        
      case "create_amazon_ad_group":
        return await amazonAdsService.createAdGroup(userId, args);
        
      case "create_amazon_product_ads":
        return await amazonAdsService.createProductAds(userId, args);
        
      case "create_amazon_keywords":
        return await amazonAdsService.createKeywords(userId, args);
        
      case "create_amazon_negative_keywords":
        return await amazonAdsService.createNegativeKeywords(userId, args);
        
      case "delete_amazon_campaign":
        // Ensure args has the required campaignId property of string type
        if (typeof args === 'object' && typeof args.campaignId === 'string') {
          return await amazonAdsService.deleteAmazonCampaign(userId, { campaignId: args.campaignId });
        } else {
          return {
            success: false,
            error: 'Invalid arguments for delete_amazon_campaign',
            message: 'The campaignId must be a string'
          };
        }
        
      case "create_amazon_sv_campaign":
        return await amazonAdsService.createSvCampaign(userId, args);
        
      case "create_amazon_sd_campaign":
        return await amazonAdsService.createSdCampaign(userId, args);
        
      // Google Ads API functions
      case "create_google_campaign_budget":
        return await googleAdsService.createCampaignBudget(userId, args, args.customerId);
        
      case "create_google_campaign":
        return await googleAdsService.createCampaign(userId, args, args.customerId);
        
      case "create_google_ad_group":
        return await googleAdsService.createAdGroup(userId, args, args.customerId);
        
      case "create_google_keywords":
        return await googleAdsService.createKeywords(userId, args, args.customerId);
        
      case "create_google_negative_keywords":
        return await googleAdsService.createNegativeKeywords(userId, args, args.customerId);
        
      case "create_google_responsive_search_ad":
        return await googleAdsService.createResponsiveSearchAd(userId, args, args.customerId);
        
      case "add_google_campaign_targeting":
        return await googleAdsService.addCampaignTargeting(userId, args, args.customerId);
        
      case "delete_google_campaign":
        // Ensure args has the required campaignId property of string type
        return await googleAdsService.deleteGoogleCampaign(userId, args, args.customerId);
        
      default:
        return {
          success: false,
          error: `Unknown function: ${name}`,
          message: `The function '${name}' is not recognized or implemented.`
        };
    }
  } catch (error) {
    console.error(`Error executing function ${name}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: `Error executing function ${name}: ${error instanceof Error ? error.message : String(error)}`,
      stack: error instanceof Error ? error.stack : undefined,
      function_name: name
    };
  }
} 