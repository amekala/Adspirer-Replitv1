/**
 * Context Assembly Service
 * 
 * This service assembles relevant context for the LLM to use in answering user queries.
 * It combines data from multiple sources:
 * 1. Pinecone vector search results
 * 2. SQL database query results
 * 3. User chat history and preferences
 * 
 * By maintaining a separate context assembly service, we can:
 * - Easily debug what information is being sent to the LLM
 * - Modify the context format without changing other components
 * - Add new data sources in the future
 */

import { log } from '../vite';
import { formatCampaignData, formatInsights } from './sql-data';

/**
 * Extract parameter information from user query
 * @param {string} query - The user's question
 * @returns {Object} Extracted parameters
 */
export function extractQueryParameters(query: string): Record<string, any> {
  const params: Record<string, any> = {
    metrics: [],
    timeframe: null,
    platforms: [],
    comparison: false,
    specific_campaign: null,
  };
  
  // Common metrics to look for
  const metricTerms = [
    'impressions', 'clicks', 'ctr', 'click-through rate', 
    'cost', 'spend', 'sales', 'revenue', 'roas', 'roi',
    'conversions', 'conversion rate', 'cpa', 'cost per acquisition'
  ];
  
  // Check for metrics
  metricTerms.forEach(metric => {
    if (query.toLowerCase().includes(metric.toLowerCase())) {
      params.metrics.push(metric);
    }
  });
  
  // Check for timeframes
  const timeRegex = /last\s+(\d+)\s+(day|week|month|year)s?/i;
  const timeMatch = query.match(timeRegex);
  if (timeMatch) {
    params.timeframe = {
      value: parseInt(timeMatch[1]),
      unit: timeMatch[2].toLowerCase()
    };
  }
  
  // Check for platforms
  ['amazon', 'google', 'meta', 'facebook'].forEach(platform => {
    if (query.toLowerCase().includes(platform.toLowerCase())) {
      params.platforms.push(platform);
    }
  });
  
  // Check for comparison intent
  if (/compar(e|ison)|vs\.?|versus|better than|worse than|difference/i.test(query)) {
    params.comparison = true;
  }
  
  // Look for specific campaign mentions
  const campaignRegex = /campaign\s+(?:called|named)?\s*["']?([^"']+)["']?/i;
  const campaignMatch = query.match(campaignRegex);
  if (campaignMatch) {
    params.specific_campaign = campaignMatch[1].trim();
  }
  
  return params;
}

/**
 * Assemble context for the LLM
 * @param {string} query - Original user query
 * @param {any[]} campaigns - Campaign data from SQL
 * @param {Object} queryParams - Extracted query parameters
 * @param {Object} insights - Calculated insights
 * @param {string} userId - User ID for personalization
 * @returns {string} Assembled context
 */
export function assembleContext(
  query: string,
  campaigns: any[],
  queryParams: Record<string, any>,
  insights: Record<string, any>,
  userId: string
): string {
  // Start with base context
  let context = `User Query: "${query}"\n\n`;
  
  // Add query understanding
  context += "Query Analysis:\n";
  if (queryParams.metrics.length > 0) {
    context += `  Metrics of interest: ${queryParams.metrics.join(', ')}\n`;
  }
  if (queryParams.platforms.length > 0) {
    context += `  Platforms mentioned: ${queryParams.platforms.join(', ')}\n`;
  }
  if (queryParams.timeframe) {
    context += `  Time period: Last ${queryParams.timeframe.value} ${queryParams.timeframe.unit}(s)\n`;
  }
  if (queryParams.comparison) {
    context += "  User is asking for a comparison\n";
  }
  if (queryParams.specific_campaign) {
    context += `  Specific campaign mentioned: ${queryParams.specific_campaign}\n`;
  }
  context += "\n";
  
  // Add campaign data
  if (campaigns.length > 0) {
    context += "Relevant Campaign Data:\n";
    context += formatCampaignData(campaigns);
  } else {
    context += "No relevant campaign data found.\n\n";
  }
  
  // Add insights
  if (Object.keys(insights).length > 0) {
    context += formatInsights(insights);
  }
  
  // Add guidance for the LLM
  context += "\nInstructions for answering:\n";
  context += "1. Use ONLY the campaign data provided above to answer the user's question.\n";
  context += "2. If the data doesn't contain information needed to answer fully, acknowledge the limitation.\n";
  context += "3. Provide concise, factual answers based on the campaign metrics.\n";
  context += "4. If there are multiple campaigns, compare them when relevant to the query.\n";
  context += "5. Don't use external knowledge about advertising that's not in the data provided.\n";
  
  log(`Assembled context (${context.length} chars) for query: "${query.substring(0, 50)}..."`, 'context-assembly');
  return context;
}

/**
 * Generate system prompt for OpenAI
 * @returns {string} System prompt
 */
export function generateSystemPrompt(): string {
  return `You are an AI assistant specialized in ad campaign analysis. Your role is to help marketers understand their campaign performance by analyzing data from their Amazon and Google advertising accounts.

Follow these guidelines:
1. Be concise and precise in your answers.
2. When referencing metrics, include the exact numbers from the provided context.
3. Provide actionable insights based on the data.
4. Avoid making assumptions beyond what the data shows.
5. If you can't answer a question based on the provided data, clearly say so rather than making up information.

Your goal is to help users understand their campaign performance and make data-driven decisions.`;
}