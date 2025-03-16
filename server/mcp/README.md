# Adspirer MCP Server

This MCP (Model Context Protocol) server enables Claude Desktop integration with Adspirer's Amazon Ads and Google Ads management platform.

## Installation

### Option 1: Global Installation
```bash
npm install -g adspirer-mcp
```

### Option 2: Local Development
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
cd adspirer-mcp
npm install

# Build the package
npm run build

# Start the server
npm start
```

## Configuration

The MCP server requires database connection details. You can provide these in two ways:

### Option 1: Database URL
Set the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgres://user:password@host:port/database"
adspirer-mcp
```

### Option 2: Individual Parameters
Set individual database connection parameters:
```bash
export PGHOST="your-db-host"
export PGPORT="5432"
export PGUSER="your-db-user"
export PGPASSWORD="your-db-password"
export PGDATABASE="your-db-name"
adspirer-mcp
```

You can also create a `.env` file in your working directory with these variables.

## Usage with Claude Desktop

1. Generate an API key from your Adspirer dashboard
2. Download and install Claude Desktop from https://claude.ai/download
3. Open Claude Desktop settings
4. Add a new MCP server:
   - Click "Add Server"
   - Select "Import from file"
   - Choose the `claude-config.json` file from this package
   - Enter your API key when prompted
5. The server should now appear in your MCP servers list
6. Test the connection by asking Claude about your ad campaigns

## Features

### Resources

#### Amazon Advertising
- `amazon-profiles://`: List all Amazon Advertising profiles
- `campaigns://{profileId}`: View campaign performance metrics for a specific profile

#### Google Ads
- `google-accounts://`: List all Google Ads accounts
- `google-campaigns://{customerId}`: View campaign performance for a specific account

### Tools

#### analyze-performance
Analyzes campaign performance with the following parameters:
- `platformType`: "amazon" or "google"
- `accountId`: Amazon profile ID or Google customer ID
- `campaignId`: Campaign ID to analyze
- `dateRange`: Object containing `start` and `end` dates (YYYY-MM-DD format)

### Prompts

#### campaign-insights
Get AI-powered insights about your campaigns:
- `platformType`: "amazon" or "google"
- `accountId`: Account identifier
- `dateRange`: Date range for analysis

## Sample Queries

You can ask Claude questions like:
- "Show me all my Amazon Advertising profiles"
- "What campaigns are running in my Google Ads account?"
- "Analyze the performance of campaign X on Amazon"
- "Compare CTR across my Google Ads campaigns"

## Error Codes

- `-32001`: Invalid API key
- `-32002`: Database error
- `-32003`: Validation error

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Testing with Claude Desktop

1. Install the package locally:
```bash
npm install -g ./
```

2. Test the command-line tool:
```bash
adspirer-mcp
```

3. In Claude Desktop:
   - Open Settings
   - Navigate to MCP Servers
   - Click "Add Server"
   - Import the `claude-config.json` file
   - Enter your API key
   - Test the connection by asking about your campaigns