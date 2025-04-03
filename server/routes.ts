import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticate } from "./auth";
import { storage } from "./storage";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { 
  insertApiKeySchema, 
  insertAdvertiserSchema,
  insertDemoRequestSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  campaignMetrics,
  insertCampaignSchema,
  insertAdGroupSchema,
  insertProductAdSchema,
  insertKeywordSchema,
  insertNegativeKeywordSchema
} from "@shared/schema";

interface AmazonToken {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenScope: string;
  expiresAt: Date;
  lastRefreshed: Date;
  isActive: boolean;
}

async function refreshAmazonToken(userId: string, refreshToken: string): Promise<AmazonToken> {
  const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
  const clientSecret = process.env.VITE_AMAZON_CLIENT_SECRET || process.env.AMAZON_CLIENT_SECRET;

  const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();

  // Save the new token
  const token = await storage.saveAmazonToken({
    userId,
    accessToken: access_token,
    refreshToken: refresh_token || refreshToken, // Use new refresh token if provided
    tokenScope: "advertising::campaign_management",
    expiresAt: new Date(Date.now() + expires_in * 1000),
    lastRefreshed: new Date(),
    isActive: true,
  });

  await storage.logTokenRefresh(userId, true);
  return token;
}

interface AdvertiserAccount {
  userId: string;
  profileId: string;
  accountName: string;
  marketplace: string;
  accountType: string;
  status: string;
}


