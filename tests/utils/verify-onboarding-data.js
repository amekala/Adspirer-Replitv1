/**
 * Database Verification Tool for Onboarding Data
 * 
 * This script connects to the PostgreSQL database and runs queries to verify
 * that onboarding data is being correctly stored and deleted.
 */

import { db } from '../server/db.js';
import { eq } from 'drizzle-orm';
import { businessCore, brandIdentity, productsServices, creativeExamples, performanceContext, onboardingProgress } from '../shared/schema.js';

// Function to query data for a specific user
async function queryUserOnboardingData(userId) {
  console.log(`\n=== Querying Onboarding Data for User: ${userId} ===\n`);

  try {
    // Business Core
    const businessCoreData = await db.query.businessCore.findFirst({
      where: eq(businessCore.userId, userId)
    });
    
    console.log('Business Core Data:');
    console.log(businessCoreData || 'None');
    
    // Brand Identity
    const brandIdentityData = await db.query.brandIdentity.findFirst({
      where: eq(brandIdentity.userId, userId)
    });
    
    console.log('\nBrand Identity Data:');
    console.log(brandIdentityData || 'None');
    
    // Products Services
    const productsServicesData = await db.query.productsServices.findFirst({
      where: eq(productsServices.userId, userId)
    });
    
    console.log('\nProducts/Services Data:');
    console.log(productsServicesData || 'None');
    
    // Creative Examples
    const creativeExamplesData = await db.query.creativeExamples.findFirst({
      where: eq(creativeExamples.userId, userId)
    });
    
    console.log('\nCreative Examples Data:');
    console.log(creativeExamplesData || 'None');
    
    // Performance Context
    const performanceContextData = await db.query.performanceContext.findFirst({
      where: eq(performanceContext.userId, userId)
    });
    
    console.log('\nPerformance Context Data:');
    console.log(performanceContextData || 'None');
    
    // Onboarding Progress
    const progressData = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId)
    });
    
    console.log('\nOnboarding Progress:');
    console.log(progressData || 'None');
    
    return {
      businessCore: businessCoreData,
      brandIdentity: brandIdentityData,
      productsServices: productsServicesData,
      creativeExamples: creativeExamplesData,
      performanceContext: performanceContextData,
      progress: progressData
    };
  } catch (error) {
    console.error('Error querying onboarding data:', error);
    return null;
  }
}

// Function to verify data after reset
async function verifyResetData(userId) {
  console.log(`\n=== Verifying Reset for User: ${userId} ===\n`);
  
  try {
    const data = await queryUserOnboardingData(userId);
    
    // Check if all onboarding data tables are empty for this user
    const isBusinessCoreEmpty = !data.businessCore;
    const isBrandIdentityEmpty = !data.brandIdentity;
    const isProductsServicesEmpty = !data.productsServices;
    const isCreativeExamplesEmpty = !data.creativeExamples;
    const isPerformanceContextEmpty = !data.performanceContext;
    
    // Check if onboarding progress is reset to step 1
    const isProgressReset = data.progress && data.progress.currentStep === 1 && !data.progress.isComplete;
    
    console.log('\n=== Reset Verification Results ===');
    console.log(`Business Core Data Cleared: ${isBusinessCoreEmpty ? '✅' : '❌'}`);
    console.log(`Brand Identity Data Cleared: ${isBrandIdentityEmpty ? '✅' : '❌'}`);
    console.log(`Products/Services Data Cleared: ${isProductsServicesEmpty ? '✅' : '❌'}`);
    console.log(`Creative Examples Data Cleared: ${isCreativeExamplesEmpty ? '✅' : '❌'}`);
    console.log(`Performance Context Data Cleared: ${isPerformanceContextEmpty ? '✅' : '❌'}`);
    console.log(`Onboarding Progress Reset: ${isProgressReset ? '✅' : '❌'}`);
    
    const allDataCleared = isBusinessCoreEmpty && 
                          isBrandIdentityEmpty && 
                          isProductsServicesEmpty && 
                          isCreativeExamplesEmpty && 
                          isPerformanceContextEmpty;
                          
    console.log(`\nOverall Reset Status: ${allDataCleared && isProgressReset ? '✅ SUCCESSFUL' : '❌ FAILED'}`);
    
    return {
      success: allDataCleared && isProgressReset,
      details: {
        businessCoreCleared: isBusinessCoreEmpty,
        brandIdentityCleared: isBrandIdentityEmpty,
        productsServicesCleared: isProductsServicesEmpty,
        creativeExamplesCleared: isCreativeExamplesEmpty,
        performanceContextCleared: isPerformanceContextEmpty,
        progressReset: isProgressReset
      }
    };
  } catch (error) {
    console.error('Error verifying reset data:', error);
    return { success: false, error };
  }
}

// Main function to run verification
async function runVerification() {
  try {
    // Get all users
    const users = await db.query.users.findMany();
    
    console.log(`Found ${users.length} users in the database.\n`);
    
    // For demonstration, we'll check the first user
    if (users.length > 0) {
      const userId = users[0].id;
      
      // Check current data
      console.log('=== CURRENT STATE ===');
      await queryUserOnboardingData(userId);
      
      console.log('\n=== INSTRUCTIONS ===');
      console.log('1. Go to Settings > Compliance > Data Rights');
      console.log('2. Click "Reset Onboarding Data" button');
      console.log('3. Run this script again with --verify flag to check if data was properly deleted');
      
      // Check if --verify flag was passed
      if (process.argv.includes('--verify')) {
        console.log('\n=== VERIFYING RESET ===');
        const resetResult = await verifyResetData(userId);
        
        if (resetResult.success) {
          console.log('\n✅ SUCCESS: Onboarding data was successfully reset.');
        } else {
          console.log('\n❌ FAILURE: Some onboarding data was not properly reset.');
        }
      }
    } else {
      console.log('No users found in database.');
    }
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

// Run the verification
runVerification();