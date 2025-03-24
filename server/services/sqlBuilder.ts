/**
 * SQL Builder LLM Service
 * 
 * This service acts as a background LLM that converts natural language questions
 * about campaign data into SQL queries, executes them, and returns the data results.
 * 
 * It's designed with a clear separation of concerns from the main chat LLM,
 * operating entirely behind the scenes without the user being aware of its existence.
 * 
 * This service is now integrated with the Query Cache system to optimize performance
 * for repeated or similar queries.
 */

import OpenAI from 'openai';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { QueryResult } from 'pg';
import * as QueryCache from './queryCache';

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
);`;

// Interface for SQL Builder results
export interface SQLBuilderResult {
  data: any[];
  sql: string;
  error?: string;
  fromCache?: boolean;
  fromSummary?: boolean;
  fromFallback?: boolean;
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
 * 1. Checking if a cached response exists for similar queries
 * 2. If not cached, checking if pre-computed summaries are available
 * 3. If summaries not applicable, generating SQL with OpenAI
 * 4. Executing the SQL query against the database
 * 5. Caching the result for future similar queries
 * 6. Returning the results and the SQL for transparency
 * 
 * @param userId - The user ID to filter data by
 * @param query - Natural language question about campaign data
 * @param conversationContext - Optional conversation history for context
 * @returns The query results and SQL used
 */
export async function processSQLQuery(
  userId: string, 
  query: string, 
  conversationContext?: string
): Promise<SQLBuilderResult> {
  try {
    console.log(`SQL Builder processing query from user ${userId}: "${query}"`);
    
    // Check if this is a complex query that should bypass caching and summaries
    const isComplex = QueryCache.isComplexQuery(query);
    
    // Step 1: For non-complex queries, check if this query is in the cache
    if (!isComplex) {
      const cachedResponse = await QueryCache.getCachedResponse(query, userId);
      if (cachedResponse) {
        console.log(`Using cached response for query: "${query}"`);
        return {
          data: cachedResponse.data,
          sql: cachedResponse.sql,
          fromCache: true
        };
      }
    } else {
      console.log(`Complex query detected, bypassing cache: "${query}"`);
    }
    
    // Step 2: For non-complex queries, check if metrics summaries can be used
    if (!isComplex && QueryCache.containsMetricTerms(query)) {
      console.log('Query contains metric terms, checking pre-computed summaries');
      const summaries = await QueryCache.getCampaignMetricsSummaries(userId, query);
      
      if (summaries && summaries.length > 0) {
        console.log(`Found ${summaries.length} pre-computed summary groups`);
        
        // Format the summaries for display
        const formattedData = QueryCache.formatSummariesForDisplay(summaries);
        
        // Generate insights from the summaries
        const insights = QueryCache.generateInsights(formattedData);
        
        // Add insights to the formattedData array
        const enhancedData = [...formattedData];
        
        // Cache this response
        await QueryCache.cacheResponse(query, userId, {
          data: enhancedData,
          sql: 'Used pre-computed metrics summaries',
          fromSummary: true
        });
        
        return {
          data: formattedData,  // Use the properly formatted array data
          sql: 'Used pre-computed metrics summaries',
          fromSummary: true
        };
      }
    }
    
    // Step 3: Generate SQL from natural language query if not in cache or no summaries
    const sqlQuery = await generateSQL(userId, query, conversationContext);
    console.log(`Generated SQL: ${sqlQuery}`);
    
    // Step 4: Execute the SQL query
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
      
      // Step 5: Cache the result for future queries if successful
      if (!error && data.length > 0) {
        await QueryCache.cacheResponse(query, userId, {
          data,
          sql: sqlQuery
        });
      }
    } catch (err: any) {
      // Record the original error
      error = `SQL execution error: ${err.message}`;
      console.error("SQL execution error:", err);
      
      // Check if this is a "only SELECT queries allowed" error or a syntax error
      const isNonSelectError = err.message.includes("Only SELECT queries are allowed");
      const isSyntaxError = err.message.includes("syntax error");
      
      if ((isNonSelectError || isSyntaxError) && conversationContext) {
        try {
          // Determine the appropriate retry approach
          let retryPrompt = "";
          
          if (isNonSelectError) {
            console.log("Non-SELECT query detected, generating a proper SELECT statement...");
            retryPrompt = `The previous response was not a proper SQL query. YOU MUST RETURN ONLY A VALID SQL QUERY that starts with SELECT. 
            
            For this request: "${query}"
            
            DO NOT:
            - Return an analysis, explanation, or commentary
            - Start with anything other than the SELECT keyword
            - Include markdown or code blocks
            - Return multiple queries
            
            Just the raw SQL statement like: SELECT... FROM... WHERE...`;
          } else {
            console.log("SQL syntax error detected, attempting to generate a simpler query...");
            retryPrompt = `The previous SQL query had a syntax error. Please generate a simpler query without UNION or complex joins for: "${query}"`;
          }
          
          // Generate a new SQL query with a much stronger instruction
          const simplifiedSql = await generateSQL(userId, retryPrompt, conversationContext);
          
          // Extra verification that we have a SELECT statement
          if (!simplifiedSql.trim().toLowerCase().startsWith('select')) {
            console.log("Retry failed: Still not a proper SELECT statement");
            
            // Make a last attempt with a hardcoded basic query if everything else failed
            const basicQuery = `SELECT campaign_id, SUM(impressions) as total_impressions, 
                               SUM(clicks) as total_clicks, SUM(cost) as total_cost,
                               (SUM(clicks)::float / NULLIF(SUM(impressions), 0)) * 100 as ctr
                               FROM campaign_metrics 
                               WHERE user_id = '${userId}'
                               GROUP BY campaign_id
                               ORDER BY total_impressions DESC
                               LIMIT 10`;
                               
            console.log("Using basic fallback query instead:", basicQuery);
            
            // Execute the basic query
            const fallbackResult = await db.execute(sql.raw(basicQuery));
            
            // Extract rows
            if (fallbackResult && typeof fallbackResult === 'object') {
              if ('rows' in fallbackResult && Array.isArray(fallbackResult.rows)) {
                data = fallbackResult.rows;
              } else if (Array.isArray(fallbackResult)) {
                data = fallbackResult;
              }
            }
            
            // Return the fallback results
            if (data.length > 0) {
              console.log(`Fallback query returned ${data.length} results`);
              return {
                data,
                sql: basicQuery,
                error: undefined,
                fromFallback: true
              };
            }
          } else {
            // We have a proper SELECT, continue with normal flow
            const secureRetryQuery = ensureUserFilter(simplifiedSql, userId);
            console.log(`Executing retry SQL: ${secureRetryQuery}`);
            
            // Try executing the simplified query
            const retryResult = await db.execute(sql.raw(secureRetryQuery));
            
            // Extract rows from retry result
            if (retryResult && typeof retryResult === 'object') {
              if ('rows' in retryResult && Array.isArray(retryResult.rows)) {
                data = retryResult.rows;
              } else if (Array.isArray(retryResult)) {
                data = retryResult;
              }
            }
            
            // If successful, update the SQL query for the return value
            if (data.length > 0) {
              console.log(`Retry SQL query successful, returned ${data.length} results`);
              error = undefined; // Clear the error since we succeeded
              return {
                data,
                sql: simplifiedSql,
                error: undefined
              };
            }
          }
        } catch (retryErr: any) {
          console.error("Retry also failed:", retryErr?.message || "Unknown error");
          // We keep the original error if the retry also fails
        }
      }
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
 * 
 * @param userId - The user ID for filtering data
 * @param query - The natural language query to convert to SQL
 * @param conversationContext - Optional previous conversation for context
 * @returns Generated SQL query string
 */
async function generateSQL(
  userId: string, 
  query: string, 
  conversationContext?: string
): Promise<string> {
  const openai = getOpenAIClient();
  
  // Format the input for the Responses API
  const input = [
    {
      role: "developer",
      content: `You are an AI specialized in converting natural language questions about advertising campaign data into PostgreSQL SQL queries.
               
               You have access to the following database schema:
               ${DB_SCHEMA}
               
               CRITICAL INSTRUCTIONS:
               1. Return ONLY the valid PostgreSQL SQL query - nothing else
               2. No explanations, no markdown, no prose, just the raw SQL
               3. Begin with SELECT keyword - NEVER return analysis or text without valid SQL
               4. Do not include backticks (```) or "sql" markers
               5. NEVER respond with things like "Here's the SQL query" or "Let me analyze..."
               
               Query Security:
               1. Always include "user_id = '${userId}'" in WHERE clauses for security
               2. Only write SELECT statements (no INSERT, UPDATE, DELETE)
               
               Technical Guidelines:
               1. Join tables when necessary but keep queries efficient
               2. Handle time periods intelligently (e.g., last 7 days, last month)
               3. Format dates properly for PostgreSQL (use CURRENT_DATE for today)
               4. Use appropriate aggregations (SUM, AVG, COUNT) as needed
               5. Use snake_case for all column names (user_id, campaign_id, etc.)
               6. For CTR (click-through rate) calculations, use (clicks::float / impressions) * 100
               7. For ROAS (return on ad spend) calculations, use (sales::float / cost) as a direct ratio
               8. When calculating average ROAS across multiple campaigns, use weighted averages based on cost
               9. If revenue information is mentioned in the conversation context (e.g., "revenue is 200"), use that value for the campaigns being discussed
               10. When specific campaign IDs are mentioned in the context, prioritize those campaigns in your query results
               
               If the user is asking for a narrative or analysis instead of raw data, still return an appropriate SQL query that will fetch the data needed for that analysis. DO NOT WRITE THE ANALYSIS ITSELF.`
    }
  ];
  
  // Add conversation context if available
  if (conversationContext) {
    input.push({
      role: "developer",
      content: `Conversation context (for reference only):\n${conversationContext}`
    });
  }
  
  // Add the user's current query
  input.push({
    role: "user",
    content: query
  });
  
  // Using Responses API format
  // Note: Input is already correctly formatted for the Responses API
  // The Responses API uses 'developer' for system prompts instead of 'system'
  
  // Using Responses API
  const response = await openai.responses.create({
    model: "gpt-4o",
    input: input, // Use the original input array that's already properly formatted
    temperature: 0.1, // Lower temperature for more deterministic SQL generation
    max_output_tokens: 500,
    text: {
      format: {
        type: "text"
      }
    },
    reasoning: {},
    store: true
  });
  
  // Extract SQL from the response
  let generatedSql = response.output_text?.trim() || '';
  
  // Remove any markdown SQL code block formatting if present
  if (generatedSql.includes('```sql')) {
    // Extract SQL from a markdown code block
    const sqlMatch = generatedSql.match(/```sql\s*([\s\S]*?)\s*```/);
    if (sqlMatch && sqlMatch[1]) {
      generatedSql = sqlMatch[1].trim();
    }
  } else if (generatedSql.includes('```')) {
    // Extract from a generic code block 
    const codeMatch = generatedSql.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch && codeMatch[1]) {
      generatedSql = codeMatch[1].trim();
    }
  }
  
  // Remove any explanatory text before the SELECT statement
  const selectIndex = generatedSql.toLowerCase().indexOf('select');
  if (selectIndex > 0) {
    generatedSql = generatedSql.substring(selectIndex);
  }
  
  console.log("Cleaned SQL:", generatedSql);
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