async function processSingleProfile(profile: AdvertiserAccount, token: AmazonToken, userId: string, clientId: string) {
  const profileStartTime = new Date();
  console.log(`\n=== Processing profile ${profile.profileId} (${profile.marketplace}) ===`);
  console.log(`Started at: ${profileStartTime.toISOString()}`);

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // Last 7 days

    const reportRequest = {
      name: `SP campaigns report ${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}${Date.now()}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      configuration: {
        adProduct: "SPONSORED_PRODUCTS",
        groupBy: ["campaign", "adGroup"],
        columns: ["impressions", "clicks", "cost", "campaignId", "adGroupId", "date"],
        reportTypeId: "spCampaigns",
        timeUnit: "DAILY",
        format: "GZIP_JSON"
      }
    };

    // Step 1: Create report
    const createReportResponse = await fetch("https://advertising-api.amazon.com/reporting/reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.createasyncreportrequest.v3+json",
        "Amazon-Advertising-API-ClientId": clientId!,
        "Amazon-Advertising-API-Scope": profile.profileId,
        "Authorization": `Bearer ${token.accessToken}`
      },
      body: JSON.stringify(reportRequest)
    });

    if (!createReportResponse.ok) {
      const errorText = await createReportResponse.text();
      console.error(`Failed to create report for profile ${profile.profileId}:`, errorText);

      // If it's a duplicate request, extract the existing report ID
      if (errorText.includes('"code":"425"')) {
        const match = errorText.match(/: ([a-f0-9-]+)/);
        if (match) {
          const existingReportId = match[1];
          console.log(`Using existing report ID: ${existingReportId}`);

          let attempts = 0;
          const maxAttempts = 30; // 5 minutes maximum (10 second intervals)
          let reportData = null;

          while (attempts < maxAttempts) {
            const reportStatusResponse = await fetch(
              `https://advertising-api.amazon.com/reporting/reports/${existingReportId}`,
              {
                headers: {
                  "Amazon-Advertising-API-ClientId": clientId!,
                  "Amazon-Advertising-API-Scope": profile.profileId,
                  "Authorization": `Bearer ${token.accessToken}`
                }
              }
            );

            if (!reportStatusResponse.ok) {
              console.error(`Failed to check report status:`, await reportStatusResponse.text());
              break;
            }

            const statusData = await reportStatusResponse.json();
            console.log(`Report status for ${existingReportId}:`, statusData.status);

            if (statusData.status === 'SUCCESS') {
              // Download report data
              console.log(`Report ready, downloading from ${statusData.location}`);
              const reportDataResponse = await fetch(statusData.location);
              if (!reportDataResponse.ok) {
                console.error(`Failed to download report data:`, await reportDataResponse.text());
                break;
              }

              reportData = await reportDataResponse.json();
              console.log(
                `Successfully downloaded report data with ${reportData.data?.length || 0} records`
              );
              break;
            } else if (statusData.status === 'FAILED') {
              console.error(`Report generation failed for profile ${profile.profileId}`);
              break;
            } else if (statusData.status === 'PENDING' || statusData.status === 'IN_PROGRESS') {
              console.log(`Report is still ${statusData.status} for ${existingReportId}`);
            }

            // Wait before next attempt with exponential backoff
            const backoffTime = Math.min(10000 * Math.pow(1.2, attempts), 30000);
            console.log(`Waiting ${backoffTime / 1000} seconds before next status check`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            attempts++;
          }

          if (!reportData) {
            console.error(
              `Failed to get report data after ${maxAttempts} attempts for ${existingReportId}`
            );
            return { success: false, marketplace: profile.marketplace };
          } else {
            let recordsProcessed = 0;
            // Store the metrics
            for (const record of reportData.data || []) {
              try {
                console.log(`Processing record:`, record);
                await storage.saveCampaignMetrics({
                  userId: userId,
                  profileId: profile.profileId,
                  campaignId: record.campaignId,
                  adGroupId: record.adGroupId,
                  date: record.date,
                  impressions: record.impressions,
                  clicks: record.clicks,
                  cost: record.cost
                });
                recordsProcessed++;
              } catch (error) {
                console.error(`Error saving metrics for record:`, record, error);
              }
            }

            console.log(`Successfully processed ${recordsProcessed} records for profile ${profile.profileId}`);
            return { success: true, marketplace: profile.marketplace };
          }
        }
      }
      return { success: false, marketplace: profile.marketplace };
    }

    const { reportId } = await createReportResponse.json();
    console.log(`Got report ID ${reportId} for profile ${profile.profileId}`);

    // Step 2: Poll for report completion with exponential backoff
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes maximum
    let reportData = null;

    try {
      // Create initial report record
      const report = await storage.createAdReport({
        reportId,
        profileId: profile.profileId,
        reportType: "campaigns",
        requestParams: reportRequest,
        status: "PENDING",
        downloadUrl: null,
        urlExpiry: null,
        localFilePath: null,
        lastCheckedAt: new Date(),
        completedAt: null,
        retryCount: 0,
        errorMessage: null
      });
    } catch (error) {
      console.error(`Error creating report record:`, error);
      return { success: false, marketplace: profile.marketplace };
    }


    while (attempts < maxAttempts) {
      const reportStatusResponse = await fetch(
        `https://advertising-api.amazon.com/reporting/reports/${reportId}`,
        {
          headers: {
            "Amazon-Advertising-API-ClientId": clientId!,
            "Amazon-Advertising-API-Scope": profile.profileId,
            "Authorization": `Bearer ${token.accessToken}`
          }
        }
      );

      if (!reportStatusResponse.ok) {
        console.error(`Failed to check report status:`, await reportStatusResponse.text());
        break;
      }

      const statusData = await reportStatusResponse.json();
      console.log(`Report status for ${reportId}:`, statusData.status);

      try {
        if (statusData.status === 'SUCCESS') {
          // Download report data
          console.log(`Report ready, downloading from ${statusData.location}`);
          const reportDataResponse = await fetch(statusData.location);
          if (!reportDataResponse.ok) {
            console.error(`Failed to download report data:`, await reportDataResponse.text());
            break;
          }

          reportData = await reportDataResponse.json();
          console.log(
            `Successfully downloaded report data with ${reportData.data?.length || 0} records`
          );
          await storage.updateAdReportStatus(reportId, 'SUCCESS', statusData.location);
          break;
        } else if (statusData.status === 'FAILED') {
          console.error(`Report generation failed for profile ${profile.profileId}`);
          await storage.updateAdReportStatus(reportId, 'FAILED');
          break;
        } else if (statusData.status === 'PENDING' || statusData.status === 'IN_PROGRESS') {
          console.log(`Report is still ${statusData.status} for ${reportId}, waiting before next check`);
        } else {
          console.log(`Unknown report status ${statusData.status} for ${reportId}`);
        }
      } catch (error) {
        console.error(`Error tracking report status:`, error);
        return { success: false, marketplace: profile.marketplace };
      }

      // Exponential backoff
      const backoffTime = Math.min(10000 * Math.pow(1.2, attempts), 30000);
      console.log(`Waiting ${backoffTime / 1000} seconds before next status check`);
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      attempts++;
    }

    if (!reportData) {
      console.error(`Failed to get report data after ${maxAttempts} attempts`);
      return { success: false, marketplace: profile.marketplace };
    }

    let recordsProcessed = 0;
    // Store the metrics
    for (const record of reportData.data || []) {
      try {
        console.log(`Processing record:`, record);
        await storage.saveCampaignMetrics({
          userId: userId,
          profileId: profile.profileId,
          campaignId: record.campaignId,
          adGroupId: record.adGroupId,
          date: record.date,
          impressions: record.impressions,
          clicks: record.clicks,
          cost: record.cost
        });
        recordsProcessed++;
      } catch (error) {
        console.error(`Error saving metrics for record:`, record, error);
      }
    }

    console.log(`Successfully processed ${recordsProcessed} records for profile ${profile.profileId}`);
    const profileEndTime = new Date();
    const profileDuration = (profileEndTime.getTime() - profileStartTime.getTime()) / 1000;
    console.log(`\nProfile ${profile.profileId} processing completed`);
    console.log(`Duration: ${profileDuration} seconds`);
    console.log(`End time: ${profileEndTime.toISOString()}\n`);
    return { success: true, marketplace: profile.marketplace };
  } catch (error) {
    console.error(`Error processing profile ${profile.profileId}:`, error);
    return { success: false, marketplace: profile.marketplace };
  }
}

