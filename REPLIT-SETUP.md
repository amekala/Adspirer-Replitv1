# Replit Setup Guide

## Environment Variables

For Replit deployment, you need to add the following secrets in the Replit Secrets tab:

1. SESSION_SECRET
2. AMAZON_CLIENT_SECRET
3. VITE_AMAZON_CLIENT_ID
4. VITE_AMAZON_CLIENT_SECRET
5. DATABASE_URL
6. PGDATABASE
7. PGHOST
8. PGPORT
9. PGUSER
10. PGPASSWORD

## How to Add Secrets in Replit

1. Go to the "Secrets" tab in your Replit project
2. Click "Add new secret"
3. Enter the key (e.g., SESSION_SECRET) and the value
4. Click "Add Secret"
5. Repeat for all required secrets

## Running the Project

In Replit, the project should automatically start when you press the "Run" button.

## Database

The database constraint for the users table is already correctly named as `users_email_unique`, which matches what Drizzle ORM expects. 