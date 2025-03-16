import { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertApiKeySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Amazon OAuth endpoints
  app.post("/api/amazon/connect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Authorization code required" });
    }

    // Use either VITE_AMAZON_CLIENT_ID or AMAZON_CLIENT_ID
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
      const response = await fetch("https://api.amazon.com/auth/o2/token", {
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

      if (!response.ok) {
        const error = await response.text();
        console.error("Amazon OAuth error response:", error);
        throw new Error(`Failed to exchange authorization code: ${error}`);
      }

      const { access_token, refresh_token, expires_in } = await response.json();

      // Store tokens
      await storage.saveAmazonToken({
        userId: req.user!.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      });

      res.sendStatus(200);
    } catch (error) {
      console.error("Amazon OAuth error:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to connect Amazon account" });
    }
  });

  app.get("/api/amazon/status", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const token = await storage.getAmazonToken(req.user!.id);
    res.json({ connected: !!token });
  });

  app.delete("/api/amazon/disconnect", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    await storage.deleteAmazonToken(req.user!.id);
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

  const httpServer = createServer(app);
  return httpServer;
}