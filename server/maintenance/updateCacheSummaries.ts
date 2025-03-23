/**
 * Database Maintenance Script - Update Cache and Summaries
 * 
 * This script performs database maintenance operations to:
 * 1. Generate campaign metrics summaries by timeframe (daily, weekly, monthly, quarterly)
 * 2. Clean expired query cache entries
 * 3. Keep pre-computed summaries up to date
 * 
 * This script can be run manually or scheduled to run periodically
 */

import { db } from '../db';
import { storage } from '../storage';
import * as QueryCache from '../services/queryCache';

async function main() {
  try {
    console.log('Starting database maintenance - updating summaries and cache...');
    
    // Get all users with active campaign data
    const users = await getAllUsersWithCampaignData();
    console.log(`Found ${users.length} users with campaign data`);
    
    // For each user, generate summaries
    for (const user of users) {
      console.log(`Generating summaries for user ${user.id}`);
      
      try {
        // Generate all summaries for this user
        await QueryCache.generateAllSummaries(user.id);
        console.log(`Successfully generated summaries for user ${user.id}`);
      } catch (error) {
        console.error(`Error generating summaries for user ${user.id}:`, error);
      }
    }
    
    // Invalidate old cache entries (older than 1 week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    for (const user of users) {
      try {
        await storage.invalidateQueryCache(user.id, oneWeekAgo);
        console.log(`Invalidated old cache entries for user ${user.id}`);
      } catch (error) {
        console.error(`Error invalidating cache for user ${user.id}:`, error);
      }
    }
    
    console.log('Database maintenance completed successfully');
  } catch (error) {
    console.error('Error during database maintenance:', error);
  }
}

/**
 * Get all users who have campaign data
 */
async function getAllUsersWithCampaignData(): Promise<{ id: string }[]> {
  // Get unique user IDs from campaign metrics tables
  const amazonUsersSql = `
    SELECT DISTINCT user_id as id FROM campaign_metrics
  `;
  
  const googleUsersSql = `
    SELECT DISTINCT user_id as id FROM google_campaign_metrics
  `;
  
  // Execute queries
  const amazonUsersResult = await db.execute(amazonUsersSql);
  const googleUsersResult = await db.execute(googleUsersSql);
  
  // Extract user IDs
  const amazonUsers = amazonUsersResult.rows || [];
  const googleUsers = googleUsersResult.rows || [];
  
  // Combine and deduplicate user IDs
  const allUsers = [...amazonUsers, ...googleUsers];
  const uniqueUserIds = new Set(allUsers.map(user => user.id));
  
  return Array.from(uniqueUserIds).map(id => ({ id }));
}

// Run the maintenance script
main().catch(console.error);

export default main;