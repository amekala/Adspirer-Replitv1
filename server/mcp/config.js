import dotenv from 'dotenv';

// Load environment variables from .env file if present
dotenv.config();

export const config = {
  database: {
    url: process.env.DATABASE_URL,
    // Fallback options if individual components are provided
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE
  }
};

export function getDatabaseUrl() {
  if (config.database.url) {
    return config.database.url;
  }
  
  // Check if we have all individual components
  const { host, port, user, password, database } = config.database;
  if (host && port && user && password && database) {
    return `postgres://${user}:${password}@${host}:${port}/${database}`;
  }
  
  throw new Error(
    'Database configuration missing. Please provide either DATABASE_URL or all individual connection parameters (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE)'
  );
}
