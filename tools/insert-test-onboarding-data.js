/**
 * Insert Test Onboarding Data Script
 * 
 * This script inserts test data into the onboarding tables to provide
 * data for testing the reset onboarding functionality.
 */

import { db } from '../server/db.js';
import { eq } from 'drizzle-orm';
import {
  businessCore,
  brandIdentity,
  productsServices,
  creativeExamples,
  performanceContext,
  onboardingProgress,
  users
} from '../shared/schema.js';

// Function to insert test data for a user
async function insertTestData(userId) {
  console.log(`\n=== Inserting Test Onboarding Data for User: ${userId} ===\n`);

  try {
    // First, check if the user exists
    const userExists = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!userExists) {
      console.error(`User with ID ${userId} not found in the database.`);
      return false;
    }

    // Insert Business Core data
    const businessCoreData = {
      userId: userId,
      companyName: 'Test Business Name',
      industry: 'Technology',
      companySize: 'Medium',
      companyDescription: 'A test company for onboarding data testing',
      targetAudience: 'Small and medium-sized businesses',
      mainChallenges: 'Competition and market awareness',
      marketplaces: ['US', 'Europe'],
      mainGoals: ['Increase brand awareness', 'Generate leads']
    };

    // Check if record already exists
    const existingBusinessCore = await db.query.businessCore.findFirst({
      where: eq(businessCore.userId, userId)
    });

    if (existingBusinessCore) {
      console.log('Business Core data already exists. Updating...');
      await db.update(businessCore)
        .set(businessCoreData)
        .where(eq(businessCore.userId, userId));
    } else {
      console.log('Inserting new Business Core data...');
      await db.insert(businessCore).values(businessCoreData);
    }

    // Insert Brand Identity data
    const brandIdentityData = {
      userId: userId,
      brandValues: ['Innovative', 'Trustworthy', 'Customer-focused'],
      brandVoice: 'Professional yet approachable',
      competitiveAdvantages: 'Superior technology, excellent customer service',
      visualPreferences: 'Modern, clean design with blue and green color scheme',
      logoUrl: 'https://example.com/logo.png',
      excludedElements: 'Outdated, cluttered designs, overly complex messaging'
    };

    const existingBrandIdentity = await db.query.brandIdentity.findFirst({
      where: eq(brandIdentity.userId, userId)
    });

    if (existingBrandIdentity) {
      console.log('Brand Identity data already exists. Updating...');
      await db.update(brandIdentity)
        .set(brandIdentityData)
        .where(eq(brandIdentity.userId, userId));
    } else {
      console.log('Inserting new Brand Identity data...');
      await db.insert(brandIdentity).values(brandIdentityData);
    }

    // Insert Products/Services data
    const productsServicesData = {
      userId: userId,
      productsCatalog: [
        { name: 'Product A', description: 'Description for Product A', price: 99.99 },
        { name: 'Product B', description: 'Description for Product B', price: 149.99 }
      ],
      servicesCatalog: [
        { name: 'Service X', description: 'Description for Service X', price: 199.99 },
        { name: 'Service Y', description: 'Description for Service Y', price: 249.99 }
      ],
      uniqueSellingPoints: 'High quality, fast delivery, excellent support',
      pricingStrategy: 'Competitive with premium positioning',
      seasonalProducts: true
    };

    const existingProductsServices = await db.query.productsServices.findFirst({
      where: eq(productsServices.userId, userId)
    });

    if (existingProductsServices) {
      console.log('Products/Services data already exists. Updating...');
      await db.update(productsServices)
        .set(productsServicesData)
        .where(eq(productsServices.userId, userId));
    } else {
      console.log('Inserting new Products/Services data...');
      await db.insert(productsServices).values(productsServicesData);
    }

    // Insert Creative Examples data
    const creativeExamplesData = {
      userId: userId,
      creativeSamples: [
        { type: 'image', url: 'https://example.com/sample1.jpg' },
        { type: 'video', url: 'https://example.com/sample2.mp4' }
      ],
      competitorExamples: [
        { name: 'Competitor A', url: 'https://example.com/competitor1.jpg' },
        { name: 'Competitor B', url: 'https://example.com/competitor2.jpg' }
      ],
      inspirationSources: 'Modern tech websites, minimalist design',
      brandGuidelines: 'https://example.com/brand-guidelines.pdf'
    };

    const existingCreativeExamples = await db.query.creativeExamples.findFirst({
      where: eq(creativeExamples.userId, userId)
    });

    if (existingCreativeExamples) {
      console.log('Creative Examples data already exists. Updating...');
      await db.update(creativeExamples)
        .set(creativeExamplesData)
        .where(eq(creativeExamples.userId, userId));
    } else {
      console.log('Inserting new Creative Examples data...');
      await db.insert(creativeExamples).values(creativeExamplesData);
    }

    // Insert Performance Context data
    const performanceContextData = {
      userId: userId,
      previousPerformance: {
        metrics: [
          { name: 'CTR', value: '2.5%' },
          { name: 'Conversion Rate', value: '3.2%' }
        ],
        timeframe: 'Last 6 months'
      },
      goals: {
        primary: 'Increase sales by 20%',
        secondary: 'Improve brand awareness'
      },
      kpis: ['ROI', 'CPA', 'ROAS'],
      budget: {
        total: 25000,
        allocation: {
          search: 40,
          display: 30,
          social: 30
        }
      }
    };

    const existingPerformanceContext = await db.query.performanceContext.findFirst({
      where: eq(performanceContext.userId, userId)
    });

    if (existingPerformanceContext) {
      console.log('Performance Context data already exists. Updating...');
      await db.update(performanceContext)
        .set(performanceContextData)
        .where(eq(performanceContext.userId, userId));
    } else {
      console.log('Inserting new Performance Context data...');
      await db.insert(performanceContext).values(performanceContextData);
    }

    // Update Onboarding Progress
    const progressData = {
      userId: userId,
      currentStep: 6,
      isComplete: true,
      lastUpdated: new Date()
    };

    const existingProgress = await db.query.onboardingProgress.findFirst({
      where: eq(onboardingProgress.userId, userId)
    });

    if (existingProgress) {
      console.log('Onboarding Progress already exists. Updating...');
      await db.update(onboardingProgress)
        .set(progressData)
        .where(eq(onboardingProgress.userId, userId));
    } else {
      console.log('Inserting new Onboarding Progress data...');
      await db.insert(onboardingProgress).values(progressData);
    }

    console.log('\n✅ Test data insertion successful!');
    return true;
  } catch (error) {
    console.error('Error inserting test data:', error);
    return false;
  }
}

// Function to run the insertion
async function run() {
  try {
    // Get all users
    const allUsers = await db.query.users.findMany();
    
    if (allUsers.length === 0) {
      console.error('No users found in the database. Cannot insert test data.');
      process.exit(1);
    }
    
    console.log(`Found ${allUsers.length} users in the database.`);
    
    // Use the first user for testing
    const testUserId = allUsers[0].id;
    console.log(`Using first user with ID: ${testUserId} for test data.`);
    
    // Insert test data
    const success = await insertTestData(testUserId);
    
    if (success) {
      console.log('\n=== INSTRUCTIONS ===');
      console.log('1. Now you can go to Settings > Compliance > Data Rights');
      console.log('2. Click "Reset Onboarding Data" button to test the reset functionality');
      console.log('3. Run the verification script to check if data was properly deleted');
    } else {
      console.error('\nFailed to insert test data.');
    }
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    // Exit when done
    process.exit(0);
  }
}

// Run the script
run();