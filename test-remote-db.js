// Test connection to the remote database
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

async function testDatabase() {
  try {
    console.log('Testing connection to remote database...');
    const dbUrlParts = new URL(databaseUrl);
    console.log(`Connecting to: ${dbUrlParts.host}${dbUrlParts.pathname} (${process.env.NODE_ENV || 'development'} environment)`);
    
    // Test 1: Simple connection test
    const pingResult = await sql`SELECT 1 as ping`;
    console.log('Connection successful!', pingResult[0].ping === 1 ? '✅' : '❌');
    
    // Test 2: Count tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log(`\nFound ${tables.length} tables in database:`);
    tables.forEach(t => console.log(`- ${t.table_name}`));
    
    // Test 3: Count records in important tables
    console.log('\nCounting records in key tables:');
    
    // Users
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    console.log(`- users: ${userCount[0].count} records`);
    
    // Google metrics
    const googleMetricsCount = await sql`SELECT COUNT(*) as count FROM google_campaign_metrics`;
    console.log(`- google_campaign_metrics: ${googleMetricsCount[0].count} records`);
    
    // Amazon metrics
    const amazonMetricsCount = await sql`SELECT COUNT(*) as count FROM campaign_metrics`;
    console.log(`- campaign_metrics: ${amazonMetricsCount[0].count} records`);
    
    // Test 4: Check if there's data for the user we've been testing with
    const userId = 'aa5ed22c-ad90-4226-b53c-e9bb98504a89';
    console.log(`\nChecking data for user ID: ${userId}`);
    
    const userGoogleMetrics = await sql`
      SELECT COUNT(*) as count FROM google_campaign_metrics WHERE user_id = ${userId}
    `;
    console.log(`- Google campaign metrics for this user: ${userGoogleMetrics[0].count} records`);
    
    const userAmazonMetrics = await sql`
      SELECT COUNT(*) as count FROM campaign_metrics WHERE user_id = ${userId}
    `;
    console.log(`- Amazon campaign metrics for this user: ${userAmazonMetrics[0].count} records`);
    
    // Test 5: If data exists, show a sample campaign
    if (parseInt(userGoogleMetrics[0].count) > 0) {
      const googleSample = await sql`
        SELECT campaign_id, COUNT(*) as entries 
        FROM google_campaign_metrics 
        WHERE user_id = ${userId} 
        GROUP BY campaign_id
        LIMIT 5
      `;
      
      console.log('\nSample Google campaigns:');
      googleSample.forEach(row => {
        console.log(`- Campaign ${row.campaign_id}: ${row.entries} entries`);
      });
      
      // Now run a simple metric calculation
      const metricsSample = await sql`
        SELECT 
          campaign_id,
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(cost) as total_cost,
          (SUM(clicks)::float / NULLIF(SUM(impressions), 0)) * 100 as ctr
        FROM google_campaign_metrics
        WHERE user_id = ${userId}
        GROUP BY campaign_id
        ORDER BY total_impressions DESC
        LIMIT 3
      `;
      
      console.log('\nSample metrics calculation:');
      metricsSample.forEach(row => {
        console.log(`- Campaign ${row.campaign_id}: ${row.total_impressions} impressions, ${row.total_clicks} clicks, $${row.total_cost} cost, ${row.ctr.toFixed(2)}% CTR`);
      });
    }
    
    console.log('\nDatabase tests completed successfully!');
  } catch (err) {
    console.error('Database connection or query error:', err);
  } finally {
    await sql.end();
  }
}

// Run the tests
testDatabase().then(() => {
  console.log('Remote database connection tests completed');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});