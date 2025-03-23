import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { 
  insertApiKeySchema, 
  insertAdvertiserSchema,
  insertDemoRequestSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  campaignMetrics 
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

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Amazon OAuth endpoints
  app.post("/api/amazon/connect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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

  app.get("/api/amazon/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const token = await storage.getAmazonToken(req.user!.id);
    res.json({ connected: !!token });
  });

  app.get("/api/amazon/profiles", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const advertisers = await storage.getAdvertiserAccounts(req.user!.id);
      res.json(advertisers);
    } catch (error) {
      console.error("Failed to fetch profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.delete("/api/amazon/disconnect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.deleteAmazonToken(req.user!.id);
    await storage.deleteAdvertiserAccounts(req.user!.id);
    res.sendStatus(200);
  });

  // Google OAuth endpoints
  app.post("/api/google/connect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
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

  app.get("/api/google/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const token = await storage.getGoogleToken(req.user!.id);
    res.json({ connected: !!token });
  });

  app.get("/api/google/accounts", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

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

  app.delete("/api/google/disconnect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.deleteGoogleToken(req.user!.id);
    await storage.deleteGoogleAdvertiserAccounts(req.user!.id);
    res.sendStatus(200);
  });

  // API key management
  app.post("/api/keys", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const result = insertApiKeySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const apiKey = await storage.createApiKey(req.user!.id, result.data.name);
    res.status(201).json(apiKey);
  });

  app.get("/api/keys", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const keys = await storage.getApiKeys(req.user!.id);
    res.json(keys);
  });

  app.delete("/api/keys/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.deactivateApiKey(parseInt(req.params.id), req.user!.id);
    res.sendStatus(200);
  });

  app.post("/api/amazon/campaigns/sync", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

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
  app.get("/api/chat/conversations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const conversations = await storage.getChatConversations(req.user!.id);
      return res.json(conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { title = "New conversation" } = req.body;
    
    try {
      const conversation = await storage.createChatConversation(req.user!.id, title);
      return res.status(201).json(conversation);
    } catch (error) {
      console.error('Error creating conversation:', error);
      return res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/chat/conversations/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  app.put("/api/chat/conversations/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  app.delete("/api/chat/conversations/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  app.post("/api/chat/conversations/:id/messages", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
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

  // Chat completion endpoint with streaming and context-aware AI
  app.post("/api/chat/completions", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      console.log('Unauthorized request to chat completions endpoint - user not authenticated');
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    const { conversationId, message, useContextAwarePrompt = true } = req.body;
    
    if (!conversationId || !message) {
      return res.status(400).json({ message: "Conversation ID and message are required" });
    }

    try {
      const log = (msg: string) => console.log(`[Chat API] ${msg}`);
      log(`Generating chat completion for conversation: ${conversationId}`);
      
      // Check if the conversation exists and belongs to the user
      const conversation = await storage.getChatConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }

      try {
        // Import services dynamically to avoid circular dependencies
        const { getConversationHistory, streamChatCompletion } = await import('./services/openai');
        const { generateContextAwarePrompt } = await import('./services/embedding');
        
        // Get conversation history from the database
        const messages = await getConversationHistory(conversationId);
        log(`Retrieved ${messages.length} messages for chat context`);
        
        // Generate a context-aware system prompt if requested
        let systemPrompt;
        if (useContextAwarePrompt) {
          try {
            log('Generating context-aware prompt with embedding similarity search');
            systemPrompt = await generateContextAwarePrompt(conversation, userId);
            log('Generated context-aware prompt with relevant insights');
          } catch (promptError) {
            log(`Error generating context-aware prompt: ${promptError instanceof Error ? promptError.message : 'Unknown error'}`);
            // Fall back to default prompt on error
          }
        }
        
        // Stream the chat completion using our dedicated service
        await streamChatCompletion(
          conversationId, 
          userId, 
          res, 
          messages,
          systemPrompt, // Pass the enhanced prompt if available
          true // Always generate embeddings for AI responses
        );
        
        // No need to end the response here - the service handles that
      } catch (openaiError) {
        console.error('Error in OpenAI service:', openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI setup error');
        
        // If we haven't sent any response yet, send error
        if (!res.headersSent) {
          return res.status(500).json({ 
            message: "Failed to generate chat completion", 
            error: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error' 
          });
        }
        
        // Otherwise ensure the stream is properly ended
        try {
          res.write('data: [ERROR]\n\n');
          res.end();
        } catch (streamError) {
          console.error('Error ending stream after OpenAI error:', streamError);
        }
      }
    } catch (error) {
      console.error('Error generating chat completion:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        message: "Failed to generate chat completion", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // RAG (Retrieval Augmented Generation) endpoint for campaign analytics
  app.post("/api/rag/query", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      console.log('Unauthorized request to RAG query endpoint - user not authenticated');
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    const { query, conversationId } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    try {
      console.log(`[RAG API] Processing query for user ${userId}: "${query}"`);
      
      // Import the RAG service dynamically
      const { processRagQuery } = await import('./services/rag');
      
      // Process the query and stream the response
      await processRagQuery(query, userId, conversationId, res);
      
      // Response is handled by the RAG service (streaming)
    } catch (error) {
      console.error('Error processing RAG query:', error instanceof Error ? error.message : 'Unknown error');
      
      // If we haven't sent any response yet, send error
      if (!res.headersSent) {
        return res.status(500).json({ 
          message: "Failed to process query", 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      
      // Otherwise ensure the stream is properly ended
      try {
        res.write('data: [ERROR]\n\n');
        res.end();
      } catch (streamError) {
        console.error('Error ending stream after RAG error:', streamError);
      }
    }
  });

  // Non-streaming RAG endpoint for API usage
  app.post("/api/rag/query/sync", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: "Query is required" });
    }

    try {
      console.log(`[RAG API] Processing sync query for user ${userId}: "${query}"`);
      
      // Import the RAG service dynamically
      const { processRagQueryNonStreaming } = await import('./services/rag');
      
      // Process the query and return the response
      const result = await processRagQueryNonStreaming(query, userId);
      return res.json(result);
    } catch (error) {
      console.error('Error processing RAG query:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        message: "Failed to process query", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Test endpoint for RAG system with PostgreSQL fallback
  app.get("/api/rag/test-fallback", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    
    try {
      // Get campaign metrics from database (if any exist)
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get both Amazon and Google metrics if available
      const amazonMetrics = await storage.getCampaignMetrics(userId, thirtyDaysAgo, today);
      const googleMetrics = await storage.getGoogleCampaignMetrics(userId, thirtyDaysAgo, today);
      
      // Get all embeddings stored in PostgreSQL
      const campaignEmbeddings = await storage.getEmbeddingsByType('campaign', 10);
      const chatEmbeddings = await storage.getEmbeddingsByType('chat_message', 10);
      
      // Return comprehensive information about what data is available for RAG
      return res.json({
        message: "RAG system data availability test",
        amazonMetrics: {
          count: amazonMetrics.length,
          sample: amazonMetrics.slice(0, 3) // Just show a few for demonstration
        },
        googleMetrics: {
          count: googleMetrics.length,
          sample: googleMetrics.slice(0, 3)
        },
        embeddings: {
          campaignCount: campaignEmbeddings.length,
          chatMessageCount: chatEmbeddings.length,
          campaignSample: campaignEmbeddings.slice(0, 2).map(e => ({
            id: e.id,
            type: e.type,
            sourceId: e.sourceId,
            createdAt: e.createdAt
          })),
          chatSample: chatEmbeddings.slice(0, 2).map(e => ({
            id: e.id,
            type: e.type,
            sourceId: e.sourceId,
            createdAt: e.createdAt
          }))
        },
        instructions: "Try asking about campaign performance in the chat interface"
      });
    } catch (error) {
      console.error('Error testing RAG fallback:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        message: "Failed to test RAG fallback", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Create sample campaign data for testing
  app.post("/api/rag/create-sample-data", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    
    try {
      // Generate some sample campaign metrics for Amazon
      const amazonSampleCampaigns = [
        {
          campaignId: `amzn_${Date.now()}_1`,
          campaignName: "Amazon Summer Products",
          campaignType: "Sponsored Products",
          dailyBudget: 50.00,
          status: "ENABLED",
          targetingType: "AUTO",
          startDate: new Date(Date.now() - 60*24*60*60*1000),
          endDate: null,
          impressions: 42500,
          clicks: 1205,
          spend: 982.50,
          sales: 4125.75,
          profileId: "amazon_profile_1",
          userId: userId,
          syncDate: new Date()
        },
        {
          campaignId: `amzn_${Date.now()}_2`,
          campaignName: "Amazon Electronics",
          campaignType: "Sponsored Brands",
          dailyBudget: 75.00,
          status: "ENABLED",
          targetingType: "MANUAL",
          startDate: new Date(Date.now() - 45*24*60*60*1000),
          endDate: null,
          impressions: 38200,
          clicks: 980,
          spend: 1250.25,
          sales: 6850.50,
          profileId: "amazon_profile_1",
          userId: userId,
          syncDate: new Date()
        },
        {
          campaignId: `amzn_${Date.now()}_3`,
          campaignName: "Amazon Home & Kitchen",
          campaignType: "Sponsored Display",
          dailyBudget: 35.00,
          status: "ENABLED",
          targetingType: "AUTO",
          startDate: new Date(Date.now() - 30*24*60*60*1000),
          endDate: null,
          impressions: 28750,
          clicks: 845,
          spend: 750.80,
          sales: 2950.25,
          profileId: "amazon_profile_1",
          userId: userId,
          syncDate: new Date()
        }
      ];
      
      // Generate some sample campaign metrics for Google
      const googleSampleCampaigns = [
        {
          campaignId: `goog_${Date.now()}_1`,
          campaignName: "Google Search - Brand Terms",
          campaignType: "Search",
          dailyBudget: 65.00,
          status: "ENABLED",
          network: "Search",
          startDate: new Date(Date.now() - 90*24*60*60*1000),
          endDate: null,
          impressions: 68500,
          clicks: 3250,
          cost: 1850.75,
          conversions: 215,
          conversionValue: 9850.50,
          customerId: "google_customer_1",
          userId: userId,
          syncDate: new Date()
        },
        {
          campaignId: `goog_${Date.now()}_2`,
          campaignName: "Google Display - Remarketing",
          campaignType: "Display",
          dailyBudget: 40.00,
          status: "ENABLED",
          network: "Display",
          startDate: new Date(Date.now() - 75*24*60*60*1000),
          endDate: null,
          impressions: 125800,
          clicks: 1850,
          cost: 925.40,
          conversions: 68,
          conversionValue: 4250.25,
          customerId: "google_customer_1",
          userId: userId,
          syncDate: new Date()
        }
      ];
      
      // Save Amazon campaign metrics to database
      const savedAmazonCampaigns = [];
      for (const campaign of amazonSampleCampaigns) {
        const savedCampaign = await storage.saveCampaignMetrics(campaign);
        savedAmazonCampaigns.push(savedCampaign);
      }
      
      // Save Google campaign metrics to database
      const savedGoogleCampaigns = [];
      for (const campaign of googleSampleCampaigns) {
        const savedCampaign = await storage.saveGoogleCampaignMetrics(campaign);
        savedGoogleCampaigns.push(savedCampaign);
      }
      
      return res.json({
        message: "Sample campaign data created successfully",
        amazonCampaigns: savedAmazonCampaigns,
        googleCampaigns: savedGoogleCampaigns
      });
    } catch (error) {
      console.error('Error creating sample data:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        message: "Failed to create sample data", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
  
  // Endpoint to index campaign data for RAG
  app.post("/api/rag/index-campaigns", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Unauthorized");
    }
    
    const { id: userId } = req.user;
    
    try {
      // Import services dynamically
      const { generateEmbedding } = await import('./services/embedding');
      const { storeCampaignEmbedding } = await import('./services/pinecone');
      
      // Get campaign metrics from the last 90 days
      const today = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      // Fetch all campaign metrics
      console.log(`Fetching campaign metrics for user ${userId} from the last 90 days`);
      const amazonMetrics = await storage.getCampaignMetrics(userId, ninetyDaysAgo, today);
      const googleMetrics = await storage.getGoogleCampaignMetrics(userId, ninetyDaysAgo, today);
      
      console.log(`Found ${amazonMetrics.length} Amazon campaigns and ${googleMetrics.length} Google campaigns`);
      
      // Process and index Amazon campaigns
      const amazonResults = await Promise.all(amazonMetrics.map(async (campaign) => {
        try {
          // Format campaign data for embedding
          const campaignText = `Campaign: ${campaign.campaignName}
Platform: Amazon Ads
ID: ${campaign.campaignId}
Type: ${campaign.campaignType}
Budget: ${campaign.dailyBudget}
Status: ${campaign.status}
Targeting: ${campaign.targetingType}
Start Date: ${campaign.startDate.toISOString().split('T')[0]}
Metrics (Last 30 Days):
  Impressions: ${campaign.impressions}
  Clicks: ${campaign.clicks}
  CTR: ${(campaign.clicks / (campaign.impressions || 1) * 100).toFixed(2)}%
  Spend: $${campaign.spend ? campaign.spend.toFixed(2) : '0.00'}
  Sales: $${campaign.sales ? campaign.sales.toFixed(2) : '0.00'}
  ACOS: ${(campaign.spend / (campaign.sales || 1) * 100).toFixed(2)}%
  ROAS: ${(campaign.sales / (campaign.spend || 1)).toFixed(2)}`;
          
          // Generate embedding
          const embedding = await generateEmbedding(campaignText);
          
          // Store in Pinecone and PostgreSQL
          await storeCampaignEmbedding(embedding, {
            id: campaign.campaignId,
            name: campaign.campaignName,
            platformType: 'amazon',
            description: campaignText,
            metrics: {
              impressions: campaign.impressions,
              clicks: campaign.clicks,
              spend: campaign.spend,
              sales: campaign.sales
            }
          }, userId);
          
          return {
            campaignId: campaign.campaignId,
            status: 'indexed'
          };
        } catch (error) {
          console.error(`Error indexing Amazon campaign ${campaign.campaignId}:`, error);
          return {
            campaignId: campaign.campaignId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }));
      
      // Process and index Google campaigns
      const googleResults = await Promise.all(googleMetrics.map(async (campaign) => {
        try {
          // Format campaign data for embedding
          const campaignText = `Campaign: ${campaign.campaignName}
Platform: Google Ads
ID: ${campaign.campaignId}
Type: ${campaign.campaignType}
Budget: ${campaign.dailyBudget}
Status: ${campaign.status}
Network: ${campaign.network || 'Unknown'}
Start Date: ${campaign.startDate.toISOString().split('T')[0]}
Metrics (Last 30 Days):
  Impressions: ${campaign.impressions}
  Clicks: ${campaign.clicks}
  CTR: ${(campaign.clicks / (campaign.impressions || 1) * 100).toFixed(2)}%
  Cost: $${campaign.cost ? campaign.cost.toFixed(2) : '0.00'}
  Conversions: ${campaign.conversions || 0}
  Conversion Value: $${campaign.conversionValue ? campaign.conversionValue.toFixed(2) : '0.00'}
  CPA: $${campaign.conversions ? (campaign.cost / campaign.conversions).toFixed(2) : 'N/A'}
  ROAS: ${campaign.conversionValue ? (campaign.conversionValue / (campaign.cost || 1)).toFixed(2) : 'N/A'}`;
          
          // Generate embedding
          const embedding = await generateEmbedding(campaignText);
          
          // Store in Pinecone and PostgreSQL
          await storeCampaignEmbedding(embedding, {
            id: campaign.campaignId,
            name: campaign.campaignName,
            platformType: 'google',
            description: campaignText,
            metrics: {
              impressions: campaign.impressions,
              clicks: campaign.clicks,
              cost: campaign.cost,
              conversions: campaign.conversions,
              conversionValue: campaign.conversionValue
            }
          }, userId);
          
          return {
            campaignId: campaign.campaignId,
            status: 'indexed'
          };
        } catch (error) {
          console.error(`Error indexing Google campaign ${campaign.campaignId}:`, error);
          return {
            campaignId: campaign.campaignId,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }));
      
      // Return results
      return res.json({
        message: "Campaign indexing complete",
        totalIndexed: amazonResults.length + googleResults.length,
        amazonResults,
        googleResults
      });
    } catch (error) {
      console.error('Error indexing campaigns:', error instanceof Error ? error.message : 'Unknown error');
      return res.status(500).json({ 
        message: "Failed to index campaigns", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Admin endpoint to run database migrations
  // Temporarily allowing migration runs without authentication for development
  app.post("/api/admin/run-migrations", async (req: Request, res: Response) => {
    // Comment out authentication check to allow for initial setup
    // TODO: Re-enable this authentication check in production
    // if (!req.isAuthenticated() || !req.user) {
    //   return res.status(401).send("Unauthorized");
    // }
    
    try {
      // Import runtime dependencies for migrations
      const { runMigrations } = await import('./run-migrations');
      
      // Run migrations using the migration service
      const results = await runMigrations();
      
      return res.json({ 
        message: "Migrations completed", 
        results 
      });
    } catch (error) {
      console.error('Error running migrations:', error);
      return res.status(500).json({ 
        message: "Failed to run migrations", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}