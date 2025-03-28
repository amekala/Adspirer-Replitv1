// Script to update all authentication middleware in the routes.ts file
import fs from 'fs';
import path from 'path';

const routesFile = path.resolve('./server/routes.ts');

// Read the file
let content = fs.readFileSync(routesFile, 'utf8');

// Replace all instances of req.isAuthenticated() checks with our middleware
const replacePattern = /app\.(get|post|put|delete)\("\/api\/([^"]+)", async \(req: Request, res: Response\) => {\n\s+if \(!req\.isAuthenticated\(\)\)[\w\s]+return res\.sendStatus\(401\);/g;
const replacement = 'app.$1("/api/$2", authenticate, async (req: Request, res: Response) => {';

// Special case for chat completions endpoint
const completionsPattern = /app\.post\("\/api\/chat\/completions", async \(req: Request, res: Response\) => {\n\s+if \(!req\.isAuthenticated\(\) \|\| !req\.user\) {[\s\S]+?return res\.status\(401\)\.send\("Unauthorized"\);[\s\S]+?}/g;
const completionsReplacement = 'app.post("/api/chat/completions", authenticate, async (req: Request, res: Response) => {';

// Apply replacements
content = content.replace(replacePattern, replacement);
content = content.replace(completionsPattern, completionsReplacement);

// Write back to the file
fs.writeFileSync(routesFile, content, 'utf8');

console.log('Authentication middleware updated successfully');