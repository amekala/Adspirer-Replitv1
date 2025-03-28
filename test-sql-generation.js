// Test SQL generation functionality
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Initialize dotenv
dotenv.config();

// Dynamically import the sqlBuilder module (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modulePath = join(__dirname, 'server', 'services', 'sqlBuilder.ts');
const moduleUrl = pathToFileURL(modulePath).href;

// Array of test queries to evaluate
const testQueries = [
  "How many Google campaigns do I have?",
  "Show me the total clicks and impressions for all my campaigns",
  "What's the average CTR of my Amazon campaigns last month?",
  "Which campaign had the highest conversion rate?",
  "How many impressions did I get from Google campaigns this month?"
];

// Test userId
const testUserId = "test-user-id";

async function runTests() {
  try {
    console.log("Importing SQL Builder module...");
    const { generateSQL, processSQLQuery } = await import(moduleUrl);
    
    console.log("\n=== TESTING SQL GENERATION WITH SAMPLE QUERIES ===\n");
    
    for (const query of testQueries) {
      console.log(`\n>> QUERY: "${query}"`);
      try {
        // Option 1: Call generateSQL directly if available
        if (generateSQL) {
          console.log("Generating SQL directly...");
          const sql = await generateSQL(testUserId, query);
          console.log("Generated SQL:", sql || "No SQL generated");
        }
        
        // Option 2: Call processSQLQuery if available
        if (processSQLQuery) {
          console.log("Processing complete query...");
          const result = await processSQLQuery(testUserId, query);
          console.log("SQL Builder result:", {
            sql: result.sql,
            error: result.error,
            fromFallback: result.fromFallback
          });
        }
      } catch (err) {
        console.error(`Error processing query "${query}":`, err);
      }
      
      console.log("-".repeat(70));
    }
  } catch (err) {
    console.error("Failed to import or execute SQL Builder:", err);
  }
}

// Run the tests
console.log("Starting SQL generation tests...");
runTests().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});