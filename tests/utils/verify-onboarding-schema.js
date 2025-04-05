/**
 * Utility to verify onboarding database schema
 * 
 * This script tests:
 * 1. Existence of all onboarding tables
 * 2. Verifies column structure for each table
 * 3. Validates schema consistency
 * 
 * Run with: node tests/utils/verify-onboarding-schema.js
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a PostgreSQL client
const client = postgres(process.env.DATABASE_URL);

// Expected tables for onboarding
const onboardingTables = [
  'business_core',
  'brand_identity',
  'products_services',
  'creative_examples',
  'performance_context',
  'onboarding_progress'
];

// Check if all expected tables exist
async function checkOnboardingTables() {
  console.log('=== CHECKING ONBOARDING DATABASE SCHEMA ===\n');
  
  try {
    // Get all tables in the database
    const tableResult = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const existingTables = tableResult.map(row => row.table_name);
    
    console.log('Found tables in database:', existingTables.join(', '));
    
    // Check for each expected table
    const missingTables = [];
    for (const tableName of onboardingTables) {
      if (!existingTables.includes(tableName)) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing onboarding tables:', missingTables.join(', '));
    } else {
      console.log('\n✅ All expected onboarding tables exist');
    }
    
    // Check the structure of each table
    for (const tableName of onboardingTables) {
      if (existingTables.includes(tableName)) {
        await checkTableColumns(tableName);
      }
    }
    
    return missingTables.length === 0;
  } catch (error) {
    console.error('Error checking onboarding tables:', error);
    return false;
  } finally {
    // Close the connection
    await client.end();
  }
}

// Check the columns in a table
async function checkTableColumns(tableName) {
  try {
    const columnResult = await client`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
    `;
    
    console.log(`\n--- Table: ${tableName} ---`);
    console.log('Columns:');
    
    // Print column details
    columnResult.forEach(column => {
      console.log(`- ${column.column_name}: ${column.data_type} ${column.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });
    
    // Verify minimum required columns
    const columnNames = columnResult.map(row => row.column_name);
    const requiredColumns = ['user_id', 'created_at'];
    const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing required columns: ${missingColumns.join(', ')}`);
      return false;
    } else {
      console.log('✅ All required columns present');
      return true;
    }
  } catch (error) {
    console.error(`Error checking columns for table ${tableName}:`, error);
    return false;
  }
}

// Run the verification
checkOnboardingTables()
  .then(success => {
    if (success) {
      console.log('\n=== DATABASE SCHEMA VERIFICATION COMPLETED SUCCESSFULLY ===');
    } else {
      console.log('\n=== DATABASE SCHEMA VERIFICATION COMPLETED WITH ERRORS ===');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unhandled error in schema verification:', error);
    process.exit(1);
  });