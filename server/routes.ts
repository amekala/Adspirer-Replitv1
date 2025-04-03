import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, authenticate } from "./auth";
import { storage } from "./storage";
import { openai } from "./services/openai-client";
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
} from "./db/schema";

interface AmazonToken {
  id: number;
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
  id: number;
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

  // Chat API endpoints
  app.get("/api/chat/conversations", authenticate, async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getChatConversations(req.user!.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching chat conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post("/api/chat/conversations", authenticate, async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await storage.createChatConversation(req.user!.id, title || "New conversation");
      
      // Import the OpenAI service to generate the welcome message
      const { generateWelcomeMessage } = await import("./services/openai");
      
      // Generate a welcome message for the new conversation
      await generateWelcomeMessage(conversation.id, req.user!.id);
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating chat conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      const conversation = await storage.getChatConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user owns this conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      const messages = await storage.getChatMessages(conversationId);
      
      res.json({ 
        conversation, 
        messages 
      });
    } catch (error) {
      console.error("Error fetching chat conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.put("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      const { title } = req.body;
      
      const conversation = await storage.getChatConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user owns this conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      const updatedConversation = await storage.updateChatConversationTitle(conversationId, title);
      res.json(updatedConversation);
    } catch (error) {
      console.error("Error updating chat conversation:", error);
      res.status(500).json({ message: "Failed to update conversation" });
    }
  });

  app.delete("/api/chat/conversations/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      
      const conversation = await storage.getChatConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user owns this conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      await storage.deleteChatConversation(conversationId);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting chat conversation:", error);
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  app.post("/api/chat/conversations/:id/messages", authenticate, async (req: Request, res: Response) => {
    try {
      const conversationId = req.params.id;
      const { role, content, metadata } = req.body;
      
      const conversation = await storage.getChatConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user owns this conversation
      if (conversation.userId !== req.user!.id) {
        return res.status(403).json({ message: "Unauthorized access to conversation" });
      }
      
      // Create the user's message
      const message = await storage.createChatMessage({
        conversationId,
        role,
        content,
        metadata: metadata || {}
      });
      
      // Now generate an AI response
      const aiMessageText = await handleAIResponse(content, conversationId);
      
      // Create the AI's response message
      const aiMessage = await storage.createChatMessage({
        conversationId,
        role: "assistant",
        content: aiMessageText,
        metadata: {}
      });
      
      res.status(201).json({
        userMessage: message,
        aiMessage
      });
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Helper function to generate AI responses
  async function handleAIResponse(userMessage: string, conversationId: string): Promise<string> {
    try {
      // Get the conversation history for context
      const messages = await storage.getChatMessages(conversationId);
      
      // Get the user information from the most recent message
      const userInfo = await storage.getChatConversation(conversationId);
      const userId = userInfo?.userId;
      
      if (!userId) {
        throw new Error("Unable to determine user ID for this conversation");
      }
      
      // Import function tools and handler
      const { amazonCampaignTools } = await import("./functions/amazon-campaign");
      const { googleCampaignTools } = await import("./functions/google-campaign");
      const { handleFunctionCall } = await import("./functions/handler");
      
      // Combine all available tools - need to format them correctly for the API 
      const tools = [
        ...amazonCampaignTools.map(tool => ({
          type: "function" as const, // Type assertion to ensure it's strictly "function"
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        })),
        ...googleCampaignTools.map(tool => ({
          type: "function" as const, // Type assertion to ensure it's strictly "function"
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          }
        }))
      ];
      
      // Create a system message that describes the AI's role
      const systemMessage = {
        role: "system",
        content: "You are a helpful AI assistant for Adspirer, a marketing platform specializing in retail media optimization. You can provide information about Amazon and Google ad campaigns, suggest optimization strategies, and answer questions about the platform's features. If asked about specific campaign data, suggest using the dashboard for the most up-to-date information. When the user asks to create a campaign or perform other advertising actions, use the available function calls to help them."
      };
      
      // Format the messages for the OpenAI API
      const formattedMessages = [
        systemMessage,
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];
      
      // Add the current user message
      formattedMessages.push({
        role: "user",
        content: userMessage
      });
      
      console.log("Sending message to OpenAI with tools:", tools.map(t => t.function.name));
      
      // Use OpenAI to generate a response with function calling enabled
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
        temperature: 0.7,
        max_tokens: 1000,
        tools: tools,
        tool_choice: "auto"
      });
      
      const responseMessage = response.choices[0].message;
      
      // Check if the AI wants to call a function
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        console.log("AI is calling functions:", responseMessage.tool_calls);
        
        // Process each function call
        const toolResults = [];
        
        for (const toolCall of responseMessage.tool_calls) {
          try {
            // Call the function with the provided arguments
            const functionResult = await handleFunctionCall({
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              }
            }, userId);
            
            // Store the result
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify(functionResult)
            });
            
            console.log(`Function ${toolCall.function.name} result:`, functionResult);
          } catch (error) {
            console.error(`Error calling function ${toolCall.function.name}:`, error);
            toolResults.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: toolCall.function.name,
              content: JSON.stringify({ 
                error: error instanceof Error ? error.message : String(error),
                success: false
              })
            });
          }
        }
        
        // Get a followup response that takes into account the function results
        const followupResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            ...formattedMessages,
            responseMessage,
            ...toolResults
          ],
          temperature: 0.7,
          max_tokens: 1000
        });
        
        return followupResponse.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
      }
      
      // If no function call, return the regular response
      return responseMessage.content || "I'm sorry, I couldn't generate a response.";
    } catch (error) {
      console.error("Error generating AI response:", error);
      return "I apologize, but I encountered an error while processing your request. Please try again later.";
    }
  }

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
          console.log(`${marketplace}: ${stats.success}/${total} (${successRate}%)`)
        });
      } catch (error) {
        console.error("Error processing campaign sync:", error);
        res.status(500).json({ message: "Failed to process campaign sync" });
      }
    })();
  });
}