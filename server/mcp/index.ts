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

// API key validation middleware
async function validateApiKey(apiKey: string) {
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.keyValue, apiKey));

  if (!key || !key.isActive) {
    throw new Error("Invalid or inactive API key");
  }

  return key;
}

// Add a campaigns resource
server.resource(
  "campaigns",
  new ResourceTemplate("campaigns://{profileId}", { list: undefined }),
  async (uri: URL, params: { profileId: string }, context: Context) => {
    const apiKey = context.headers?.["x-api-key"];
    if (!apiKey) throw new Error("API key required");

    const key = await validateApiKey(apiKey);

    const campaigns = await db
      .select()
      .from(campaignMetrics)
      .where(eq(campaignMetrics.userId, key.userId))
      .where(eq(campaignMetrics.profileId, params.profileId));

    return {
      contents: campaigns.map(campaign => ({
        uri: `campaigns://${campaign.profileId}/${campaign.campaignId}`,
        text: JSON.stringify({
          campaignId: campaign.campaignId,
          profileId: campaign.profileId,
          adGroupId: campaign.adGroupId,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          cost: campaign.cost,
          date: campaign.date
        })
      }))
    };
  }
);

// Add a campaign performance analysis tool
server.tool(
  "analyze-performance",
  {
    profileId: z.string(),
    campaignId: z.string(),
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    })
  },
  async (params: { 
    profileId: string, 
    campaignId: string, 
    dateRange: { start: string, end: string } 
  }, context: Context) => {
    const apiKey = context.headers?.["x-api-key"];
    if (!apiKey) throw new Error("API key required");

    const key = await validateApiKey(apiKey);

    const metrics = await db
      .select()
      .from(campaignMetrics)
      .where(eq(campaignMetrics.userId, key.userId))
      .where(eq(campaignMetrics.profileId, params.profileId))
      .where(eq(campaignMetrics.campaignId, params.campaignId));

    // Calculate performance metrics
    const totalImpressions = metrics.reduce((sum: number, m) => sum + m.impressions, 0);
    const totalClicks = metrics.reduce((sum: number, m) => sum + m.clicks, 0);
    const totalCost = metrics.reduce((sum: number, m) => sum + Number(m.cost), 0);
    const ctr = totalClicks / totalImpressions;
    const cpc = totalCost / totalClicks;

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
          dateRange: params.dateRange,
          analysis: `Campaign performance summary:
          - Total Impressions: ${totalImpressions}
          - Total Clicks: ${totalClicks}
          - Total Cost: $${totalCost.toFixed(2)}
          - CTR: ${(ctr * 100).toFixed(2)}%
          - CPC: $${cpc.toFixed(2)}`
        })
      }]
    };
  }
);

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