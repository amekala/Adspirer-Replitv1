# Adspirer - Local Development Setup

## Prerequisites

1. Node.js (v16+)
2. PostgreSQL (v13+)
3. npm or yarn

## Getting Started

### Option 1: Using the setup script (Linux/macOS)

1. Clone the repository
2. Run the setup script:

```bash
./run-local.sh
```

This script will:
- Check if PostgreSQL is installed
- Create the "adspirer" database if it doesn't exist
- Apply database migrations
- Install dependencies
- Start the development server

### Option 2: Manual setup

1. Install PostgreSQL and create a database:

```bash
# macOS
brew install postgresql
brew services start postgresql
createdb adspirer

# Ubuntu
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb adspirer
```

2. Set up environment variables:

Update the `.env` file with your local database credentials:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/adspirer?sslmode=prefer
PGDATABASE=adspirer
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
NODE_ENV=development
PORT=5000
```

3. Install dependencies:

```bash
npm install
```

4. Apply database migrations:

```bash
npm run db:push
```

5. Start the development server:

```bash
npm run dev
```

## Chat-First Interface

The application now features a chat-first interface design that places the conversational AI experience at the center of the user experience:

### Key Features

- **Two-Panel Layout**: Left sidebar for conversation history and right panel for chat interaction
- **Seamless Settings Integration**: Settings panel smoothly replaces the chat area while maintaining the sidebar
- **Integrated Platform Connections**: All advertising platform connections are now accessible through the Settings panel

### Navigation Flow

1. **Home Screen**: Users land directly in the chat interface after login
2. **New Conversations**: Create new conversations via the button in the left sidebar
3. **Settings Access**: Access settings by clicking the Settings button at the bottom of the sidebar
4. **Platform Connections**: Connect advertising platforms through the Connections tab in Settings

### Settings Organization

The Settings panel is organized into five sections:
- **Profile**: User account settings
- **Brand**: Brand identity settings
- **Connections**: Advertising platform integrations (previously in Dashboard)
- **Subscription**: Subscription management
- **API Access**: API key management (previously in Dashboard)

## Accessing the Application

- Web interface: http://localhost:5000
- API: http://localhost:5000/api
- Health check: http://localhost:5000/health

## Database Schema

The application uses Drizzle ORM with the following main tables:
- users - User accounts
- amazon_tokens - Amazon API authentication tokens
- google_tokens - Google API authentication tokens
- advertiser_accounts - Amazon advertiser accounts
- google_advertiser_accounts - Google advertiser accounts
- campaign_metrics - Amazon campaign performance data
- google_campaign_metrics - Google campaign performance data
- chat_conversations - User chat conversations
- chat_messages - Individual chat messages