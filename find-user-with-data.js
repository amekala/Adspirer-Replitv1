// Find users with campaign data
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

async function findUsersWithData() {
  try {
    console.log('Looking for users with campaign data...');
    
    // Find users with Google campaign data
    const googleUsers = await sql`
      SELECT user_id, COUNT(*) as record_count 
      FROM google_campaign_metrics 
      GROUP BY user_id
    `;
    
    console.log('Users with Google campaign data:');
    if (googleUsers.length === 0) {
      console.log('- No users found with Google campaign data');
    } else {
      googleUsers.forEach(u => console.log(`- User ${u.user_id}: ${u.record_count} records`));
      
      // Get the first user with data
      const sampleUserId = googleUsers[0].user_id;
      console.log(`\nExamining sample user: ${sampleUserId}`);
      
      // Check if this user exists in the users table
      const userDetails = await sql`
        SELECT id, email FROM users WHERE id = ${sampleUserId}
      `;
      
      if (userDetails.length > 0) {
        console.log(`User exists in users table: ${userDetails[0].email}`);
      } else {
        console.log('User does not exist in users table - data integrity issue!');
      }
      
      // Get campaigns for this user
      const campaigns = await sql`
        SELECT campaign_id, COUNT(*) as entries 
        FROM google_campaign_metrics 
        WHERE user_id = ${sampleUserId}
        GROUP BY campaign_id
      `;
      
      console.log(`\nCampaigns for user ${sampleUserId}:`);
      campaigns.forEach(c => console.log(`- Campaign ${c.campaign_id}: ${c.entries} entries`));
      
      // Return this user ID for further testing
      return sampleUserId;
    }
    
    return null;
  } catch (err) {
    console.error('Error finding users with data:', err);
    return null;
  } finally {
    await sql.end();
  }
}

// Run the function
findUsersWithData().then(userId => {
  if (userId) {
    console.log(`\nFound user with data: ${userId}`);
    console.log('You can use this user ID for testing SQL generation');
  } else {
    console.log('\nNo users with campaign data found');
  }
  process.exit(0);
}).catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});