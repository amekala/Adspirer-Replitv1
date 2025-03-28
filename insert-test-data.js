// Insert test data directly for metrics tables
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

// Use the user ID from the previous check
const userId = 'aa5ed22c-ad90-4226-b53c-e9bb98504a89';

async function insertTestData() {
  try {
    console.log(`Inserting test data for user ${userId}...`);
    
    // First, check if this user already has data
    const existingDataGoogle = await sql`
      SELECT COUNT(*) as count FROM google_campaign_metrics WHERE user_id = ${userId}
    `;
    
    const existingDataAmazon = await sql`
      SELECT COUNT(*) as count FROM campaign_metrics WHERE user_id = ${userId}
    `;
    
    console.log(`Existing data counts: Google=${existingDataGoogle[0].count}, Amazon=${existingDataAmazon[0].count}`);
    
    // Skip if we already have data
    if (parseInt(existingDataGoogle[0].count) > 0 && parseInt(existingDataAmazon[0].count) > 0) {
      console.log('User already has data in both tables. Skipping insertion.');
      
      // Show sample of existing data instead
      const googleSample = await sql`
        SELECT campaign_id, COUNT(*) as entries 
        FROM google_campaign_metrics 
        WHERE user_id = ${userId} 
        GROUP BY campaign_id
      `;
      
      console.log('\nExisting Google campaign data:');
      googleSample.forEach(row => {
        console.log(`- Campaign ${row.campaign_id}: ${row.entries} entries`);
      });
      
      return;
    }
    
    // Customer ID for Google data
    const customer1 = 'customer-123';
    
    // Insert Google campaign metrics data - skip advertiser accounts
    if (parseInt(existingDataGoogle[0].count) === 0) {
      // Create campaign data for the last 30 days
      const campaigns = ['campaign-a', 'campaign-b', 'campaign-c'];
      const adGroups = ['adgroup-1', 'adgroup-2'];
      
      // Current date
      const now = new Date();
      
      console.log('Inserting Google campaign metrics...');
      
      // Generate data for each day - fewer days for testing
      for (let i = 0; i < 5; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // For each campaign
        for (const campaign of campaigns) {
          // For each ad group
          for (const adGroup of adGroups) {
            // Random metrics
            const impressions = Math.floor(Math.random() * 1000) + 100;
            const clicks = Math.floor(Math.random() * impressions * 0.1);
            const cost = (Math.random() * 100 + 10).toFixed(2);
            const conversions = Math.floor(Math.random() * clicks * 0.2);
            
            // Insert the data
            await sql`
              INSERT INTO google_campaign_metrics (
                user_id, customer_id, campaign_id, ad_group_id, date, 
                impressions, clicks, cost, conversions
              )
              VALUES (
                ${userId}, ${customer1}, ${campaign}, ${adGroup}, ${dateStr},
                ${impressions}, ${clicks}, ${cost}, ${conversions}
              )
            `;
          }
        }
        
        // Progress indicator
        console.log(`Inserted Google data for date ${dateStr}...`);
      }
    }
    
    // Insert Amazon campaign metrics if needed
    if (parseInt(existingDataAmazon[0].count) === 0) {
      const profiles = ['profile-1', 'profile-2'];
      const amazonCampaigns = ['amzn-camp-1', 'amzn-camp-2', 'amzn-camp-3'];
      
      const now = new Date();
      console.log('\nInserting Amazon campaign metrics...');
      
      // Insert just a few days for test data
      for (let i = 0; i < 3; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // For each campaign
        for (const campaign of amazonCampaigns) {
          for (const profile of profiles) {
            // Random metrics
            const impressions = Math.floor(Math.random() * 2000) + 200;
            const clicks = Math.floor(Math.random() * impressions * 0.08);
            const cost = (Math.random() * 80 + 20).toFixed(2);
            
            // Insert the data
            await sql`
              INSERT INTO campaign_metrics (
                user_id, profile_id, campaign_id, date, 
                impressions, clicks, cost
              )
              VALUES (
                ${userId}, ${profile}, ${campaign}, ${dateStr},
                ${impressions}, ${clicks}, ${cost}
              )
            `;
          }
        }
        
        console.log(`Inserted Amazon data for date ${dateStr}...`);
      }
    }
    
    console.log('\nTest data insertion completed!');
    
    // Verify the insertion
    const googleCounts = await sql`
      SELECT COUNT(*) as count FROM google_campaign_metrics WHERE user_id = ${userId}
    `;
    
    const amazonCounts = await sql`
      SELECT COUNT(*) as count FROM campaign_metrics WHERE user_id = ${userId}
    `;
    
    console.log(`\nFinal data counts:`);
    console.log(`- Google campaign metrics: ${googleCounts[0].count} records`);
    console.log(`- Amazon campaign metrics: ${amazonCounts[0].count} records`);
    
  } catch (err) {
    console.error('Error inserting test data:', err);
  } finally {
    await sql.end();
  }
}

// Run the insertion
insertTestData().then(() => {
  console.log('\nTest data operation completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});