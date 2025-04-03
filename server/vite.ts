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
    allowedHosts: true as const,
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
  // For production builds, we need to check multiple possible locations
  const possiblePaths = [
    path.resolve(__dirname, "public"),               // Default build output
    path.resolve(__dirname, "..", "dist", "public"), // Local build output
    path.resolve(__dirname, "..", "public"),         // Root public folder
    path.resolve(process.cwd(), "dist", "public"),   // Vercel build output
    path.resolve(process.cwd(), "public")            // Vercel root public
  ];
  
  let distPath = null;
  
  // Find the first path that exists
  for (const pathToCheck of possiblePaths) {
    if (fs.existsSync(pathToCheck)) {
      distPath = pathToCheck;
      log(`Using build directory: ${distPath}`);
      break;
    }
  }
  
  if (!distPath) {
    log(`WARNING: Could not find build directory. Serving from current directory.`);
    distPath = path.resolve(process.cwd());
  }

  log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
  
  // Also serve static assets from /static path for non-root assets
  if (fs.existsSync(path.join(distPath, "static"))) {
    app.use("/static", express.static(path.join(distPath, "static")));
  }

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    let indexPath = path.resolve(distPath, "index.html");
    
    // Try alternatives if not found
    if (!fs.existsSync(indexPath)) {
      const alternatives = [
        path.resolve(__dirname, "..", "dist", "public", "index.html"),
        path.resolve(process.cwd(), "dist", "public", "index.html"),
        path.resolve(process.cwd(), "client", "dist", "index.html")
      ];
      
      for (const altPath of alternatives) {
        if (fs.existsSync(altPath)) {
          indexPath = altPath;
          log(`Using alternative index.html: ${indexPath}`);
          break;
        }
      }
    }
    
    if (!fs.existsSync(indexPath)) {
      log(`ERROR: index.html not found at ${indexPath}`);
      return res.status(500).send("Server error: Could not find index.html file. Please rebuild the client.");
    }
    
    res.sendFile(indexPath);
  });
}
