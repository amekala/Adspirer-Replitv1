import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertApiKeySchema, insertAdvertiserSchema } from "@shared/schema";
import { campaignMetrics } from "@shared/schema";

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

    const token = await storage.getAmazonToken(req.user!.id);
    if (!token) {
      return res.status(400).json({ message: "Amazon account not connected" });
    }

    // Start async processing and return immediately
    res.status(202).json({ message: "Campaign sync started" });

    // Process in background
    (async () => {
      try {
        const clientId = process.env.VITE_AMAZON_CLIENT_ID || process.env.AMAZON_CLIENT_ID;
        const profiles = await storage.getAdvertiserAccounts(req.user!.id);

        console.log(`Starting campaign sync for ${profiles.length} profiles`);

        for (const profile of profiles) {
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7); // Last 7 days

          const reportRequest = {
            name: `SP campaigns report ${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}`,
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

          console.log(`Requesting report for profile ${profile.profileId}`);

          try {
            // Step 1: Request report generation
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
              continue;
            }

            const { reportId } = await createReportResponse.json();
            console.log(`Got report ID ${reportId} for profile ${profile.profileId}`);

            // Step 2: Poll for report completion (with timeout)
            let attempts = 0;
            const maxAttempts = 30; // 5 minutes maximum (10 second intervals)
            let reportData = null;

            while (attempts < maxAttempts) {
              const reportStatusResponse = await fetch(`https://advertising-api.amazon.com/reporting/reports/${reportId}`, {
                headers: {
                  "Amazon-Advertising-API-ClientId": clientId!,
                  "Amazon-Advertising-API-Scope": profile.profileId,
                  "Authorization": `Bearer ${token.accessToken}`
                }
              });

              if (!reportStatusResponse.ok) {
                console.error(`Failed to check report status:`, await reportStatusResponse.text());
                break;
              }

              const statusData = await reportStatusResponse.json();
              console.log(`Report status for ${reportId}:`, statusData.status);

              if (statusData.status === 'COMPLETED') {
                // Download report data
                const reportDataResponse = await fetch(statusData.url);
                if (!reportDataResponse.ok) {
                  console.error(`Failed to download report data:`, await reportDataResponse.text());
                  break;
                }

                reportData = await reportDataResponse.json();
                break;
              } else if (statusData.status === 'FAILED') {
                console.error(`Report generation failed for profile ${profile.profileId}`);
                break;
              }

              // Wait 10 seconds before next attempt
              await new Promise(resolve => setTimeout(resolve, 10000));
              attempts++;
            }

            if (!reportData) {
              console.error(`Failed to get report data after ${maxAttempts} attempts`);
              continue;
            }

            // Store the metrics
            for (const record of reportData.data || []) {
              try {
                await storage.saveCampaignMetrics({
                  userId: req.user!.id,
                  profileId: profile.profileId,
                  campaignId: record.campaignId,
                  adGroupId: record.adGroupId,
                  date: record.date,
                  impressions: record.impressions,
                  clicks: record.clicks,
                  cost: record.cost
                });
              } catch (error) {
                console.error(`Error saving metrics for record:`, record, error);
              }
            }

            console.log(`Saved metrics for profile ${profile.profileId}`);
          } catch (error) {
            console.error(`Error processing profile ${profile.profileId}:`, error);
          }
        }

        console.log('Campaign sync completed');
      } catch (error) {
        console.error("Error in background campaign sync:", error);
      }
    })().catch(console.error);
  });

  const httpServer = createServer(app);
  return httpServer;
}