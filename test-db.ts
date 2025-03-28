import { db, pool } from './server/db';
import { sql } from 'drizzle-orm';

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test 1: Check tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables in database:', tablesResult.map((r: any) => r.table_name));
    
    // Test 2: Check if campaign_metrics has data
    const amazonResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as amazon_count 
      FROM campaign_metrics
    `));
    console.log('Amazon campaign metrics count:', amazonResult.length > 0 ? amazonResult[0].amazon_count : 'No results');
    
    // Test 3: Check if google_campaign_metrics has data
    const googleResult = await db.execute(sql.raw(`
      SELECT COUNT(*) as google_count 
      FROM google_campaign_metrics
    `));
    console.log('Google campaign metrics count:', googleResult.length > 0 ? googleResult[0].google_count : 'No results');
    
    // Test 4: Check campaigns by user
    const userCampaigns = await db.execute(sql.raw(`
      SELECT user_id, COUNT(DISTINCT campaign_id) as campaign_count 
      FROM google_campaign_metrics 
      GROUP BY user_id
    `));
    console.log('Google campaigns by user:');
    if (userCampaigns.length > 0) {
      userCampaigns.forEach((row: any) => {
        console.log(`- User ${row.user_id}: ${row.campaign_count} campaigns`);
      });
    } else {
      console.log('No Google campaign data found');
    }
    
    console.log('Connection and data tests successful!');
  } catch (err) {
    console.error('Database connection or query error:', err);
  }
}

testDatabase().then(() => {
  console.log('Tests completed');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});