/**
 * SQL Data Service for Campaign Analysis
 * 
 * This service retrieves detailed campaign data from the SQL database
 * to augment the semantic search results from Pinecone.
 * 
 * It's intentionally separated from the Pinecone service to:
 * 1. Maintain clear separation of concerns
 * 2. Make debugging easier
 * 3. Allow independent optimization of database queries
 */

import { pool } from '../db';
import { log } from '../vite';

/**
 * Fetch detailed campaign data from SQL database
 * @param {string[]} campaignIds - Campaign IDs to fetch
 * @param {string} userId - User ID for access control
 * @returns {Promise<any[]>} Campaign data with metrics
 */
export async function fetchCampaignData(campaignIds: string[], userId: string): Promise<any[]> {
  if (!campaignIds.length) {
    log(`No campaign IDs provided to fetch`, 'sql-data');
    return [];
  }
  
  try {
    log(`Fetching campaign data for ${campaignIds.length} campaigns: ${campaignIds.join(', ')}`, 'sql-data');
    
    // Create placeholders for SQL query
    const placeholders = campaignIds.map((_, i) => `$${i + 2}`).join(',');
    
    // Fetch Amazon campaigns
    const amazonQuery = `
      SELECT 
        aa.id, 
        aa.profile_id AS campaign_id,
        aa.account_name AS name,
        aa.marketplace,
        aa.account_type,
        'amazon' AS platform,
        aa.created_at
      FROM advertiser_accounts aa
      WHERE aa.user_id = $1 
      AND aa.profile_id IN (${placeholders})
    `;
    
    log(`Executing Amazon query with user ID: ${userId}`, 'sql-data');
    const amazonResult = await pool.query(amazonQuery, [userId, ...campaignIds]);
    const amazonCampaigns = amazonResult.rows;
    log(`Found ${amazonCampaigns.length} Amazon campaigns`, 'sql-data');
    
    // Fetch Google campaigns
    // We construct a more robust query that avoids any column name issues
    const googleQuery = `
      SELECT 
        id, 
        customer_id AS campaign_id,
        account_name AS name,
        status,
        'google' AS platform,
        created_at
      FROM google_advertiser_accounts
      WHERE user_id = $1 
      AND customer_id IN (${placeholders})
    `;
    
    log(`Executing Google query with user ID: ${userId}`, 'sql-data');
    const googleResult = await pool.query(googleQuery, [userId, ...campaignIds]);
    const googleCampaigns = googleResult.rows;
    log(`Found ${googleCampaigns.length} Google campaigns`, 'sql-data');
    
    // Combine all campaigns
    const campaigns = [...amazonCampaigns, ...googleCampaigns];
    
    // For each campaign, fetch metrics
    for (const campaign of campaigns) {
      if (campaign.platform === 'amazon') {
        const metricsQuery = `
          SELECT 
            AVG(cm.impressions) AS avg_impressions,
            SUM(cm.impressions) AS total_impressions,
            AVG(cm.clicks) AS avg_clicks,
            SUM(cm.clicks) AS total_clicks,
            AVG(cm.cost) AS avg_cost,
            SUM(cm.cost) AS total_cost,
            AVG(cm.conversions) AS avg_conversions,
            SUM(cm.conversions) AS total_conversions,
            0 AS avg_sales,
            0 AS total_sales,
            0 AS avg_roas
          FROM campaign_metrics cm
          WHERE cm.profile_id = $1 
          AND cm.user_id = $2
          GROUP BY cm.profile_id
        `;
        
        log(`Fetching metrics for Amazon campaign ${campaign.campaign_id}`, 'sql-data');
        const metricsResult = await pool.query(metricsQuery, [campaign.campaign_id, userId]);
        campaign.metrics = metricsResult.rows[0] || {};
        log(`Got metrics: ${JSON.stringify(campaign.metrics)}`, 'sql-data');
      } else if (campaign.platform === 'google') {
        const metricsQuery = `
          SELECT 
            AVG(gcm.impressions) AS avg_impressions,
            SUM(gcm.impressions) AS total_impressions,
            AVG(gcm.clicks) AS avg_clicks,
            SUM(gcm.clicks) AS total_clicks,
            AVG(gcm.cost) AS avg_cost,
            SUM(gcm.cost) AS total_cost,
            AVG(gcm.conversions) AS avg_conversions,
            SUM(gcm.conversions) AS total_conversions,
            AVG(gcm.value) AS avg_sales,
            SUM(gcm.value) AS total_sales,
            AVG(CASE WHEN gcm.cost > 0 THEN gcm.value / gcm.cost ELSE 0 END) AS avg_roas
          FROM google_campaign_metrics gcm
          WHERE gcm.customer_id = $1 
          AND gcm.user_id = $2
          GROUP BY gcm.customer_id
        `;
        
        log(`Fetching metrics for Google campaign ${campaign.campaign_id}`, 'sql-data');
        const metricsResult = await pool.query(metricsQuery, [campaign.campaign_id, userId]);
        campaign.metrics = metricsResult.rows[0] || {};
        log(`Got metrics: ${JSON.stringify(campaign.metrics)}`, 'sql-data');
      }
    }
    
    log(`Successfully fetched data for ${campaigns.length} campaigns`, 'sql-data');
    return campaigns;
  } catch (error) {
    log(`Error fetching campaign data: ${error}`, 'sql-data');
    return [];
  }
}

