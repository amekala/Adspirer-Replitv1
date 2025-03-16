import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import postgres from 'postgres';
import { getDatabaseUrl } from './config.js';

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

let sql;
try {
  // Database connection
  sql = postgres(getDatabaseUrl());
} catch (error) {
  console.error('Failed to initialize database connection:', error.message);
  process.exit(1);
}

// API key validation
async function validateApiKey(apiKey) {
  try {
    const [key] = await sql`
      SELECT * FROM api_keys 
      WHERE key_value = ${apiKey} AND is_active = true
    `;

    if (!key) {
      throw {
        code: ErrorCodes.InvalidApiKey,
        message: "Invalid or inactive API key"
      };
    }

    return key;
  } catch (error) {
    if (error.code === ErrorCodes.InvalidApiKey) {
      throw error;
    }
    throw {
      code: ErrorCodes.DatabaseError,
      message: "Error validating API key"
    };
  }
}

// Report progress helper
function reportProgress(progress, message, percentage) {
  if (progress?.onProgress) {
    progress.onProgress({
      message,
      percentage
    });
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

      const profiles = await sql`
        SELECT * FROM advertiser_accounts 
        WHERE user_id = ${key.user_id}
      `;

      reportProgress(extra.progress, "Profiles retrieved successfully", 100);

      return {
        contents: profiles.map(profile => ({
          uri: `amazon-profiles://${profile.profile_id}`,
          text: JSON.stringify(profile)
        }))
      };
    } catch (error) {
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

      const accounts = await sql`
        SELECT * FROM google_advertiser_accounts 
        WHERE user_id = ${key.user_id}
      `;

      reportProgress(extra.progress, "Accounts retrieved successfully", 100);

      return {
        contents: accounts.map(account => ({
          uri: `google-accounts://${account.customer_id}`,
          text: JSON.stringify(account)
        }))
      };
    } catch (error) {
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

      const campaigns = await sql`
        SELECT * FROM campaign_metrics 
        WHERE user_id = ${key.user_id} 
        AND profile_id = ${params.profileId}
      `;

      reportProgress(extra.progress, "Data retrieved successfully", 100);

      return {
        contents: campaigns.map(campaign => ({
          uri: `campaigns://${campaign.profile_id}/${campaign.campaign_id}`,
          text: JSON.stringify(campaign)
        }))
      };
    } catch (error) {
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error fetching campaign data"
      };
    }
  }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();

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