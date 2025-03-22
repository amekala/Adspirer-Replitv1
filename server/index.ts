  import express, { type Request, Response, NextFunction } from "express";
  import { registerRoutes } from "./routes";
  import { setupVite, serveStatic, log } from "./vite";
  import { request, IncomingMessage } from "http";
  import { runMigrations } from "./run-migrations";

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
    // Bind to 0.0.0.0 to allow external connections (required for Replit)
    const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
    
    // Create a health check ping to keep the port active
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
    }, 5000);

    // Migrations will be run through API endpoint
    log('Application starting - use /api/admin/run-migrations endpoint to apply database migrations');

    server.listen(port, "0.0.0.0", () => {
      log(`Server is running on port ${port}`);
      
      // Log messages specifically for Replit workflow detection
      console.log(`🚀 Server ready at http://0.0.0.0:${port}`);
      console.log(`Server listening on port ${port}`);
      
      // Add initial health check
      setTimeout(() => {
        try {
          const req = request({
            host: 'localhost',
            port: port,
            path: '/health',
            method: 'GET'
          }, (res: IncomingMessage) => {
            console.log(`Initial health check: ${res.statusCode}`);
          });
          req.on('error', (e: Error) => {
            console.error(`Initial health check error: ${e.message}`);
          });
          req.end();
        } catch (error) {
          console.error(`Initial health check failed: ${error}`);
        }
      }, 1000);
    });
  })();
