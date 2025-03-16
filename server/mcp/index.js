import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import postgres from 'postgres';

// Create an MCP server instance
const server = new McpServer({
  name: "Adspirer MCP",
  version: "1.0.0"
}, {
  capabilities: {
    resources: {
      schemes: [
        "campaigns",
        "amazon-profiles",
        "amazon-accounts", 
        "google-accounts",
        "google-campaigns"
      ]
    }
  }
});

// Error codes
const ErrorCodes = {
  InvalidApiKey: -32001,
  DatabaseError: -32002,
  ValidationError: -32003
};

// Database connection with retry logic
const maxRetries = 3;
const retryDelay = 5000; // 5 seconds

async function connectWithRetry(retries = maxRetries) {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_WiCH5ywPK8ta@ep-lucky-hat-a4m2qapz.us-east-1.aws.neon.tech/neondb?sslmode=require', {
      max: 10, // connection pool size
      idle_timeout: 30000, // 30 second idle timeout
      connect_timeout: 10000, // 10 second connection timeout
      ssl: {
        rejectUnauthorized: false // Required for Neon database
      }
    });

    // Test the connection
    await sql`SELECT 1`;
    console.log("Connected to Adspirer database");
    return sql;
  } catch (error) {
    if (retries > 0) {
      console.log(`Database connection failed, retrying in ${retryDelay/1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return connectWithRetry(retries - 1);
    }
    throw error;
  }
}

let sql;
try {
  sql = await connectWithRetry();
} catch (error) {
  console.error('Failed to initialize database connection:', error);
  process.exit(1);
}

function reportProgress(progress, message, percentage) {
  if (progress?.onProgress) {
    progress.onProgress({
      message,
      percentage
    });
  }
}

// Helper function to retry database operations
async function withRetry(operation, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff, max 5s
        console.log(`Operation failed, retrying in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// API key validation with error handling and retry
async function validateApiKey(apiKey) {
  try {
    const [key] = await withRetry(async () => {
      const result = await sql`
        SELECT * FROM api_keys 
        WHERE key_value = ${apiKey} 
        AND is_active = true
      `;

      if (!result.length) {
        throw {
          code: ErrorCodes.InvalidApiKey,
          message: "Invalid or inactive API key"
        };
      }
      return result;
    });

    return key;
  } catch (error) {
    if (error.code === ErrorCodes.InvalidApiKey) {
      throw error;
    }
    console.error('Database error during API key validation:', error);
    throw {
      code: ErrorCodes.DatabaseError,
      message: "Error validating API key"
    };
  }
}

// Add Amazon Advertising profiles resource
server.resource(
  "amazon-profiles",
  new ResourceTemplate("amazon-profiles://", { list: undefined }),
  async (uri, _params, context, extra) => {
    try {
      const apiKey = context.headers?.["x-api-key"];
      if (!apiKey) {
        throw {
          code: ErrorCodes.ValidationError,
          message: "API key required"
        };
      }

      const key = await validateApiKey(apiKey);
      reportProgress(extra.progress, "Fetching Amazon profiles...", 50);

      const profiles = await withRetry(async () => {
        return sql`
          SELECT profile_id, account_name, marketplace, account_type, status 
          FROM advertiser_accounts 
          WHERE user_id = ${key.user_id}
        `;
      });

      reportProgress(extra.progress, "Profiles retrieved successfully", 100);

      return {
        contents: profiles.map(profile => ({
          uri: `amazon-profiles://${profile.profile_id}`,
          text: JSON.stringify(profile)
        }))
      };
    } catch (error) {
      console.error('Error in amazon-profiles resource:', error);
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error fetching Amazon profiles"
      };
    }
  }
);

// Add Google Ads accounts resource
server.resource(
  "google-accounts",
  new ResourceTemplate("google-accounts://", { list: undefined }),
  async (uri, _params, context, extra) => {
    try {
      const apiKey = context.headers?.["x-api-key"];
      if (!apiKey) {
        throw {
          code: ErrorCodes.ValidationError,
          message: "API key required"
        };
      }

      const key = await validateApiKey(apiKey);
      reportProgress(extra.progress, "Fetching Google Ads accounts...", 50);

      const accounts = await withRetry(async () => {
        return sql`
          SELECT customer_id, account_name, status 
          FROM google_advertiser_accounts 
          WHERE user_id = ${key.user_id}
        `;
      });

      reportProgress(extra.progress, "Accounts retrieved successfully", 100);

      return {
        contents: accounts.map(account => ({
          uri: `google-accounts://${account.customer_id}`,
          text: JSON.stringify(account)
        }))
      };
    } catch (error) {
      console.error('Error in google-accounts resource:', error);
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error fetching Google Ads accounts"
      };
    }
  }
);

// Add campaigns resource
server.resource(
  "campaigns",
  new ResourceTemplate("campaigns://{profileId}", { list: undefined }),
  async (uri, params, context, extra) => {
    try {
      const apiKey = context.headers?.["x-api-key"];
      if (!apiKey) {
        throw {
          code: ErrorCodes.ValidationError,
          message: "API key required"
        };
      }

      const key = await validateApiKey(apiKey);
      reportProgress(extra.progress, "Fetching campaign data...", 50);

      const campaigns = await withRetry(async () => {
        return sql`
          SELECT campaign_id, profile_id, ad_group_id, impressions, clicks, cost, date
          FROM campaign_metrics 
          WHERE user_id = ${key.user_id} 
          AND profile_id = ${params.profileId}
        `;
      });

      reportProgress(extra.progress, "Data retrieved successfully", 100);

      return {
        contents: campaigns.map(campaign => ({
          uri: `campaigns://${campaign.profile_id}/${campaign.campaign_id}`,
          text: JSON.stringify(campaign)
        }))
      };
    } catch (error) {
      console.error('Error in campaigns resource:', error);
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error fetching campaign data"
      };
    }
  }
);

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log("Shutting down MCP server...");
  try {
    await transport.close();
    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Start the server with stdio transport
const transport = new StdioServerTransport();

const startServer = async () => {
  try {
    await server.connect(transport);
    console.log("MCP Server started successfully");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
};

startServer();