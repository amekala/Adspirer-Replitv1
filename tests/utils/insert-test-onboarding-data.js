/**
 * Utility to directly insert test data into onboarding tables
 * 
 * This script:
 * 1. Connects to the database
 * 2. Inserts test data into all onboarding tables
 * 3. Updates onboarding progress
 * 
 * Run with: node tests/utils/insert-test-onboarding-data.js
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// User email for testing
const USER_EMAIL = 'abhilashreddi@gmail.com';

// Test data for each onboarding step
const testData = {
  businessCore: {
    businessName: "Test Business Direct",
    industry: "E-Commerce",
    companySize: "11-50",
    marketplaces: ["Amazon", "Walmart", "eBay"],
    mainGoals: ["Increase Sales", "Improve ROAS", "Brand Awareness"],
    monthlyAdSpend: "$5,000 - $20,000",
    website: "https://testbusiness.com"
  },
  
  brandIdentity: {
    brandName: "TestBrand Direct",
    brandDescription: "A premium brand focused on quality products for active lifestyles",
    brandVoice: ["Professional", "Friendly", "Inspirational"],
    targetAudience: ["Millennials", "Health Enthusiasts", "Professionals"],
    brandValues: ["Quality", "Innovation", "Sustainability"],
    primaryColor: "#4B0082",
    secondaryColor: "#E6E6FA",
    logoUrl: "https://example.com/logo.png"
  },
  
  productsServices: {
    productTypes: ["Physical Products", "Digital Products", "Services"],
    topSellingProducts: [
      {
        name: "Premium Fitness Tracker Direct",
        description: "Advanced health and fitness monitoring",
        price: "$129.99",
        category: "Electronics"
      },
      {
        name: "Eco-Friendly Water Bottle",
        description: "Sustainable and stylish hydration",
        price: "$34.99",
        category: "Lifestyle"
      }
    ],
    pricingStrategy: "Premium",
    competitiveAdvantage: ["Quality", "Customer Service", "Sustainability"],
    targetMarkets: ["North America", "Europe", "Australia"]
  },
  
  creativeExamples: {
    adExamples: [
      {
        title: "Summer Campaign Direct",
        description: "Product showcase featuring sustainable packaging",
        imageUrl: "https://example.com/ad1.jpg",
        performanceNotes: "High CTR but low conversion rate"
      },
      {
        title: "Winter Campaign",
        description: "Customer testimonial video highlighting product benefits",
        imageUrl: "https://example.com/ad2.mp4",
        performanceNotes: "Strong ROAS of 5.2"
      }
    ],
    preferredAdFormats: ["Video", "Responsive Display", "Search"],
    brandGuidelines: {
      doUse: ["High-quality imagery", "Consistent brand colors", "Clear value proposition"],
      dontUse: ["Stock photos without editing", "Cluttered layouts", "Generic messaging"]
    }
  },
  
  performanceContext: {
    currentPerformance: {
      ROI: "12%",
      ACOS: "28%",
      CTR: "1.8%",
      ConversionRate: "3.2%"
    },
    keyMetrics: ["ROI", "ACOS", "CTR", "Conversion Rate"],
    performanceGoals: {
      ROI: "18%",
      ACOS: "22%",
      CTR: "2.5%",
      ConversionRate: "4.5%"
    },
    seasonalTrends: [
      {
        season: "Holiday Direct",
        performance: "35% increase in sales",
        notes: "Higher competition for ad space during November-December"
      },
      {
        season: "Back to School",
        performance: "20% increase in sales",
        notes: "Increased traffic in August-September for certain product categories"
      }
    ],
    benchmarks: {
      industry: {
        ROI: "10%",
        ACOS: "30%",
        CTR: "1.5%"
      }
    }
  }
};

// Get user ID from email
async function getUserIdFromEmail(email) {
  try {
    const query = 'SELECT id FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    if (result.rows.length > 0) {
      return result.rows[0].id;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// Insert data into business_core table
async function insertBusinessCore(userId) {
  const data = testData.businessCore;
  
  try {
    // First, check if data already exists
    const checkQuery = 'SELECT id FROM business_core WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Business Core data already exists. Updating...');
      
      // Update existing data
      const updateQuery = `
        UPDATE business_core 
        SET 
          business_name = $1,
          industry = $2,
          company_size = $3,
          marketplaces = $4,
          main_goals = $5,
          monthly_ad_spend = $6,
          website = $7,
          updated_at = NOW()
        WHERE user_id = $8
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [
        data.businessName,
        data.industry,
        data.companySize,
        JSON.stringify(data.marketplaces),
        JSON.stringify(data.mainGoals),
        data.monthlyAdSpend,
        data.website,
        userId
      ]);
      
      console.log('Business Core data updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new data
      const insertQuery = `
        INSERT INTO business_core 
          (user_id, business_name, industry, company_size, marketplaces, main_goals, monthly_ad_spend, website, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [
        userId,
        data.businessName,
        data.industry,
        data.companySize,
        JSON.stringify(data.marketplaces),
        JSON.stringify(data.mainGoals),
        data.monthlyAdSpend,
        data.website
      ]);
      
      console.log('Business Core data inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error inserting/updating Business Core data:', error);
    return null;
  }
}

// Insert data into brand_identity table
async function insertBrandIdentity(userId) {
  const data = testData.brandIdentity;
  
  try {
    // First, check if data already exists
    const checkQuery = 'SELECT id FROM brand_identity WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Brand Identity data already exists. Updating...');
      
      // Update existing data
      const updateQuery = `
        UPDATE brand_identity 
        SET 
          brand_name = $1,
          brand_description = $2,
          brand_voice = $3,
          target_audience = $4,
          brand_values = $5,
          primary_color = $6,
          secondary_color = $7,
          logo_url = $8,
          updated_at = NOW()
        WHERE user_id = $9
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [
        data.brandName,
        data.brandDescription,
        JSON.stringify(data.brandVoice),
        JSON.stringify(data.targetAudience),
        JSON.stringify(data.brandValues),
        data.primaryColor,
        data.secondaryColor,
        data.logoUrl,
        userId
      ]);
      
      console.log('Brand Identity data updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new data
      const insertQuery = `
        INSERT INTO brand_identity 
          (user_id, brand_name, brand_description, brand_voice, target_audience, brand_values, primary_color, secondary_color, logo_url, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [
        userId,
        data.brandName,
        data.brandDescription,
        JSON.stringify(data.brandVoice),
        JSON.stringify(data.targetAudience),
        JSON.stringify(data.brandValues),
        data.primaryColor,
        data.secondaryColor,
        data.logoUrl
      ]);
      
      console.log('Brand Identity data inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error inserting/updating Brand Identity data:', error);
    return null;
  }
}

// Insert data into products_services table
async function insertProductsServices(userId) {
  const data = testData.productsServices;
  
  try {
    // First, check if data already exists
    const checkQuery = 'SELECT id FROM products_services WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Products/Services data already exists. Updating...');
      
      // Update existing data
      const updateQuery = `
        UPDATE products_services 
        SET 
          product_types = $1,
          top_selling_products = $2,
          pricing_strategy = $3,
          competitive_advantage = $4,
          target_markets = $5,
          updated_at = NOW()
        WHERE user_id = $6
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [
        JSON.stringify(data.productTypes),
        JSON.stringify(data.topSellingProducts),
        data.pricingStrategy,
        JSON.stringify(data.competitiveAdvantage),
        JSON.stringify(data.targetMarkets),
        userId
      ]);
      
      console.log('Products/Services data updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new data
      const insertQuery = `
        INSERT INTO products_services 
          (user_id, product_types, top_selling_products, pricing_strategy, competitive_advantage, target_markets, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [
        userId,
        JSON.stringify(data.productTypes),
        JSON.stringify(data.topSellingProducts),
        data.pricingStrategy,
        JSON.stringify(data.competitiveAdvantage),
        JSON.stringify(data.targetMarkets)
      ]);
      
      console.log('Products/Services data inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error inserting/updating Products/Services data:', error);
    return null;
  }
}

// Insert data into creative_examples table
async function insertCreativeExamples(userId) {
  const data = testData.creativeExamples;
  
  try {
    // First, check if data already exists
    const checkQuery = 'SELECT id FROM creative_examples WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Creative Examples data already exists. Updating...');
      
      // Update existing data
      const updateQuery = `
        UPDATE creative_examples 
        SET 
          ad_examples = $1,
          preferred_ad_formats = $2,
          brand_guidelines = $3,
          updated_at = NOW()
        WHERE user_id = $4
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [
        JSON.stringify(data.adExamples),
        JSON.stringify(data.preferredAdFormats),
        JSON.stringify(data.brandGuidelines),
        userId
      ]);
      
      console.log('Creative Examples data updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new data
      const insertQuery = `
        INSERT INTO creative_examples 
          (user_id, ad_examples, preferred_ad_formats, brand_guidelines, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [
        userId,
        JSON.stringify(data.adExamples),
        JSON.stringify(data.preferredAdFormats),
        JSON.stringify(data.brandGuidelines)
      ]);
      
      console.log('Creative Examples data inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error inserting/updating Creative Examples data:', error);
    return null;
  }
}

// Insert data into performance_context table
async function insertPerformanceContext(userId) {
  const data = testData.performanceContext;
  
  try {
    // First, check if data already exists
    const checkQuery = 'SELECT id FROM performance_context WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Performance Context data already exists. Updating...');
      
      // Update existing data
      const updateQuery = `
        UPDATE performance_context 
        SET 
          current_performance = $1,
          key_metrics = $2,
          performance_goals = $3,
          seasonal_trends = $4,
          benchmarks = $5,
          updated_at = NOW()
        WHERE user_id = $6
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [
        JSON.stringify(data.currentPerformance),
        JSON.stringify(data.keyMetrics),
        JSON.stringify(data.performanceGoals),
        JSON.stringify(data.seasonalTrends),
        JSON.stringify(data.benchmarks),
        userId
      ]);
      
      console.log('Performance Context data updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new data
      const insertQuery = `
        INSERT INTO performance_context 
          (user_id, current_performance, key_metrics, performance_goals, seasonal_trends, benchmarks, created_at, updated_at)
        VALUES 
          ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [
        userId,
        JSON.stringify(data.currentPerformance),
        JSON.stringify(data.keyMetrics),
        JSON.stringify(data.performanceGoals),
        JSON.stringify(data.seasonalTrends),
        JSON.stringify(data.benchmarks)
      ]);
      
      console.log('Performance Context data inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error inserting/updating Performance Context data:', error);
    return null;
  }
}

// Update onboarding progress to completed
async function updateOnboardingProgress(userId) {
  try {
    // First, check if progress record exists
    const checkQuery = 'SELECT id FROM onboarding_progress WHERE user_id = $1';
    const checkResult = await pool.query(checkQuery, [userId]);
    
    if (checkResult.rows.length > 0) {
      console.log('Onboarding progress record exists. Updating...');
      
      // Update existing record
      const updateQuery = `
        UPDATE onboarding_progress 
        SET 
          current_step = 6,
          completed = true,
          updated_at = NOW()
        WHERE user_id = $1
        RETURNING *;
      `;
      
      const updateResult = await pool.query(updateQuery, [userId]);
      
      console.log('Onboarding progress updated ✅');
      return updateResult.rows[0];
    } else {
      // Insert new progress record
      const insertQuery = `
        INSERT INTO onboarding_progress 
          (user_id, current_step, completed, created_at, updated_at)
        VALUES 
          ($1, 6, true, NOW(), NOW())
        RETURNING *;
      `;
      
      const insertResult = await pool.query(insertQuery, [userId]);
      
      console.log('Onboarding progress inserted ✅');
      return insertResult.rows[0];
    }
  } catch (error) {
    console.error('Error updating onboarding progress:', error);
    return null;
  }
}

// Main function to insert all test data
async function insertAllTestData() {
  console.log('=== INSERTING TEST ONBOARDING DATA ===\n');
  
  try {
    // Get user ID
    const userId = await getUserIdFromEmail(USER_EMAIL);
    
    if (!userId) {
      console.error(`Could not find user ID for email ${USER_EMAIL}`);
      return false;
    }
    
    console.log(`Found user ID: ${userId} for email: ${USER_EMAIL}`);
    
    // Insert data for each step
    console.log('\n--- Step 1: Business Core ---');
    const businessCoreResult = await insertBusinessCore(userId);
    
    console.log('\n--- Step 3: Brand Identity ---');
    const brandIdentityResult = await insertBrandIdentity(userId);
    
    console.log('\n--- Step 4: Products/Services ---');
    const productsServicesResult = await insertProductsServices(userId);
    
    console.log('\n--- Step 5: Creative Examples ---');
    const creativeExamplesResult = await insertCreativeExamples(userId);
    
    console.log('\n--- Step 6: Performance Context ---');
    const performanceContextResult = await insertPerformanceContext(userId);
    
    console.log('\n--- Updating Onboarding Progress ---');
    const progressResult = await updateOnboardingProgress(userId);
    
    // Final summary
    console.log('\n=== DATA INSERTION SUMMARY ===\n');
    console.log(`Business Core: ${businessCoreResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Brand Identity: ${brandIdentityResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Products/Services: ${productsServicesResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Creative Examples: ${creativeExamplesResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Performance Context: ${performanceContextResult ? '✅ Success' : '❌ Failed'}`);
    console.log(`Onboarding Progress: ${progressResult ? '✅ Success' : '❌ Failed'}`);
    
    const allSuccess = 
      businessCoreResult && 
      brandIdentityResult && 
      productsServicesResult && 
      creativeExamplesResult && 
      performanceContextResult &&
      progressResult;
    
    console.log(`\nOverall result: ${allSuccess ? '✅ ALL DATA INSERTED SUCCESSFULLY' : '❌ SOME INSERTIONS FAILED'}`);
    
    return allSuccess;
  } catch (error) {
    console.error('Error inserting test data:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Run the data insertion
insertAllTestData().catch(error => {
  console.error('Unhandled error during data insertion:', error);
  process.exit(1);
});