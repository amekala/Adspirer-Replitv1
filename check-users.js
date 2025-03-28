// Check users in the database
import dotenv from 'dotenv';
import postgres from 'postgres';

// Initialize dotenv
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not set in environment');
  process.exit(1);
}

// Create postgres client
const sql = postgres(databaseUrl);

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    // Query for users
    const users = await sql`SELECT id, email FROM users LIMIT 5`;
    console.log('Users in database:', users);
    
    if (users.length === 0) {
      console.log('\nNo users found. Creating test user...');
      
      // Check if uuid-ossp extension is available
      const hasUuidOssp = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
        ) as has_extension
      `;
      
      if (hasUuidOssp[0].has_extension) {
        console.log('uuid-ossp extension is available, creating user with UUID...');
        
        // Create a test user
        const newUser = await sql`
          INSERT INTO users (id, email, name, password) 
          VALUES (uuid_generate_v4(), 'test@example.com', 'Test User', 'password')
          RETURNING id, email
        `;
        
        console.log('Created test user:', newUser[0]);
        
        // Use this user ID for test data
        return newUser[0].id;
      } else {
        console.log('uuid-ossp extension not available. Using hardcoded UUID.');
        const hardcodedUuid = '123e4567-e89b-12d3-a456-426614174000';
        
        // Create test user with hardcoded UUID
        const newUser = await sql`
          INSERT INTO users (id, email, name, password) 
          VALUES (${hardcodedUuid}, 'test@example.com', 'Test User', 'password')
          RETURNING id, email
        `;
        
        console.log('Created test user:', newUser[0]);
        return hardcodedUuid;
      }
    } else {
      console.log('\nUsing existing user for tests:', users[0]);
      return users[0].id;
    }
  } catch (err) {
    console.error('Error checking/creating users:', err);
    return null;
  } finally {
    await sql.end();
  }
}

// Run the check
checkUsers().then(userId => {
  if (userId) {
    console.log(`\nTest user ID to use: ${userId}`);
  }
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});