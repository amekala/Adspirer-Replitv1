/**
 * Scheduled Maintenance Tasks
 * 
 * This script sets up scheduled tasks to run database maintenance
 * operations at regular intervals. It uses Node's built-in setTimeout
 * for simplicity, but could be replaced with a more robust scheduler
 * like node-cron in a production environment.
 */

import updateCacheSummaries from './updateCacheSummaries';

// Configuration for maintenance tasks
const config = {
  // Run cache and summary updates every 24 hours
  cacheSummaryInterval: 24 * 60 * 60 * 1000, // 24 hours in ms
  
  // Initial delay before first run (5 minutes after server start)
  initialDelay: 5 * 60 * 1000, // 5 minutes in ms
};

/**
 * Start the scheduled maintenance tasks
 */
export function startScheduledTasks() {
  console.log('Starting scheduled maintenance tasks...');
  
  // Schedule cache and summary updates
  setTimeout(() => {
    // Run immediately after initial delay
    console.log('Running initial cache and summary update...');
    updateCacheSummaries().catch(err => {
      console.error('Error in initial cache update:', err);
    });
    
    // Then schedule recurring updates
    setInterval(() => {
      console.log('Running scheduled cache and summary update...');
      updateCacheSummaries().catch(err => {
        console.error('Error in scheduled cache update:', err);
      });
    }, config.cacheSummaryInterval);
    
  }, config.initialDelay);
  
  console.log(`Maintenance tasks scheduled. First run in ${config.initialDelay / 1000 / 60} minutes.`);
}