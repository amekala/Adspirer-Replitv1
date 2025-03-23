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
);
`;

// Interface for SQL Builder results
export interface SQLBuilderResult {
  data: any[];
  sql: string;
  error?: string;
  fromCache?: boolean;
  fromSummary?: boolean;
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
  
  // Properly type the messages array
  type ChatRole = 'system' | 'user' | 'assistant';
  type Message = { role: ChatRole; content: string };
  
  // Create properly typed messages array with optional context
  const messages: Message[] = [
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
               8. Use snake_case for all column names (user_id, campaign_id, etc.)
               9. For CTR (click-through rate) calculations, use (clicks::float / impressions) * 100
               10. For ROAS (return on ad spend) calculations, use (sales::float / cost) as a direct ratio, not as a percentage
               11. When calculating average ROAS across multiple campaigns, use weighted averages based on cost
               12. All ROAS calculations should be formatted as a direct ratio (e.g., "5.4x") not as a percentage
               13. If revenue information is mentioned in the conversation context (e.g., "revenue is 200"), use that value for the campaigns being discussed, not for random campaigns
               14. When specific campaign IDs are mentioned in the context, prioritize those campaigns in your query results`
    }
  ];
  
  // Add conversation context if available
  if (conversationContext) {
    messages.push({
      role: "system",
      content: `Conversation context (for reference only):\n${conversationContext}`
    });
  }
  
  // Add the user's current query
  messages.push({
    role: "user",
    content: query
  });
  
  // Create the original parameters for generating SQL
  const sqlParams = {
    model: "gpt-4o",
    messages,
    temperature: 0.1, // Lower temperature for more deterministic SQL generation
    max_output_tokens: 500,
  };

  // Format messages for the Responses API
  // The Responses API expects either a string or an array of messages, with system prompts included in the messages
  let formattedInput: any = sqlParams.messages;
  
  // If the input has a mix of user and system messages, make sure they're properly formatted
  // unlike in chat completions API, system messages are just part of the input array
  if (Array.isArray(formattedInput) && formattedInput.some((msg: any) => msg.role === 'system' || msg.role === 'user')) {
    // Responses API accepts messages in this format already, no need to extract system message
    formattedInput = sqlParams.messages;
  }
  
  // Convert to Responses API format
  const responsesParams: any = {
    model: sqlParams.model,
    input: formattedInput,
    temperature: sqlParams.temperature,
    max_output_tokens: sqlParams.max_output_tokens
  };
  
  // Use Responses API
  const response = await openai.responses.create(responsesParams);
  
  // Extract SQL from the response
  const generatedSql = response.output_text?.trim() || '';
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