/**
 * SQL Builder LLM Service
 * 
 * This service acts as a secondary LLM that specializes in converting natural language
 * questions about campaign data into SQL queries, executing them, and returning the results.
 */

import OpenAI from 'openai';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Database schema information to provide context to the LLM
const DB_SCHEMA = `
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL
);

-- Amazon Tokens table
CREATE TABLE amazon_tokens (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  accessToken TEXT NOT NULL,
  refreshToken TEXT NOT NULL,
  tokenScope TEXT,
  expiresAt TIMESTAMP NOT NULL,
  lastRefreshed TIMESTAMP NOT NULL,
  isActive BOOLEAN DEFAULT true
);

-- Advertiser accounts (Amazon Advertising profiles)
CREATE TABLE advertiser_accounts (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  profileId TEXT NOT NULL,
  accountName TEXT NOT NULL,
  marketplace TEXT NOT NULL,
  accountType TEXT,
  status TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastSynced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign metrics for Amazon
CREATE TABLE campaign_metrics (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  profileId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  campaignName TEXT NOT NULL,
  campaignStatus TEXT,
  campaignType TEXT,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  cost NUMERIC,
  orders INTEGER,
  sales NUMERIC,
  acos NUMERIC,
  roas NUMERIC,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google advertiser accounts
CREATE TABLE google_advertiser_accounts (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  customerId TEXT NOT NULL,
  accountName TEXT NOT NULL,
  status TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lastSynced TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google campaign metrics
CREATE TABLE google_campaign_metrics (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id),
  customerId TEXT NOT NULL,
  campaignId TEXT NOT NULL,
  campaignName TEXT NOT NULL,
  campaignStatus TEXT,
  campaignType TEXT,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  cost NUMERIC,
  conversions NUMERIC,
  conversionValue NUMERIC,
  ctr NUMERIC,
  cpc NUMERIC,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// Common query templates the LLM can reference
const QUERY_TEMPLATES = `
-- Get total count of Amazon campaigns for a user
SELECT COUNT(DISTINCT campaignId) FROM campaign_metrics WHERE userId = ?;

-- Get total count of Google campaigns for a user
SELECT COUNT(DISTINCT campaignId) FROM google_campaign_metrics WHERE userId = ?;

-- Get Amazon campaign performance metrics for last 30 days
SELECT 
  campaignName, 
  SUM(impressions) as total_impressions, 
  SUM(clicks) as total_clicks, 
  SUM(cost) as total_cost, 
  SUM(orders) as total_orders, 
  SUM(sales) as total_sales,
  CASE 
    WHEN SUM(cost) > 0 THEN SUM(sales)/SUM(cost) 
    ELSE 0 
  END as roas,
  CASE 
    WHEN SUM(sales) > 0 THEN (SUM(cost)/SUM(sales))*100 
    ELSE 0 
  END as acos
FROM campaign_metrics 
WHERE userId = ? AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY campaignName
ORDER BY total_sales DESC;

-- Get Google campaign performance metrics for last 30 days
SELECT 
  campaignName, 
  SUM(impressions) as total_impressions, 
  SUM(clicks) as total_clicks, 
  SUM(cost) as total_cost,
  SUM(conversions) as total_conversions,
  SUM(conversionValue) as total_conversion_value,
  CASE 
    WHEN SUM(cost) > 0 THEN SUM(conversionValue)/SUM(cost) 
    ELSE 0 
  END as roas
FROM google_campaign_metrics 
WHERE userId = ? AND date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY campaignName
ORDER BY total_conversion_value DESC;
`;

interface SQLBuilderResult {
  data: any[];
  sql: string;
  error?: string;
}

/**
 * Processes a user's natural language query about campaign data by:
 * 1. Sending the query to OpenAI to convert it to SQL
 * 2. Executing the generated SQL against the database
 * 3. Returning the results and the SQL for transparency
 * 
 * @param userId - The user ID to filter data by
 * @param query - Natural language question about campaign data
 * @returns The query results and SQL used
 */
export async function processSQLQuery(userId: string, query: string): Promise<SQLBuilderResult> {
  try {
    // Step 1: Generate SQL from natural language query
    const sqlQuery = await generateSQL(userId, query);
    
    // Step 2: Execute the SQL query
    let data: any[] = [];
    let error: string | undefined = undefined;
    
    try {
      // Add safety check - ensure the query only contains SELECT statements
      if (!sqlQuery.trim().toLowerCase().startsWith('select')) {
        throw new Error('Only SELECT queries are allowed for security reasons');
      }
      
      // Add userId filter if not present to ensure data isolation
      const secureQuery = ensureUserFilter(sqlQuery, userId);
      
      // Execute the query
      data = await db.execute(sql.raw(secureQuery));
    } catch (err: any) {
      error = `SQL execution error: ${err.message}`;
      console.error("SQL execution error:", err);
    }
    
    return {
      data,
      sql: sqlQuery,
      error
    };
  } catch (err: any) {
    console.error("Error in SQL builder service:", err);
    return {
      data: [],
      sql: '',
      error: `SQL builder error: ${err.message}`
    };
  }
}

/**
 * Uses OpenAI to generate SQL from a natural language query
 */
async function generateSQL(userId: string, query: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an AI assistant specialized in converting natural language questions 
                  about advertising campaign data into SQL queries. You have access to the 
                  following PostgreSQL database schema:
                  
                  ${DB_SCHEMA}
                  
                  You can reference these query templates for common requests:
                  
                  ${QUERY_TEMPLATES}
                  
                  Important guidelines:
                  1. ONLY return the SQL query without any explanation or markdown formatting
                  2. Always include userId = '${userId}' filter in WHERE clauses to ensure data isolation
                  3. Use only SELECT statements for security - no INSERT, UPDATE, DELETE, etc.
                  4. Ensure queries are optimized for PostgreSQL
                  5. Handle time periods intelligently (last 7 days, last month, etc.)
                  6. Join tables when necessary to provide comprehensive information`
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.1, // Lower temperature for more deterministic SQL generation
    max_tokens: 1000,
  });
  
  const generatedSql = response.choices[0]?.message?.content?.trim() || '';
  return generatedSql;
}

/**
 * Ensures the SQL query has a userId filter for security
 */
function ensureUserFilter(query: string, userId: string): string {
  // This is a simplified implementation
  // In a production environment, this would use a proper SQL parser
  const lowerQuery = query.toLowerCase();
  
  if (!lowerQuery.includes('userid') && !lowerQuery.includes('user_id') && !lowerQuery.includes('user id')) {
    // If query has a WHERE clause, add to it
    if (lowerQuery.includes('where')) {
      return query.replace(/where/i, `WHERE userId = '${userId}' AND `);
    } 
    // Otherwise, add a WHERE clause
    else if (lowerQuery.includes('group by')) {
      return query.replace(/group by/i, `WHERE userId = '${userId}' GROUP BY`);
    } 
    else if (lowerQuery.includes('order by')) {
      return query.replace(/order by/i, `WHERE userId = '${userId}' ORDER BY`);
    }
    // If no obvious place to insert, add before semicolon or at end
    else {
      return query.replace(/;$/, ` WHERE userId = '${userId}';`);
    }
  }
  
  return query;
}