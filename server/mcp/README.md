# Adspirer MCP Server

This MCP (Model Context Protocol) server enables Claude Desktop integration with Adspirer's Amazon Ads and Google Ads management platform.

## Prerequisites

Before using this MCP server, you need:
1. An active Adspirer account
2. An API key from your Adspirer dashboard

## Installation

```bash
npm install -g adspirer-mcp
```

## Usage with Claude Desktop

1. Make sure you have your API key from the Adspirer dashboard
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

### Sample Queries

You can ask Claude questions like:
- "Show me all my Amazon Advertising profiles"
- "What campaigns are running in my Google Ads account?"
- "Analyze the performance of campaign X on Amazon"
- "Compare CTR across my Google Ads campaigns"

## Error Codes

- `-32001`: Invalid API key
- `-32002`: Database error
- `-32003`: Validation error

## Support

If you encounter any issues or need assistance:
1. Ensure you're using a valid API key from your Adspirer dashboard
2. Contact support@adspirer.com for help