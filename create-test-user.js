/**
 * Create a test user with properly hashed password
 */

import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import pkg from 'pg';
const { Pool } = pkg;

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      ['testuser@example.com']
    );

    if (checkResult.rows.length > 0) {
      console.log('User already exists, updating password...');
      
      const hashedPassword = await hashPassword('testpass');
      
      await pool.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, 'testuser@example.com']
      );
      
      console.log('Password updated successfully!');
    } else {
      console.log('Creating new test user...');
      
      const hashedPassword = await hashPassword('testpass');
      
      const insertResult = await pool.query(
        'INSERT INTO users (id, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [
          randomBytes(16).toString('hex'), 
          'testuser@example.com',
          hashedPassword,
          'user'
        ]
      );
      
      console.log('User created successfully!');
      console.log('User details:', insertResult.rows[0]);
    }
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await pool.end();
  }
}

createUser();