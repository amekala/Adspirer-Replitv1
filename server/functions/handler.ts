/**
 * Function Call Handler
 * 
 * This file handles routing LLM function calls to the appropriate service methods.
 * It serves as the bridge between the LLM and the various API services.
 */

import { amazonAdsService } from "../services/amazon-api";

/**
 * Interface for function call objects from the LLM
 */
interface FunctionCall {
  name: string;
  arguments: string | Record<string, any>; // Can be string or object depending on API
  function?: {
    name: string;
    arguments: string;
  };
}

/**
 * Returns the current date in requested format
 */
function getCurrentDate(format: string = 'YYYY-MM-DD'): any {
  const now = new Date();
  
  if (format === 'ISO') {
    return { date: now.toISOString() };
  }
  
  if (format === 'full') {
    return {
      date: now.toISOString(),
      formatted: now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }),
      timestamp: now.getTime(),
      components: {
        year: now.getFullYear(),
        month: now.getMonth() + 1, // JavaScript months are 0-indexed
        day: now.getDate(),
        hour: now.getHours(),
        minute: now.getMinutes(),
        second: now.getSeconds()
      }
    };
  }
  
  // Default YYYY-MM-DD format
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}` };
}

/**
 * Handle a function call from the LLM and route it to the appropriate handler
 * @param functionCall The function call object from the LLM
 * @param userId The ID of the user making the request
 * @returns The result of the function call, formatted for LLM consumption
 */
export async function handleFunctionCall(functionCall: FunctionCall, userId: string): Promise<any> {
  // Handle different function call formats
  const name = functionCall.function?.name || functionCall.name;
  let args = functionCall.function?.arguments || functionCall.arguments;
  
  // Parse arguments if they're a string
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse function arguments',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  console.log(`Handling function call: ${name} with args:`, args);
  
  // Route to appropriate handler based on function name
  switch (name) {
    case "get_current_date":
      return {
        success: true,
        ...getCurrentDate(typeof args === 'object' ? args.format : undefined)
      };
    
    case "create_amazon_sp_campaign":
      return await amazonAdsService.createSpCampaign(userId, args);
      
    case "create_amazon_ad_group":
      return await amazonAdsService.createAdGroup(userId, args);
      
    case "create_amazon_product_ads":
      return await amazonAdsService.createProductAds(userId, args);
      
    case "create_amazon_keywords":
      return await amazonAdsService.createKeywords(userId, args);
      
    case "create_amazon_negative_keywords":
      return await amazonAdsService.createNegativeKeywords(userId, args);
      
    default:
      return {
        success: false,
        error: `Unknown function: ${name}`,
        message: `The function '${name}' is not recognized or implemented.`
      };
  }
} 