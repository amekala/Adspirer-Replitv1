#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from "child_process";

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
console.log("Starting MCP server...");
const serverPath = join(__dirname, "index.js");
const child = spawn("node", [serverPath], {
  stdio: 'inherit'
});

process.on("SIGINT", () => {
  child.kill();
  process.exit();
});
