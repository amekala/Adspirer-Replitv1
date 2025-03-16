import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from "child_process";

// Get current file path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the MCP server
console.log("Starting MCP server...");
const serverPath = join(__dirname, "index.ts");
const child = exec(`tsx ${serverPath}`);

child.stdout?.pipe(process.stdout);
child.stderr?.pipe(process.stderr);

process.on("SIGINT", () => {
  child.kill();
  process.exit();
});