/**
 * Extract insights from campaign metrics
 * @param {any[]} campaigns - Campaign data with metrics
 * @returns {Object} Key insights about campaigns
 */
export function extractCampaignInsights(campaigns: any[]): Record<string, any> {
  if (!campaigns.length) return {};
  
  // Collect metrics across campaigns
  const metricsData: Record<string, number[]> = {};
  
  // Process each campaign
  campaigns.forEach(campaign => {
    if (!campaign.metrics) return;
    
    Object.entries(campaign.metrics).forEach(([key, value]) => {
      if (typeof value === 'number' && !isNaN(value)) {
        if (!metricsData[key]) metricsData[key] = [];
        metricsData[key].push(value as number);
      }
    });
  });
  
  // Calculate insights
  const insights: Record<string, any> = {};
  
  Object.entries(metricsData).forEach(([key, values]) => {
    if (values.length === 0) return;
    
    // Calculate metrics
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Save insights
    insights[key] = {
      average: avg,
      maximum: max,
      minimum: min,
      total: sum
    };
  });
  
  return insights;
}

/**
 * Format campaign data for LLM consumption
 * @param {any[]} campaigns - Campaign data with metrics
 * @returns {string} Formatted campaign data
 */
export function formatCampaignData(campaigns: any[]): string {
  let formattedData = '';
  
  campaigns.forEach((campaign, index) => {
    formattedData += `Campaign ${index + 1}: ${campaign.name} (${campaign.platform})\n`;
    formattedData += `  ID: ${campaign.campaign_id}\n`;
    
    if (campaign.marketplace) {
      formattedData += `  Marketplace: ${campaign.marketplace}\n`;
    }
    
    if (campaign.metrics) {
      formattedData += '  Metrics:\n';
      
      Object.entries(campaign.metrics).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        
        // Format the value based on its type and name
        let formattedValue = value;
        if (typeof value === 'number') {
          if (key.includes('cost') || key.includes('sales') || key.includes('value')) {
            formattedValue = `$${Number(value).toFixed(2)}`;
          } else if (key.includes('roas')) {
            formattedValue = Number(value).toFixed(2);
          } else if (key.includes('rate') || key.includes('percentage')) {
            formattedValue = `${(Number(value) * 100).toFixed(2)}%`;
          } else {
            formattedValue = Number(value).toLocaleString();
          }
        }
        
        // Format the key to be more readable
        const readableKey = key
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        formattedData += `    ${readableKey}: ${formattedValue}\n`;
      });
    }
    
    formattedData += '\n';
  });
  
  return formattedData;
}

/**
 * Format insights for LLM consumption
 * @param {Object} insights - Extracted insights
 * @returns {string} Formatted insights
 */
export function formatInsights(insights: Record<string, any>): string {
  if (Object.keys(insights).length === 0) return '';
  
  let formattedInsights = 'Campaign Insights:\n';
  
  Object.entries(insights).forEach(([key, data]) => {
    // Format the key to be more readable
    const readableKey = key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    // Format the values
    let formattedValues = '';
    Object.entries(data).forEach(([statKey, statValue]) => {
      let formattedValue = statValue;
      if (typeof statValue === 'number') {
        if (key.includes('cost') || key.includes('sales') || key.includes('value')) {
          formattedValue = `$${Number(statValue).toFixed(2)}`;
        } else if (key.includes('roas')) {
          formattedValue = Number(statValue).toFixed(2);
        } else {
          formattedValue = Number(statValue).toLocaleString();
        }
      }
      
      formattedValues += `${statKey}: ${formattedValue}, `;
    });
    
    // Remove trailing comma and space
    formattedValues = formattedValues.slice(0, -2);
    
    formattedInsights += `  ${readableKey}: ${formattedValues}\n`;
  });
  
  return formattedInsights;
}