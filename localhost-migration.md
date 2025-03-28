# Replit to Localhost Migration

This document outlines the changes made to migrate the Adspirer project from Replit to local development.

## Changes Made

1. **Database Configuration**
   - Updated `db.ts` to use standard postgres client instead of Neon serverless
   - Configured local PostgreSQL connection in `.env` file
   - Added migration scripts for database setup

2. **Environment Variables**
   - Created a proper `.env` file with local development settings
   - Added explicit loading of environment variables with dotenv
   - Added OpenAI API key configuration

3. **Server Configuration**
   - Modified server to bind to localhost instead of 0.0.0.0
   - Adjusted health check intervals for local development
   - Improved error handling in static file serving

4. **Developer Tools**
   - Created `run-local.sh` script for easy setup and startup
   - Added `create-local-db.sh` script for database initialization
   - Updated README with local development instructions

5. **File Path Handling**
   - Added more robust file path checking in vite.ts
   - Added fallback paths for static file serving

## How to Run

1. Make sure PostgreSQL is installed and running
2. Edit `.env` file to set your database credentials and OpenAI API key
3. Run `./run-local.sh` to set up the database and start the application
4. Access the application at http://localhost:5000

## Troubleshooting

- **Database Connection Issues**: Verify PostgreSQL is running and the connection credentials in `.env` are correct
- **Missing Files**: Make sure to run `npm install` before starting the application
- **OpenAI Integration**: Valid OpenAI API key is required for chat functionality