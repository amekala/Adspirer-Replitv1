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

        const syncStartTime = new Date();
        console.log(`Starting campaign sync for ${profiles.length} profiles at ${syncStartTime.toISOString()}`);

        // Track success rates
        const profileStats = {
          total: profiles.length,
          success: 0,
          failed: 0,
          byMarketplace: {} as Record<string, { success: number; failed: number }>
        };

        for (const profile of profiles) {
          const profileStartTime = new Date();
          console.log(`\n=== Processing profile ${profile.profileId} (${profile.marketplace}) ===`);
          console.log(`Started at: ${profileStartTime.toISOString()}`);

          // Initialize marketplace stats if not exists
          if (!profileStats.byMarketplace[profile.marketplace]) {
            profileStats.byMarketplace[profile.marketplace] = { success: 0, failed: 0 };
          }

          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7); // Last 7 days

          const reportRequest = {
            name: `SP campaigns report ${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}_${Date.now()}`,
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
                    const reportStatusResponse = await fetch(`https://advertising-api.amazon.com/reporting/reports/${existingReportId}`, {
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
                      console.log(`Successfully downloaded report data with ${reportData.data?.length || 0} records`);
                      break;
                    } else if (statusData.status === 'FAILED') {
                      console.error(`Report generation failed for profile ${profile.profileId}`);
                      break;
                    } else if (statusData.status === 'PENDING' || statusData.status === 'IN_PROGRESS') {
                      console.log(`Report is still ${statusData.status} for ${existingReportId}`);
                    }

                    // Wait before next attempt with exponential backoff
                    const backoffTime = Math.min(10000 * Math.pow(1.2, attempts), 30000);
                    console.log(`Waiting ${backoffTime/1000} seconds before next status check`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                    attempts++;
                  }

                  if (!reportData) {
                    console.error(`Failed to get report data after ${maxAttempts} attempts for ${existingReportId}`);
                    profileStats.failed++;
                    profileStats.byMarketplace[profile.marketplace].failed++;
                  } else {
                    let recordsProcessed = 0;
                    // Store the metrics
                    for (const record of reportData.data || []) {
                      try {
                        console.log(`Processing record:`, record);
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
                        recordsProcessed++;
                      } catch (error) {
                        console.error(`Error saving metrics for record:`, record, error);
                      }
                    }

                    console.log(`Successfully processed ${recordsProcessed} records for profile ${profile.profileId}`);
                    profileStats.success++;
                    profileStats.byMarketplace[profile.marketplace].success++;
                  }
                  continue;
                }
              }
              profileStats.failed++;
              profileStats.byMarketplace[profile.marketplace].failed++;
              continue;
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
                status: "PENDING"
              });
            } catch (error) {
              console.error(`Error creating report record:`, error);
              profileStats.failed++;
              profileStats.byMarketplace[profile.marketplace].failed++;
              continue;
            }


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
                  console.log(`Successfully downloaded report data with ${reportData.data?.length || 0} records`);
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
                profileStats.failed++;
                profileStats.byMarketplace[profile.marketplace].failed++;
                break;
              }


              // Exponential backoff
              const backoffTime = Math.min(10000 * Math.pow(1.2, attempts), 30000);
              console.log(`Waiting ${backoffTime/1000} seconds before next status check`);
              await new Promise(resolve => setTimeout(resolve, backoffTime));
              attempts++;
            }

            if (!reportData) {
              console.error(`Failed to get report data after ${maxAttempts} attempts`);
              profileStats.failed++;
              profileStats.byMarketplace[profile.marketplace].failed++;
              continue;
            }

            let recordsProcessed = 0;
            // Store the metrics
            for (const record of reportData.data || []) {
              try {
                console.log(`Processing record:`, record);
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
                recordsProcessed++;
              } catch (error) {
                console.error(`Error saving metrics for record:`, record, error);
              }
            }

            console.log(`Successfully processed ${recordsProcessed} records for profile ${profile.profileId}`);
            profileStats.success++;
            profileStats.byMarketplace[profile.marketplace].success++;

          } catch (error) {
            console.error(`Error processing profile ${profile.profileId}:`, error);
            profileStats.failed++;
            profileStats.byMarketplace[profile.marketplace].failed++;
          }

          const profileEndTime = new Date();
          const profileDuration = (profileEndTime.getTime() - profileStartTime.getTime()) / 1000;
          console.log(`\nProfile ${profile.profileId} processing completed`);
          console.log(`Duration: ${profileDuration} seconds`);
          console.log(`End time: ${profileEndTime.toISOString()}\n`);
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

  const httpServer = createServer(app);
  return httpServer;
}