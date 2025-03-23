/**
 * SQL Builder LLM Service
 * 
 * This service acts as a background LLM that converts natural language questions
 * about campaign data into SQL queries, executes them, and returns the data results.
 * 
 * It's designed with a clear separation of concerns from the main chat LLM,
 * operating entirely behind the scenes without the user being aware of its existence.
 */

import OpenAI from 'openai';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { QueryResult } from 'pg';

// Initialize OpenAI client
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not found");
  }
  
  return new OpenAI({
    apiKey
  });
}

// Database schema information to provide context to the LLM
const DB_SCHEMA = `
-- Campaign metrics for Amazon
CREATE TABLE campaign_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  profile_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  ad_group_id TEXT,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  cost NUMERIC,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Google campaign metrics
CREATE TABLE google_campaign_metrics (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  ad_group_id TEXT,
  date DATE NOT NULL,
  impressions INTEGER,
  clicks INTEGER,
  cost NUMERIC,
  conversions INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

// Interface for SQL Builder results
export interface SQLBuilderResult {
  data: any[];
  sql: string;
  error?: string;
}

/**
 * Detect if a user message is asking for campaign data
 * This function identifies patterns in user questions that suggest
 * they're looking for campaign performance data.
 * 
 * @param message - The user's message
 * @returns boolean - Whether this is likely a data query
 */
export function isDataQuery(message: string): boolean {
  // Remove punctuation and convert to lowercase for more reliable matching
  const normalizedMessage = message.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  
  // Common patterns that indicate a data query
  const dataQueryPatterns = [
    // Campaign performance patterns
    /(how|what).*(campaign|campaigns|ads|advertising).*(performance|performing|doing|going|result|metrics)/,
    /(show|tell|give).*(campaign|campaigns|ads).*data/,
    /(how many|total).*(campaign|campaigns|ads)/,
    
    // Metric specific patterns
    /(clicks|impressions|cost|sales|acos|roas|ctr|cpc|conversion|conversions)/,
    
    // Time period patterns
    /(this week|last week|this month|last month|yesterday|today|day|week|month)/,
    
    // Analysis patterns
    /(best|worst|top|highest|lowest).*(campaign|campaigns|performing)/,
    /(amazon|google).*(campaign|campaigns|ads|advertising)/,
    
    // Direct data questions
    /how (are|is) my.*(campaign|campaigns|ads)/
  ];
  
  // Check if any pattern matches
  return dataQueryPatterns.some(pattern => pattern.test(normalizedMessage));
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
    console.log(`SQL Builder processing query from user ${userId}: "${query}"`);
    
    // Step 1: Generate SQL from natural language query
    const sqlQuery = await generateSQL(userId, query);
    console.log(`Generated SQL: ${sqlQuery}`);
    
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
      console.log(`Executing secure SQL: ${secureQuery}`);
      
      // Execute the query
      const result = await db.execute(sql.raw(secureQuery));
      
      // Safely extract rows from the result
      if (result && typeof result === 'object') {
        // PostgreSQL typically returns results with a rows property
        if ('rows' in result && Array.isArray(result.rows)) {
          data = result.rows;
        } 
        // Handle case where result might be the array directly
        else if (Array.isArray(result)) {
          data = result;
        }
      }
      
      console.log(`SQL query returned ${data.length} results`);
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
 * This function is isolated from the main chat flow.
 */
async function generateSQL(userId: string, query: string): Promise<string> {
  const openai = getOpenAIClient();
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an AI specialized in converting natural language questions about advertising campaign data into PostgreSQL SQL queries.
                 
                 You have access to the following database schema:
                 ${DB_SCHEMA}
                 
                 Guidelines:
                 1. Return ONLY the SQL query without any explanation or markdown
                 2. Always include "user_id = '${userId}'" in WHERE clauses for security
                 3. Only write SELECT statements (no INSERT, UPDATE, DELETE)
                 4. Join tables when necessary but keep queries efficient
                 5. Handle time periods intelligently (e.g., last 7 days, last month)
                 6. Format dates properly for PostgreSQL (use CURRENT_DATE for today)
                 7. Use appropriate aggregations (SUM, AVG, COUNT) as needed
                 8. Use snake_case for all column names (user_id, campaign_id, etc.)`
      },
      {
        role: "user",
        content: query
      }
    ],
    temperature: 0.1, // Lower temperature for more deterministic SQL generation
    max_tokens: 500,
  });
  
  const generatedSql = response.choices[0]?.message?.content?.trim() || '';
  return generatedSql;
}

/**
 * Ensures the SQL query has a user_id filter for security
 * This function adds appropriate WHERE conditions if not present.
 */
function ensureUserFilter(query: string, userId: string): string {
  const lowerQuery = query.toLowerCase();
  
  // If query already contains user_id filter, return as-is
  if (lowerQuery.includes(`user_id = '${userId.toLowerCase()}'`) || 
      lowerQuery.includes(`user_id='${userId.toLowerCase()}'`)) {
    return query;
  }
  
  // Add user_id filter based on query structure
  if (lowerQuery.includes('where')) {
    // Add to existing WHERE clause
    return query.replace(/where\s+/i, `WHERE user_id = '${userId}' AND `);
  } else if (lowerQuery.includes('group by')) {
    // Add WHERE before GROUP BY
    return query.replace(/group by/i, `WHERE user_id = '${userId}' GROUP BY`);
  } else if (lowerQuery.includes('order by')) {
    // Add WHERE before ORDER BY
    return query.replace(/order by/i, `WHERE user_id = '${userId}' ORDER BY`);
  } else if (lowerQuery.includes('limit')) {
    // Add WHERE before LIMIT
    return query.replace(/limit/i, `WHERE user_id = '${userId}' LIMIT`);
  } else {
    // No obvious place, add before end of query
    if (query.endsWith(';')) {
      return query.replace(/;$/, ` WHERE user_id = '${userId}';`);
    } else {
      return `${query} WHERE user_id = '${userId}'`;
    }
  }
}