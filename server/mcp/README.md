# Adspirer MCP Server

This MCP (Model Context Protocol) server enables Claude Desktop integration with Adspirer's Amazon Ads management platform.

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

- View campaign performance metrics
- Analyze campaign data
- Access real-time advertising insights

## API Reference

### Resources

#### `campaigns://{profileId}`

Returns campaign data for the specified profile ID.

### Tools

#### `analyze-performance`

Analyzes campaign performance with the following parameters:
- `profileId`: Amazon Ads profile ID
- `campaignId`: Campaign ID to analyze
- `dateRange`: Object containing `start` and `end` dates (YYYY-MM-DD format)

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
