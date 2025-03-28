// Simple script to create a test user
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createTestUser() {
  try {
    const client = postgres(process.env.DATABASE_URL);
    
    // Check if user already exists
    const existingUsers = await client`
      SELECT * FROM users WHERE email = 'abhilashreddi@gmail.com'
    `;
    
    if (existingUsers.length > 0) {
      console.log('User already exists, updating password');
      const hashedPassword = await hashPassword('T1l1icron!');
      await client`
        UPDATE users 
        SET password = ${hashedPassword}
        WHERE email = 'abhilashreddi@gmail.com'
      `;
      console.log('Password updated successfully');
    } else {
      console.log('Creating new user');
      const hashedPassword = await hashPassword('T1l1icron!');
      await client`
        INSERT INTO users (email, password, role, created_at)
        VALUES ('abhilashreddi@gmail.com', ${hashedPassword}, 'user', NOW())
      `;
      console.log('User created successfully');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestUser();