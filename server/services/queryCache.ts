/**
 * Query Cache and Optimization Service
 * 
 * This service manages the caching and optimization for database queries
 * to improve performance for repeated or similar questions from the user.
 * It works with the SQL Builder LLM to provide fast access to pre-computed
 * metrics and summaries when available.
 */

import crypto from 'crypto';
import { storage } from '../storage';
import { db } from '../db';
import { and, eq, gte, lte, desc } from 'drizzle-orm';
import { campaignMetricsSummary, googleCampaignMetricsSummary } from '@shared/schema';

// Default time-to-live for cached queries in milliseconds
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Normalize a query by removing extra spaces, lowercasing, etc.
 * to improve cache hit rates for semantically identical questions
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;?!]/g, '')
    .trim();
}

/**
 * Generate a hash for a query to use as a cache key
 */
export function generateQueryHash(query: string, userId: string): string {
  const normalized = normalizeQuery(query);
  return crypto
    .createHash('sha256')
    .update(`${userId}:${normalized}`)
    .digest('hex');
}

/**
 * Determine if a query is complex and should bypass the cache system
 * Complex queries often involve specific filters, joins, or advanced calculations
 */
export function isComplexQuery(query: string): boolean {
  // Check for specific keywords that indicate complex queries
  const complexIndicators = [
    'specific',
    'campaign id', 
    'campaign name',
    'compared to',
    'correlation',
    'relationship between',
    'trend',
    'over time',
    'percentage change',
    'growth rate',
    'raw data',
    'detailed',
    'exact'
  ];
  
  // Check if query has any complex indicators
  const normalizedQuery = normalizeQuery(query);
  return complexIndicators.some(indicator => 
    normalizedQuery.includes(normalizeQuery(indicator))
  );
}

/**
 * Get a cached response for a query if available
 * Complex queries bypass the cache system to ensure accurate results
 */
export async function getCachedResponse(
  query: string, 
  userId: string
): Promise<any | null> {
  // Check if this is a complex query that should bypass cache
  if (isComplexQuery(query)) {
    console.log(`Complex query detected, bypassing cache: "${query}"`);
    return null;
  }
  
  const queryHash = generateQueryHash(query, userId);
  const cachedEntry = await storage.getQueryCacheEntry(userId, queryHash);
  
  if (cachedEntry) {
    // Update hit count for analytics
    await storage.updateQueryCacheHitCount(cachedEntry.id);
    return cachedEntry.responseData;
  }
  
  return null;
}

/**
 * Cache a response for future use
 */
export async function cacheResponse(
  query: string, 
  userId: string, 
  responseData: any, 
  ttlMs: number = DEFAULT_CACHE_TTL
): Promise<void> {
  const queryHash = generateQueryHash(query, userId);
  const normalizedQuery = normalizeQuery(query);
  
  // Set expiration time
  const expiresAt = new Date(Date.now() + ttlMs);
  
  // Create a cache entry
  await storage.createQueryCacheEntry({
    userId,
    queryHash,
    normalizedQuery,
    responseData,
    expiresAt
  });
}

/**
 * Function to match user query to appropriate time frames
 * @param query The user's query text
 */
export function detectTimeFrames(query: string): string[] {
  const normalizedQuery = normalizeQuery(query);
  const timeFrames = [];
  
  // Check for time frame keywords
  if (
    normalizedQuery.includes('today') || 
    normalizedQuery.includes('daily') ||
    normalizedQuery.includes('yesterday')
  ) {
    timeFrames.push('daily');
  }
  
  if (
    normalizedQuery.includes('week') || 
    normalizedQuery.includes('weekly') ||
    normalizedQuery.includes('last 7 days')
  ) {
    timeFrames.push('weekly');
  }
  
  if (
    normalizedQuery.includes('month') || 
    normalizedQuery.includes('monthly') ||
    normalizedQuery.includes('last 30 days')
  ) {
    timeFrames.push('monthly');
  }
  
  if (
    normalizedQuery.includes('quarter') || 
    normalizedQuery.includes('quarterly') ||
    normalizedQuery.includes('last 90 days')
  ) {
    timeFrames.push('quarterly');
  }
  
  // Default to monthly if no specific time frame is mentioned
  if (timeFrames.length === 0) {
    timeFrames.push('monthly');
  }
  
  return timeFrames;
}

/**
 * Check if user query contains metrics-related terms
 */
export function containsMetricTerms(query: string): boolean {
  const normalizedQuery = normalizeQuery(query);
  const metricTerms = [
    'ctr', 'click through', 'clickthrough', 
    'impressions', 'clicks', 'cost', 
    'conversions', 'roas', 'return on ad spend',
    'campaign', 'metrics', 'performance'
  ];
  
  return metricTerms.some(term => normalizedQuery.includes(term));
}

/**
 * Get campaign metrics summaries for a query
 * This function will attempt to use pre-computed summaries when available
 */
export async function getCampaignMetricsSummaries(
  userId: string, 
  query: string
): Promise<any> {
  // Extract timeframes from the query
  const timeFrames = detectTimeFrames(query);
  
  // Get all summaries for detected timeframes
  const summaries = [];
  
  for (const timeFrame of timeFrames) {
    // Get Amazon campaign summaries
    const amazonSummaries = await storage.getCampaignMetricsSummaries(userId, timeFrame);
    if (amazonSummaries.length > 0) {
      summaries.push({
        type: 'amazon',
        timeFrame,
        summaries: amazonSummaries
      });
    }
    
    // Get Google campaign summaries
    const googleSummaries = await storage.getGoogleCampaignMetricsSummaries(userId, timeFrame);
    if (googleSummaries.length > 0) {
      summaries.push({
        type: 'google',
        timeFrame,
        summaries: googleSummaries
      });
    }
  }
  
  return summaries;
}

/**
 * Function to generate summaries for a user
 * This should be called periodically and after data updates
 */
export async function generateAllSummaries(userId: string): Promise<void> {
  try {
    // Generate campaign metrics summaries for Amazon
    await storage.generateCampaignMetricsSummaries(userId);
    
    // Generate campaign metrics summaries for Google
    await storage.generateGoogleCampaignMetricsSummaries(userId);
    
    // Skip cache invalidation for now until DB migration is run
    console.log('Note: Cache invalidation skipped until migration creates query_cache_entries table');
    
    // Later, uncomment this:
    // await storage.invalidateQueryCache(userId);
  } catch (error) {
    console.error('Error generating summaries:', error);
  }
}

/**
 * Format summaries into a standardized response format
 * that's easy for the chat UI to display
 */
export function formatSummariesForDisplay(summaries: any[]): any {
  // Format the summaries into a standardized structure
  const formattedSummaries = [];
  
  for (const summaryGroup of summaries) {
    const { type, timeFrame, summaries: items } = summaryGroup;
    
    // Group summaries by campaign
    const campaignMap = new Map();
    
    for (const item of items) {
      const campaignId = item.campaignId;
      
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          id: campaignId,
          platform: type,
          timeFrame,
          metrics: []
        });
      }
      
      const campaign = campaignMap.get(campaignId);
      
      // Add metrics
      campaign.metrics.push(
        {
          type: 'impressions',
          label: 'Impressions',
          value: item.totalImpressions
        },
        {
          type: 'clicks',
          label: 'Clicks',
          value: item.totalClicks
        },
        {
          type: 'cost',
          label: 'Cost',
          value: item.totalCost
        },
        {
          type: 'ctr',
          label: 'CTR',
          value: item.ctr
        }
      );
      
      // If conversions are available, add them
      if (item.conversions !== undefined) {
        campaign.metrics.push({
          type: 'conversions',
          label: 'Conversions',
          value: item.conversions
        });
      }
    }
    
    // Convert map to array
    const campaigns = Array.from(campaignMap.values());
    formattedSummaries.push({
      type: 'campaign_group',
      platform: type,
      timeFrame,
      campaigns
    });
  }
  
  return formattedSummaries;
}

/**
 * Generate insights about the campaign metrics data
 */
export function generateInsights(summaries: any[]): string[] {
  const insights = [];
  
  // Process each summary group
  for (const summaryGroup of summaries) {
    const { campaigns } = summaryGroup;
    
    if (campaigns.length > 1) {
      // Compare campaigns if there are multiple
      const highestCTR = campaigns.reduce((max: {id: string, ctr: number}, current: any) => {
        const ctrMetric = current.metrics.find((m: any) => m.type === 'ctr');
        const currentCTR = ctrMetric ? Number(ctrMetric.value) : 0;
        
        return currentCTR > max.ctr ? { id: current.id, ctr: currentCTR } : max;
      }, { id: '', ctr: 0 });
      
      if (highestCTR.id) {
        insights.push(`Campaign ${highestCTR.id} has the highest CTR at ${highestCTR.ctr.toFixed(1)}%.`);
      }
      
      // Find highest and lowest performing campaigns by clicks
      const campaignsByClicks = [...campaigns].sort((a, b) => {
        const aClicks = a.metrics.find(m => m.type === 'clicks')?.value || 0;
        const bClicks = b.metrics.find(m => m.type === 'clicks')?.value || 0;
        return Number(bClicks) - Number(aClicks);
      });
      
      if (campaignsByClicks.length > 0) {
        const topCampaign = campaignsByClicks[0];
        const topCampaignClicks = topCampaign.metrics.find(m => m.type === 'clicks')?.value || 0;
        
        insights.push(`Campaign ${topCampaign.id} has the highest number of clicks (${topCampaignClicks}).`);
        
        if (campaignsByClicks.length > 1) {
          const bottomCampaign = campaignsByClicks[campaignsByClicks.length - 1];
          const bottomCampaignClicks = bottomCampaign.metrics.find(m => m.type === 'clicks')?.value || 0;
          
          insights.push(`Campaign ${bottomCampaign.id} has the lowest number of clicks (${bottomCampaignClicks}).`);
        }
      }
    }
  }
  
  return insights;
}