# Adspirer - Full Stack Application

A full-stack application with React frontend and Express backend that works consistently in both local development and Vercel production environments.

## Project Structure

```
├── client/               # React frontend
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   ├── index.html        # Entry HTML
│   └── package.json      # Client dependencies
├── server/               # Express backend
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── db.ts             # Database connection
│   ├── auth.ts           # Authentication
│   └── vite.ts           # Vite integration
├── shared/               # Shared code between client and server
├── migrations/           # Database migrations
├── dist/                 # Build output (generated)
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind configuration
├── vercel.json           # Vercel deployment configuration
└── package.json          # Root dependencies and scripts
```

## Development

### Local Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   cd client && npm install && cd ..
   ```
3. Create a `.env` file in the root with necessary environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open http://localhost:5000 in your browser

### Building for Production

```bash
npm run build
```

This will:
1. Clean the dist directory
2. Build the client with Vite
3. Bundle the server with esbuild
4. Copy static assets

### Running in Production Mode Locally

```bash
npm start
```

## Deployment to Vercel

### Setup

1. Connect your GitHub repository to Vercel
2. Configure the following build settings:
   - Framework Preset: Other
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. Set all necessary environment variables in the Vercel dashboard:
   - DATABASE_URL
   - SESSION_SECRET
   - Other API keys and credentials

### Troubleshooting

If you encounter issues with Vercel deployment:

1. **API Routes Not Working**: Ensure your Vercel configuration correctly routes API paths to the server
2. **CSS Problems**: Check that Tailwind is properly configured with all possible content paths
3. **Environment Variables**: Make sure all required environment variables are set in Vercel's dashboard
4. **Caching Issues**: Clear Vercel's build cache if you're seeing old content

## File Organization Best Practices

1. All React components should go in `client/src/components/`
2. API routes should be organized in `server/routes.ts`
3. Share types and utilities between client and server in the `shared/` folder
4. Keep database schema and migrations in the `migrations/` folder

## License

MIT

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