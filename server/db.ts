import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";
import { env } from "process";
import dotenv from "dotenv";

dotenv.config();

// Parse the environment variables
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log database connection info for debugging (mask credentials)
const dbUrlParts = new URL(databaseUrl);
console.log(`Connecting to database at: ${dbUrlParts.host}${dbUrlParts.pathname} (${process.env.NODE_ENV || 'development'} environment)`);

// Create a postgres client
const client = postgres(databaseUrl);

// Verify connection by checking for required tables
const verifyDbConnection = async () => {
  try {
    // Execute a simple query to check if essential tables exist
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'google_campaign_metrics'
      ) as google_table_exists,
      EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'campaign_metrics'
      ) as amazon_table_exists
    `);
    
    if (result && result[0]) {
      console.log('Database connection verified. Tables existence check:', result[0]);
    } else {
      console.warn('Database connection warning: Could not verify tables existence.');
    }
  } catch (error) {
    console.error('Database connection error during verification:', error.message);
  }
};

// Run the verification asynchronously
setTimeout(verifyDbConnection, 1000);

// Create a drizzle instance
export const db = drizzle(client, { schema });
export { client as pool };
