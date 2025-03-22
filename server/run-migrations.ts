/**
 * Database migration runner script
 * This file handles automatic migration execution during server startup
 */

import fs from 'fs';
import path from 'path';
import { pool } from './db';
import { log } from './vite';

/**
 * Run all SQL migration files in the migrations directory
 * Files are executed in alphabetical order
 */
export async function runMigrations() {
  try {
    log('Starting database migrations...', 'migration');
    
    // Get all migration files
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure files are processed in alphabetical order
    
    // Create migrations tracking table if it doesn't exist
    await createMigrationsTable();
    
    // Get executed migrations from database
    const executed = await getExecutedMigrations();
    const executedFilenames = executed.map(m => m.filename);
    
    // Filter out already executed migrations
    const pendingMigrations = migrationFiles.filter(file => !executedFilenames.includes(file));
    
    if (pendingMigrations.length === 0) {
      log('No pending migrations to run.', 'migration');
      return [];
    }
    
    log(`Found ${pendingMigrations.length} pending migrations to run.`, 'migration');
    
    const results = [];
    
    // Execute each pending migration
    for (const file of pendingMigrations) {
      try {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        log(`Running migration: ${file}`, 'migration');
        
        // Begin transaction
        await pool.query('BEGIN');
        
        try {
          // Execute the migration script
          await pool.query(sql);
          
          // Record successful migration
          await recordMigration(file);
          
          // Commit transaction
          await pool.query('COMMIT');
          
          log(`Migration ${file} completed successfully.`, 'migration');
          results.push({ file, status: 'success' });
        } catch (error) {
          // Rollback on error
          await pool.query('ROLLBACK');
          throw error;
        }
      } catch (error) {
        log(`Error running migration ${file}: ${error instanceof Error ? error.message : String(error)}`, 'migration');
        results.push({ 
          file, 
          status: 'error', 
          message: error instanceof Error ? error.message : String(error) 
        });
        
        // Exit early on first migration failure
        break;
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    if (errorCount === 0) {
      log(`Successfully ran ${successCount} migrations.`, 'migration');
    } else {
      log(`Migrations completed with errors. Success: ${successCount}, Failed: ${errorCount}`, 'migration');
    }
    
    return results;
  } catch (error) {
    log(`Failed to run migrations: ${error instanceof Error ? error.message : String(error)}`, 'migration');
    return [{ status: 'error', message: 'Failed to run migrations' }];
  }
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `;
  
  try {
    await pool.query(query);
  } catch (error) {
    log(`Error creating migrations table: ${error instanceof Error ? error.message : String(error)}`, 'migration');
    throw error;
  }
}

/**
 * Get list of already executed migrations
 */
async function getExecutedMigrations() {
  try {
    const result = await pool.query('SELECT filename, executed_at FROM migrations ORDER BY executed_at');
    return result.rows;
  } catch (error) {
    log(`Error fetching executed migrations: ${error instanceof Error ? error.message : String(error)}`, 'migration');
    return [];
  }
}

/**
 * Record a successful migration in the tracking table
 */
async function recordMigration(filename: string) {
  try {
    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
  } catch (error) {
    log(`Error recording migration: ${error instanceof Error ? error.message : String(error)}`, 'migration');
    throw error;
  }
}