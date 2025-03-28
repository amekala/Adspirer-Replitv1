// Direct SQL queries to test the database
import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Initialize dotenv
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not set in environment');
  process.exit(1);
}

// Create postgres client
const sql = postgres(databaseUrl);

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    console.log(`Connecting to: ${new URL(databaseUrl).host}${new URL(databaseUrl).pathname}`);
    
    // Test 1: Check tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Tables in database:');
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    // Test 2: Check if campaign_metrics has data
    const amazonResult = await sql`
      SELECT COUNT(*) as amazon_count 
      FROM campaign_metrics
    `;
    console.log('\nAmazon campaign metrics count:', amazonResult[0].amazon_count);
    
    // Test 3: Check if google_campaign_metrics has data
    const googleResult = await sql`
      SELECT COUNT(*) as google_count 
      FROM google_campaign_metrics
    `;
    console.log('Google campaign metrics count:', googleResult[0].google_count);
    
    // Test 4: Sample Google campaign metrics data
    if (parseInt(googleResult[0].google_count) > 0) {
      const googleSample = await sql`
        SELECT user_id, COUNT(DISTINCT campaign_id) as campaign_count 
        FROM google_campaign_metrics 
        GROUP BY user_id
      `;
      console.log('\nGoogle campaigns by user:');
      googleSample.forEach(row => {
        console.log(`- User ${row.user_id}: ${row.campaign_count} campaigns`);
      });
      
      // Test 5: Check specific user's data
      const userIds = await sql`SELECT DISTINCT user_id FROM google_campaign_metrics LIMIT 1`;
      if (userIds.length > 0) {
        const userId = userIds[0].user_id;
        const userCampaigns = await sql`
          SELECT campaign_id, COUNT(*) as entry_count
          FROM google_campaign_metrics
          WHERE user_id = ${userId}
          GROUP BY campaign_id
          LIMIT 5
        `;
        console.log(`\nSample campaigns for user ${userId}:`);
        userCampaigns.forEach(row => {
          console.log(`- Campaign ${row.campaign_id}: ${row.entry_count} data points`);
        });
      }
    }
    
    console.log('\nConnection and data tests successful!');
  } catch (err) {
    console.error('Database error:', err);
  } finally {
    // Close connection
    await sql.end();
  }
}

testDatabase().then(() => {
  console.log('Tests completed');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});