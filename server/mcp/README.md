# Adspirer MCP Server

This MCP (Model Context Protocol) server enables Claude Desktop integration with Adspirer's Amazon Ads and Google Ads management platform.

## Installation

```bash
npm install adspirer-mcp
```

## Usage with Claude Desktop

1. Generate an API key from your Adspirer dashboard
2. Download the Claude Desktop app
3. Open Claude Desktop settings
4. Add a new MCP server using the following configuration:
   - Copy the contents of `claude-config.json` into a new file
   - Enter your API key when prompted

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