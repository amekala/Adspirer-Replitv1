import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { apiKeys, campaignMetrics, advertiserAccounts } from "@shared/schema";
import { z } from "zod";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/server/mcp.js";

interface Context {
  headers?: {
    [key: string]: string;
  };
}

// Create an MCP server instance
const server = new McpServer({
  name: "Adspirer MCP",
  version: "1.0.0"
});

// Error codes
const ErrorCodes = {
  InvalidApiKey: -32001,
  DatabaseError: -32002,
  ValidationError: -32003
} as const;

// API key validation middleware
async function validateApiKey(apiKey: string) {
  try {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyValue, apiKey));

    if (!key || !key.isActive) {
      throw {
        code: ErrorCodes.InvalidApiKey,
        message: "Invalid or inactive API key"
      };
    }

    return key;
  } catch (error: any) {
    if (error.code === ErrorCodes.InvalidApiKey) {
      throw error;
    }
    throw {
      code: ErrorCodes.DatabaseError,
      message: "Error validating API key"
    };
  }
}

// Add a campaigns resource
server.resource(
  "campaigns",
  new ResourceTemplate("campaigns://{profileId}", { list: undefined }),
  async (uri: URL, params: { profileId: string }, context: Context, extra: RequestHandlerExtra) => {
    try {
      const apiKey = context.headers?.["x-api-key"];
      if (!apiKey) {
        throw {
          code: ErrorCodes.ValidationError,
          message: "API key required"
        };
      }

      const key = await validateApiKey(apiKey);

      // Report progress
      extra.progress?.({
        message: "Fetching campaign data...",
        percentage: 50
      });

      const campaigns = await db
        .select({
          campaignId: campaignMetrics.campaignId,
          profileId: campaignMetrics.profileId,
          adGroupId: campaignMetrics.adGroupId,
          impressions: campaignMetrics.impressions,
          clicks: campaignMetrics.clicks,
          cost: campaignMetrics.cost,
          date: campaignMetrics.date
        })
        .from(campaignMetrics)
        .where(eq(campaignMetrics.userId, key.userId))
        .where(eq(campaignMetrics.profileId, params.profileId));

      // Report completion
      extra.progress?.({
        message: "Data retrieved successfully",
        percentage: 100
      });

      return {
        contents: campaigns.map((campaign) => ({
          uri: `campaigns://${campaign.profileId}/${campaign.campaignId}`,
          text: JSON.stringify(campaign)
        }))
      };
    } catch (error: any) {
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error fetching campaign data"
      };
    }
  }
);

// Add a campaign performance analysis tool
server.tool(
  "analyze-performance",
  {
    profileId: z.string().min(1, "Profile ID is required"),
    campaignId: z.string().min(1, "Campaign ID is required"),
    dateRange: z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD"),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Use YYYY-MM-DD")
    })
  },
  async (args: { 
    profileId: string, 
    campaignId: string, 
    dateRange: { start: string, end: string } 
  }, extra: RequestHandlerExtra) => {
    try {
      const apiKey = extra.context?.headers?.["x-api-key"];
      if (!apiKey) {
        throw {
          code: ErrorCodes.ValidationError,
          message: "API key required"
        };
      }

      const key = await validateApiKey(apiKey);

      // Report progress
      extra.progress?.({
        message: "Analyzing campaign performance...",
        percentage: 50
      });

      const metrics = await db
        .select({
          impressions: campaignMetrics.impressions,
          clicks: campaignMetrics.clicks,
          cost: campaignMetrics.cost
        })
        .from(campaignMetrics)
        .where(eq(campaignMetrics.userId, key.userId))
        .where(eq(campaignMetrics.profileId, args.profileId))
        .where(eq(campaignMetrics.campaignId, args.campaignId));

      // Calculate performance metrics
      const totalImpressions = metrics.reduce((sum, m) => sum + m.impressions, 0);
      const totalClicks = metrics.reduce((sum, m) => sum + m.clicks, 0);
      const totalCost = metrics.reduce((sum, m) => sum + Number(m.cost), 0);
      const ctr = totalClicks / totalImpressions;
      const cpc = totalCost / totalClicks;

      // Report completion
      extra.progress?.({
        message: "Analysis complete",
        percentage: 100
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            metrics: {
              impressions: totalImpressions,
              clicks: totalClicks,
              cost: totalCost,
              ctr: ctr,
              cpc: cpc
            },
            dateRange: args.dateRange,
            analysis: `Campaign performance summary:
            - Total Impressions: ${totalImpressions}
            - Total Clicks: ${totalClicks}
            - Total Cost: $${totalCost.toFixed(2)}
            - CTR: ${(ctr * 100).toFixed(2)}%
            - CPC: $${cpc.toFixed(2)}`
          })
        }]
      };
    } catch (error: any) {
      throw {
        code: error.code || ErrorCodes.DatabaseError,
        message: error.message || "Error analyzing campaign performance"
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
    process.exit(0);
  } catch (error: any) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

const startServer = async () => {
  try {
    await server.connect(transport);
    console.log("MCP Server started successfully");
  } catch (error: any) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
};

startServer();