import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );

      // Check if the file exists before trying to read it
      if (!fs.existsSync(clientTemplate)) {
        log(`Template file not found at ${clientTemplate}`);
        return next(new Error(`Could not find index.html at ${clientTemplate}`));
      }

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      log(`Error serving client template: ${(e as Error).message}`);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // For local development, we need to check multiple possible locations
  let distPath = path.resolve(__dirname, "public");
  
  // Check if directory exists at the primary location
  if (!fs.existsSync(distPath)) {
    // Try an alternative location (common in local development)
    const altDistPath = path.resolve(__dirname, "..", "dist");
    if (fs.existsSync(altDistPath)) {
      log(`Using alternative build directory: ${altDistPath}`);
      distPath = altDistPath;
    } else {
      throw new Error(
        `Could not find the build directory at ${distPath} or ${altDistPath}. Make sure to build the client first with 'npm run build'`,
      );
    }
  }

  log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    
    if (!fs.existsSync(indexPath)) {
      log(`ERROR: index.html not found at ${indexPath}`);
      return res.status(500).send("Server error: Could not find index.html file. Please rebuild the client.");
    }
    
    res.sendFile(indexPath);
  });
}
