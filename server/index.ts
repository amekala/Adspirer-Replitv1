  import express, { type Request, Response, NextFunction } from "express";
  import { registerRoutes } from "./routes";
  import { setupVite, serveStatic, log } from "./vite";
  import { request, IncomingMessage } from "http";
  import { startScheduledTasks } from "./maintenance/scheduleTasks";
  import dotenv from "dotenv";
  
  // Load environment variables from .env file
  dotenv.config();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        log(logLine);
      }
    });

    next();
  });

  (async () => {
    const server = await registerRoutes(app);

    // Add a health check endpoint that Replit can use to detect the server
    app.get("/health", (req, res) => {
      res.status(200).send("OK");
    });

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Use the port provided by environment variable or default to 5000
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    
    // For local development, we don't need frequent health checks
    // But keep a simpler version for basic monitoring
    const healthCheckInterval = 30000; // 30 seconds
    
    setInterval(() => {
      try {
        const req = request({
          host: 'localhost',
          port: port,
          path: '/health',
          method: 'GET'
        }, (res: IncomingMessage) => {
          const { statusCode } = res;
          if (statusCode !== 200) {
            log(`Health check ping failed with status: ${statusCode}`);
          }
        });
        req.on('error', (e: Error) => {
          log(`Health check error: ${e.message}`);
        });
        req.end();
      } catch (error) {
        log(`Error sending health check: ${error}`);
      }
    }, healthCheckInterval);

    server.listen(port, "localhost", () => {
      log(`Server is running on port ${port}`);
      
      // More descriptive logs for local development
      console.log(`🚀 Server ready at http://localhost:${port}`);
      console.log(`API available at http://localhost:${port}/api`);
      console.log(`Health check at http://localhost:${port}/health`);
      
      // Start scheduled maintenance tasks
      startScheduledTasks();
    });
  })();