interface GoogleToken {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  lastRefreshed: Date;
  isActive: boolean;
}

async function refreshGoogleToken(userId: string, refreshToken: string): Promise<GoogleToken> {
  const clientId = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId!,
      client_secret: clientSecret!,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();

  // Save the new token
  const token = await storage.saveGoogleToken({
    userId,
    accessToken: access_token,
    refreshToken: refresh_token || refreshToken, 
    expiresAt: new Date(Date.now() + expires_in * 1000),
    lastRefreshed: new Date(),
    isActive: true,
  });

  await storage.logTokenRefresh(userId, true);
  return token;
}

export async function registerRoutes(app: Express): Promise<void> {
  setupAuth(app);

  // Amazon OAuth endpoints
  app.post("/api/amazon/connect", authenticate, async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code required" });
    }

    const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
    const clientSecret = process.env.VITE_AMAZON_CLIENT_SECRET || process.env.AMAZON_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("Missing Amazon credentials:", {
        hasClientId: !!clientId,
        hasClientSecret: !!clientSecret
      });
      return res.status(500).json({ message: "Amazon API credentials not configured" });
    }

    try {
      // Exchange code for tokens with Amazon Ads API
      const tokenResponse = await fetch("https://api.amazon.com/auth/o2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${req.protocol}://${req.get('host')}/auth/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Amazon OAuth error response:", error);
        throw new Error(`Failed to exchange authorization code: ${error}`);
      }

      const { access_token, refresh_token, expires_in, scope } = await tokenResponse.json();

      // Store tokens with the new schema
      await storage.saveAmazonToken({
        userId: req.user!.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenScope: scope || "advertising::campaign_management",
        expiresAt: new Date(Date.now() + expires_in * 1000),
        lastRefreshed: new Date(),
        isActive: true,
      });

      // Fetch profiles after successful token exchange
      const profilesResponse = await fetch("https://advertising-api.amazon.com/v2/profiles", {
        headers: {
          "Amazon-Advertising-API-ClientId": clientId,
          "Authorization": `Bearer ${access_token}`,
        },
      });

      if (!profilesResponse.ok) {
        const error = await profilesResponse.text();
        console.error("Amazon Profiles API error:", error);
        throw new Error(`Failed to fetch profiles: ${error}`);
      }

      const profiles = await profilesResponse.json();

      // Store each profile in the advertiser_accounts table
      for (const profile of profiles) {
        const advertiser = {
          userId: req.user!.id,
          profileId: profile.profileId.toString(),
          accountName: profile.accountInfo.name || `Account ${profile.profileId}`,
          marketplace: profile.countryCode,
          accountType: profile.accountInfo.type,
          status: 'active'
        };

        const result = insertAdvertiserSchema.safeParse(advertiser);
        if (result.success) {
          await storage.createAdvertiserAccount(advertiser);
        } else {
          console.error("Failed to validate advertiser data:", result.error);
        }
      }

      await storage.logTokenRefresh(req.user!.id, true);
      res.sendStatus(200);
    } catch (error) {
      console.error("Amazon OAuth error:", error);
      await storage.logTokenRefresh(req.user!.id, false, error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to connect Amazon account" });
    }
  });

  app.get("/api/amazon/status", authenticate, async (req: Request, res: Response) => {

    const token = await storage.getAmazonToken(req.user!.id);
    res.json({ connected: !!token });
  });

  app.get("/api/amazon/profiles", authenticate, async (req: Request, res: Response) => {

    try {
      const advertisers = await storage.getAdvertiserAccounts(req.user!.id);
      res.json(advertisers);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.delete("/api/amazon/disconnect", authenticate, async (req: Request, res: Response) => {

    await storage.deleteAmazonToken(req.user!.id);
    await storage.deleteAdvertiserAccounts(req.user!.id);
    res.sendStatus(200);
  });

  // Google OAuth endpoints
  app.post("/api/google/connect", authenticate, async (req: Request, res: Response) => {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code required" });
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: process.env.VITE_GOOGLE_CLIENT_ID!,
          client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET!,
          redirect_uri: `${req.protocol}://${req.get('host')}/auth/callback`,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("Google OAuth error response:", error);
        throw new Error(`Failed to exchange authorization code: ${error}`);
      }

      const { access_token, refresh_token, expires_in } = await tokenResponse.json();

      // Store tokens
      await storage.saveGoogleToken({
        userId: req.user!.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        lastRefreshed: new Date(),
        isActive: true,
      });

      // Fetch customer accounts from Google Ads API
      const accountsResponse = await fetch(
        "https://googleads.googleapis.com/v19/customers:listAccessibleCustomers",
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
            "developer-token": process.env.GOOGLE_DEVELOPER_TOKEN!,
          },
        }
      );

      if (!accountsResponse.ok) {
        const errorData = await accountsResponse.json();
        console.error("Google Ads API error:", errorData);
        throw new Error(`Failed to fetch accounts: ${JSON.stringify(errorData)}`);
      }

      const accounts = await accountsResponse.json();

      // Store each account in the database
      for (const resourceName of accounts.resourceNames) {
        const customerId = resourceName.split('/')[1];
        await storage.createGoogleAdvertiserAccount({
          userId: req.user!.id,
          customerId: customerId,
          accountName: `Google Ads Account ${customerId}`,
          status: "ENABLED",
        });
      }

      await storage.logTokenRefresh(req.user!.id, true);
      res.sendStatus(200);
    } catch (error) {
      console.error("Google OAuth error:", error);
      await storage.logTokenRefresh(req.user!.id, false, error instanceof Error ? error.message : "Unknown error");
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to connect Google account" });
    }
  });

  app.get("/api/google/status", authenticate, async (req: Request, res: Response) => {

    const token = await storage.getGoogleToken(req.user!.id);
    res.json({ connected: !!token });
  });

  app.get("/api/google/accounts", authenticate, async (req: Request, res: Response) => {

    try {
      const accounts = await storage.getGoogleAdvertiserAccounts(req.user!.id);
      if (!accounts.length) {
        return res.status(400).json({ message: "No Google Ads accounts found" });
      }
      res.json(accounts);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.delete("/api/google/disconnect", authenticate, async (req: Request, res: Response) => {

    await storage.deleteGoogleToken(req.user!.id);
    await storage.deleteGoogleAdvertiserAccounts(req.user!.id);
    res.sendStatus(200);
  });

  // API key management
  app.post("/api/keys", authenticate, async (req: Request, res: Response) => {

    const result = insertApiKeySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const apiKey = await storage.createApiKey(req.user!.id, result.data.name);
    res.status(201).json(apiKey);
  });

  app.get("/api/keys", authenticate, async (req: Request, res: Response) => {

    const keys = await storage.getApiKeys(req.user!.id);
    res.json(keys);
  });

  app.delete("/api/keys/:id", authenticate, async (req: Request, res: Response) => {

    await storage.deactivateApiKey(parseInt(req.params.id), req.user!.id);
    res.sendStatus(200);
  });

  app.post("/api/amazon/campaigns/sync", authenticate, async (req: Request, res: Response) => {

    let token = await storage.getAmazonToken(req.user!.id);
    if (!token) {
      return res.status(400).json({ message: "Amazon account not connected" });
    }

    // Check if token is expired or about to expire (within 5 minutes)
    if (token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      try {
        console.log("Token expired or about to expire, refreshing...");
        token = await refreshAmazonToken(req.user!.id, token.refreshToken);
        console.log("Token refreshed successfully");
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return res.status(401).json({ message: "Failed to refresh access token" });
      }
    }

    // Start async processing and return immediately
    res.status(202).json({ message: "Campaign sync started" });

    // Process in background
    (async () => {
      try {
        const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
        const profiles = await storage.getAdvertiserAccounts(req.user!.id);

        const syncStartTime = new Date();
        console.log(`Starting campaign sync for ${profiles.length} profiles at ${syncStartTime.toISOString()}`);

        // Track success rates
        const profileStats = {
          total: profiles.length,
          success: 0,
          failed: 0,
          byMarketplace: {} as Record<string, { success: number; failed: number }>
        };

        // Process profiles in batches of 5
        const batchSize = 5;
        for (let i = 0; i < profiles.length; i += batchSize) {
          const batch = profiles.slice(i, i + batchSize);
          console.log(`\nProcessing batch of ${batch.length} profiles (${i + 1} to ${Math.min(i + batchSize, profiles.length)} of ${profiles.length})`);

          const results = await Promise.all(
            batch.map(profile => processSingleProfile(profile, token, req.user!.id, clientId!))
          );

          // Update stats
          results.forEach(result => {
            if (!profileStats.byMarketplace[result.marketplace]) {
              profileStats.byMarketplace[result.marketplace] = { success: 0, failed: 0 };
            }

            if (result.success) {
              profileStats.success++;
              profileStats.byMarketplace[result.marketplace].success++;
            } else {
              profileStats.failed++;
              profileStats.byMarketplace[result.marketplace].failed++;
            }
          });
        }

        const syncEndTime = new Date();
        const totalDuration = (syncEndTime.getTime() - syncStartTime.getTime()) / 1000;

        console.log('\n=== Campaign Sync Summary ===');
        console.log(`Total Duration: ${totalDuration} seconds`);
        console.log(`Start Time: ${syncStartTime.toISOString()}`);
        console.log(`End Time: ${syncEndTime.toISOString()}`);
        console.log('\nSuccess Rate:');
        console.log(`Total: ${profileStats.success}/${profileStats.total} (${(profileStats.success/profileStats.total*100).toFixed(1)}%)`);
        console.log('\nBy Marketplace:');
        Object.entries(profileStats.byMarketplace).forEach(([marketplace, stats]) => {
          const total = stats.success + stats.failed;
          const successRate = (stats.success/total*100).toFixed(1);
          console.log(`${marketplace}: ${stats.success}/${total} (${successRate}%)`);
        });
        console.log('\nCampaign sync completed');

      } catch (error) {
        console.error("Error in background campaign sync:", error);
      }
    })().catch(console.error);
  });

  // Campaign management endpoints
  app.post("/api/campaigns", authenticate, async (req: Request, res: Response) => {
    const result = insertCampaignSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid campaign data", errors: result.error.errors });
    }

    try {
      // Convert numeric values to strings for Drizzle if needed
      const campaignData = {
        ...result.data,
        userId: req.user!.id,
        dailyBudget: String(result.data.dailyBudget)
      };
      
      const campaign = await storage.createCampaign(campaignData);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Failed to create campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.get("/api/campaigns", authenticate, async (req: Request, res: Response) => {
    const { profileId } = req.query;
    
    try {
      const campaigns = await storage.getCampaigns(
        req.user!.id,
        profileId ? String(profileId) : undefined
      );
      res.json(campaigns);
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.get("/api/campaigns/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Security check: ensure user owns the campaign
      if (campaign.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to campaign" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Failed to fetch campaign:", error);
      res.status(500).json({ message: "Failed to fetch campaign" });
    }
  });

  app.put("/api/campaigns/:id/state", authenticate, async (req: Request, res: Response) => {
    const { state } = req.body;
    
    if (!state || !['enabled', 'paused', 'archived'].includes(state)) {
      return res.status(400).json({ message: "Invalid state. Must be one of: enabled, paused, archived" });
    }
    
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.id));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Security check: ensure user owns the campaign
      if (campaign.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to campaign" });
      }
      
      const updatedCampaign = await storage.updateCampaignState(parseInt(req.params.id), state);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Failed to update campaign state:", error);
      res.status(500).json({ message: "Failed to update campaign state" });
    }
  });

  // Ad group endpoints
  app.post("/api/campaigns/:campaignId/adgroups", authenticate, async (req: Request, res: Response) => {
    const result = insertAdGroupSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid ad group data", errors: result.error.errors });
    }

    try {
      const campaign = await storage.getCampaign(parseInt(req.params.campaignId));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Security check: ensure user owns the campaign
      if (campaign.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to campaign" });
      }
      
      const adGroup = await storage.createAdGroup({
        ...result.data,
        campaignId: parseInt(req.params.campaignId),
        userId: req.user!.id,
        profileId: campaign.profileId // Use the same profile ID as the campaign
      });
      res.status(201).json(adGroup);
    } catch (error) {
      console.error("Failed to create ad group:", error);
      res.status(500).json({ message: "Failed to create ad group" });
    }
  });

  app.get("/api/campaigns/:campaignId/adgroups", authenticate, async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(parseInt(req.params.campaignId));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      // Security check: ensure user owns the campaign
      if (campaign.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to campaign" });
      }
      
      const adGroups = await storage.getAdGroups(parseInt(req.params.campaignId));
      res.json(adGroups);
    } catch (error) {
      console.error("Failed to fetch ad groups:", error);
      res.status(500).json({ message: "Failed to fetch ad groups" });
    }
  });

  app.put("/api/adgroups/:id/state", authenticate, async (req: Request, res: Response) => {
    const { state } = req.body;
    
    if (!state || !['enabled', 'paused', 'archived'].includes(state)) {
      return res.status(400).json({ message: "Invalid state. Must be one of: enabled, paused, archived" });
    }
    
    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.id));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const updatedAdGroup = await storage.updateAdGroupState(parseInt(req.params.id), state);
      res.json(updatedAdGroup);
    } catch (error) {
      console.error("Failed to update ad group state:", error);
      res.status(500).json({ message: "Failed to update ad group state" });
    }
  });

  // Product ad endpoints
  app.post("/api/adgroups/:adGroupId/products", authenticate, async (req: Request, res: Response) => {
    const result = insertProductAdSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid product ad data", errors: result.error.errors });
    }

    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const productAd = await storage.createProductAd({
        ...result.data,
        adGroupId: parseInt(req.params.adGroupId),
        userId: req.user!.id
      });
      res.status(201).json(productAd);
    } catch (error) {
      console.error("Failed to create product ad:", error);
      res.status(500).json({ message: "Failed to create product ad" });
    }
  });

  app.get("/api/adgroups/:adGroupId/products", authenticate, async (req: Request, res: Response) => {
    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const products = await storage.getProductAds(parseInt(req.params.adGroupId));
      res.json(products);
    } catch (error) {
      console.error("Failed to fetch product ads:", error);
      res.status(500).json({ message: "Failed to fetch product ads" });
    }
  });

  // Keyword endpoints
  app.post("/api/adgroups/:adGroupId/keywords", authenticate, async (req: Request, res: Response) => {
    const result = insertKeywordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid keyword data", errors: result.error.errors });
    }

    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const keyword = await storage.createKeyword({
        ...result.data,
        adGroupId: parseInt(req.params.adGroupId),
        userId: req.user!.id
      });
      res.status(201).json(keyword);
    } catch (error) {
      console.error("Failed to create keyword:", error);
      res.status(500).json({ message: "Failed to create keyword" });
    }
  });

  app.get("/api/adgroups/:adGroupId/keywords", authenticate, async (req: Request, res: Response) => {
    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const keywords = await storage.getKeywords(parseInt(req.params.adGroupId));
      res.json(keywords);
    } catch (error) {
      console.error("Failed to fetch keywords:", error);
      res.status(500).json({ message: "Failed to fetch keywords" });
    }
  });

  // Negative keyword endpoints
  app.post("/api/adgroups/:adGroupId/negativekeywords", authenticate, async (req: Request, res: Response) => {
    const result = insertNegativeKeywordSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid negative keyword data", errors: result.error.errors });
    }

    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const negativeKeyword = await storage.createNegativeKeyword({
        ...result.data,
        adGroupId: parseInt(req.params.adGroupId),
        userId: req.user!.id
      });
      res.status(201).json(negativeKeyword);
    } catch (error) {
      console.error("Failed to create negative keyword:", error);
      res.status(500).json({ message: "Failed to create negative keyword" });
    }
  });

  app.get("/api/adgroups/:adGroupId/negativekeywords", authenticate, async (req: Request, res: Response) => {
    try {
      const adGroup = await storage.getAdGroup(parseInt(req.params.adGroupId));
      
      if (!adGroup) {
        return res.status(404).json({ message: "Ad group not found" });
      }
      
      // Security check: ensure user owns the ad group
      if (adGroup.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to ad group" });
      }
      
      const negativeKeywords = await storage.getNegativeKeywords(parseInt(req.params.adGroupId));
      res.json(negativeKeywords);
    } catch (error) {
      console.error("Failed to fetch negative keywords:", error);
      res.status(500).json({ message: "Failed to fetch negative keywords" });
    }
  });

  app.post("/api/demo-request", async (req: Request, res: Response) => {
    const result = insertDemoRequestSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request data", errors: result.error.errors });
    }

    try {
      const demoRequest = await storage.createDemoRequest(result.data);
      res.status(201).json(demoRequest);
    } catch (error) {
      console.error("Failed to create demo request:", error);
      res.status(500).json({ message: "Failed to submit demo request" });
    }
  });

  // Initialize OpenAI
  // OpenAI client is now imported from @ai-sdk/openai at the top of the file

  // Chat endpoints
  app.get("/api/chat/conversations", authenticate, async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getChatConversations(req.user!.id);
      return res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", authenticate, async (req: Request, res: Response) => {
    
    const { title = "New conversation", generateWelcome = true } = req.body;
    
    try {
      // Create new conversation
      const conversation = await storage.createChatConversation(req.user!.id, title);
      console.log(`Created new conversation ${conversation.id} for user ${req.user!.id}`);
      
      // Optionally generate a welcome message
      if (generateWelcome) {
        try {
          console.log(`Generating welcome message for conversation ${conversation.id}...`);
          // Import the service to avoid circular dependencies
          const { generateWelcomeMessage } = await import('./services/openai');
          
          // Generate welcome message
          // We'll use await here to make sure welcome message is ready before the client loads the conversation
          await generateWelcomeMessage(conversation.id, req.user!.id)
            .then(() => {
              console.log(`Welcome message generated successfully for conversation ${conversation.id}`);
            })
            .catch(err => {
              console.error(`Failed to generate welcome message for conversation ${conversation.id}:`, err);
              // We still continue as this is not critical, but log the detailed error
              console.error('Welcome message error details:', err.stack || err.message || err);
            });
            
          // Double-check that the welcome message was created
          const messages = await storage.getChatMessages(conversation.id);
          if (messages.length === 0) {
            console.warn(`Warning: No welcome message found after generation for conversation ${conversation.id}`);
          } else {
            console.log(`Verified welcome message exists for conversation ${conversation.id}`);
          }
        } catch (welcomeError) {
          console.error('Error importing or using OpenAI service for welcome message:', welcomeError);
          console.error('Welcome error stack:', welcomeError.stack || welcomeError);
          // We still continue as this is not critical
        }
      }
      
      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    
    try {
      const conversation = await storage.getChatConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Security check: ensure user owns the conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      const messages = await storage.getChatMessages(req.params.id);
      return res.json({ conversation, messages });
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.put("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }
    
    try {
      const conversation = await storage.getChatConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Security check: ensure user owns the conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      const updatedConversation = await storage.updateChatConversationTitle(req.params.id, title);
      return res.json(updatedConversation);
    } catch (error) {
      console.error('Error updating conversation:', error);
      return res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    
    try {
      const conversation = await storage.getChatConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Security check: ensure user owns the conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      await storage.deleteChatConversation(req.params.id);
      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting conversation:', error);
      return res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", authenticate, async (req: Request, res: Response) => {
    
    // Add conversationId to the request body
    const messageData = {
      ...req.body,
      conversationId: req.params.id
    };
    
    const result = insertChatMessageSchema.safeParse(messageData);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid message data", errors: result.error.errors });
    }
    
    try {
      const conversation = await storage.getChatConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Security check: ensure user owns the conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      // Save the user message
      console.log('Creating user message with data:', JSON.stringify(result.data, null, 2));
      const message = await storage.createChatMessage(result.data);
      console.log('User message saved with ID:', message.id);
      
      return res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      return res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Chat completion endpoint with streaming
  app.post("/api/chat/completions", authenticate, async (req: Request, res: Response) => {
    
    console.log('User authenticated:', req.user!.id);
    
    const { conversationId, message } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID is required" });
    }
    
    try {
      // Log the request for debugging
      console.log(`Completions request for conversation ${conversationId}. Message: "${message?.substring(0, 50)}${message?.length > 50 ? '...' : ''}"`);
      
      // Get conversation messages
      const messages = await storage.getChatMessages(conversationId);
      
      // Store the current user message in the database
      if (message) {
        await storage.createChatMessage({
          conversationId,
          role: "user",
          content: message,
        });
      }
      
      // Let the LLM handle all responses through the standard streamChatCompletion function
      const { streamChatCompletion } = await import('./services/openai');
      await streamChatCompletion(conversationId, req.user!.id, res, messages as any);
    } catch (error) {
      console.error("Error in chat completion:", error);
      res.status(500).json({ message: "Failed to generate completion" });
    }
  });
}