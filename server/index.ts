import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { request, IncomingMessage, createServer } from "http";
import { startScheduledTasks } from "./maintenance/scheduleTasks";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config();

const isProduction = process.env.NODE_ENV === "production";
const isVercel = process.env.VERCEL === "1";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS setup for development
if (!isProduction) {
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}

// Request logging middleware
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

// Register API routes first
registerRoutes(app);

// Add a health check endpoint that both Vercel and local dev can use
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  console.error(`[ERROR] ${err.stack || err}`);
  res.status(status).json({ message });
});

// Create HTTP server
const server = createServer(app);

// Only setup vite in development and after all API routes
if (!isProduction) {
  setupVite(app, server);
} else {
  serveStatic(app);
}

// Only bind to port when not on Vercel
if (!isVercel) {
  // Use the port provided by environment variable or default to 5000
  const port = process.env.PORT ? parseInt(process.env.PORT) : 5000;
  
  // Health check only needed for local development
  if (!isProduction) {
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
  }

  // Start the server for local development
  server.listen(port, "localhost", () => {
    log(`Server is running on port ${port}`);
    
    // More descriptive logs for local development
    console.log(`🚀 Server ready at http://localhost:${port}`);
    console.log(`API available at http://localhost:${port}/api`);
    console.log(`Health check at http://localhost:${port}/health`);
    
    // Start scheduled maintenance tasks
    if (isProduction) {
      startScheduledTasks();
    }
  });
} else {
  // For Vercel, we don't need to start the server explicitly
  log('Running in Vercel environment - serving as serverless function');
}

// Export the Express app for Vercel
export default app;
