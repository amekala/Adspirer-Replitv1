// Test direct SQL query execution
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

// Let's directly execute some sample SQL queries
async function testDirectSqlQueries() {
  try {
    console.log('Testing direct SQL queries that should be generated by the model...');
    
    // Test 1: Count Google campaigns
    console.log('\n>> Query: "How many Google campaigns do I have?"');
    const googleCampaignsQuery = `
      SELECT COUNT(DISTINCT campaign_id) as campaign_count 
      FROM google_campaign_metrics
    `;
    console.log('SQL:', googleCampaignsQuery);
    const googleCampaigns = await sql.unsafe(googleCampaignsQuery);
    console.log('Result:', googleCampaigns[0]);
    
    // Insert some test data if none exists
    if (parseInt(googleCampaigns[0].campaign_count) === 0) {
      console.log('\nNo Google campaign data found. Inserting test data...');
      
      // Create a test user ID
      const testUserId = '00000000-0000-0000-0000-000000000000';
      
      // Insert a few campaign records
      await sql.unsafe(`
        INSERT INTO google_campaign_metrics 
        (user_id, customer_id, campaign_id, ad_group_id, date, impressions, clicks, cost, conversions)
        VALUES 
        ('${testUserId}', 'test-customer', 'campaign1', 'adgroup1', CURRENT_DATE, 1000, 50, 100.0, 5),
        ('${testUserId}', 'test-customer', 'campaign2', 'adgroup2', CURRENT_DATE, 2000, 100, 200.0, 10),
        ('${testUserId}', 'test-customer', 'campaign3', 'adgroup3', CURRENT_DATE, 3000, 150, 300.0, 15)
      `);
      
      console.log('Test data inserted successfully!');
      
      // Run the query again
      const updatedCount = await sql.unsafe(googleCampaignsQuery);
      console.log('Updated result:', updatedCount[0]);
    }
    
    // Test 2: Get campaign stats
    console.log('\n>> Query: "Show me campaign statistics"');
    const campaignStatsQuery = `
      SELECT 
        campaign_id, 
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(cost) as total_cost,
        (SUM(clicks)::float / NULLIF(SUM(impressions), 0)) * 100 as ctr,
        SUM(conversions) as total_conversions
      FROM google_campaign_metrics
      GROUP BY campaign_id
      ORDER BY total_impressions DESC
    `;
    console.log('SQL:', campaignStatsQuery);
    const campaignStats = await sql.unsafe(campaignStatsQuery);
    console.log('Result:', campaignStats);
    
    // Test 3: Average CTR
    console.log('\n>> Query: "What is my average CTR?"');
    const ctrQuery = `
      SELECT 
        (SUM(clicks)::float / NULLIF(SUM(impressions), 0)) * 100 as average_ctr
      FROM google_campaign_metrics
    `;
    console.log('SQL:', ctrQuery);
    const ctrResult = await sql.unsafe(ctrQuery);
    console.log('Result:', ctrResult[0]);
    
    console.log('\nDirect SQL query tests completed successfully!');
  } catch (err) {
    console.error('SQL Query error:', err);
  } finally {
    // Close connection
    await sql.end();
  }
}

// Run the tests
testDirectSqlQueries().then(() => {
  console.log('SQL tests completed');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});