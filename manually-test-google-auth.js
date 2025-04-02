/**
 * Manual Testing Instructions for Google OAuth Flow
 * 
 * Follow these steps to manually test/update your Google OAuth tokens:
 * 
 * 1. Open your browser and go to:
 *    http://localhost:5000/api/google/connect
 * 
 * 2. This will redirect you to Google's OAuth consent screen.
 *    Log in with your Google account and grant the requested permissions.
 * 
 * 3. Google will redirect you back to:
 *    http://localhost:5000/auth/callback
 *    with the authorization code.
 * 
 * 4. Your server will exchange this code for access and refresh tokens,
 *    and store them in the database.
 * 
 * 5. After authentication, verify database has updated tokens:
 *    ```
 *    PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE \
 *      -c "SELECT user_id, substr(access_token, 1, 20), substr(refresh_token, 1, 20), expires_at \
 *          FROM google_tokens ORDER BY last_refreshed DESC LIMIT 5;"
 *    ```
 * 
 * 6. Then try running test-google-api.sh again.
 */

console.log(`
=== IMPORTANT - MANUAL STEPS REQUIRED ===

To update your Google Auth tokens, you need to complete the OAuth flow manually:

1. Make sure your server is running at http://localhost:5000
   (Start it with: npm run dev)

2. Open your browser and navigate to:
   http://localhost:5000/api/google/connect

3. Complete the Google OAuth flow

4. Verify you've been redirected back to your application

5. Check the database for updated tokens:
   PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "SELECT substr(access_token, 1, 20) FROM google_tokens ORDER BY last_refreshed DESC LIMIT 1;"

6. Run test-google-api.sh again

Note: Your redirect URIs in Google Cloud Console should include:
- http://localhost:5000/api/google/connect
- http://localhost:5000/auth/callback
`); 