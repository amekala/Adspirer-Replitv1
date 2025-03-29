#!/bin/bash

# Load environment variables
set -a
source .env
set +a

echo "===== Amazon Advertising API Test Script ====="
echo "This script will test the Amazon Advertising API integration"
echo "Retrieving credentials from database..."

# Get the user ID to test with
USER_ID=$(psql $DATABASE_URL -t -c "SELECT id FROM users LIMIT 1;" | xargs)

if [ -z "$USER_ID" ]; then
  echo "Error: No users found in the database"
  exit 1
fi

echo "Using user ID: $USER_ID"

# Get the Amazon tokens from the database
TOKEN_QUERY="SELECT access_token, refresh_token, expires_at FROM amazon_tokens WHERE user_id = '$USER_ID';"
TOKENS=$(psql $DATABASE_URL -t -c "$TOKEN_QUERY")

if [ -z "$TOKENS" ]; then
  echo "Error: No Amazon tokens found for user $USER_ID"
  exit 1
fi

# Parse tokens (handling different formats)
ACCESS_TOKEN=$(echo "$TOKENS" | awk '{print $1}')
REFRESH_TOKEN=$(echo "$TOKENS" | grep -o "Atzr|[^[:space:]]*")
EXPIRES_AT=$(echo "$TOKENS" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}')

# Get client ID from env variables
CLIENT_ID="${VITE_AMAZON_CLIENT_ID:-$AMAZON_CLIENT_ID}"
CLIENT_SECRET="${VITE_AMAZON_CLIENT_SECRET:-$AMAZON_CLIENT_SECRET}"

echo "Tokens retrieved:"
echo "- Access Token: ${ACCESS_TOKEN:0:20}..."
echo "- Refresh Token: ${REFRESH_TOKEN:0:20}..."
echo "- Expires At: $EXPIRES_AT"
echo "- Client ID: ${CLIENT_ID:0:10}..."

# Force token refresh to ensure we have a valid token
echo "Refreshing token..."

REFRESH_RESPONSE=$(curl -s -X POST "https://api.amazon.com/auth/o2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=refresh_token" \
  --data-urlencode "refresh_token=$REFRESH_TOKEN" \
  --data-urlencode "client_id=$CLIENT_ID" \
  --data-urlencode "client_secret=$CLIENT_SECRET")

# Check if refresh was successful
if echo "$REFRESH_RESPONSE" | grep -q "access_token"; then
  ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.access_token')
  echo "Token refreshed successfully"
  echo "New Access Token: ${ACCESS_TOKEN:0:20}..."
  
  # Update token in database
  UPDATE_QUERY="UPDATE amazon_tokens SET access_token = '$ACCESS_TOKEN', last_refreshed = NOW(), expires_at = NOW() + INTERVAL '1 hour' WHERE user_id = '$USER_ID';"
  psql $DATABASE_URL -c "$UPDATE_QUERY"
  echo "Token updated in database"
else
  echo "Error refreshing token:"
  echo "$REFRESH_RESPONSE"
  exit 1
fi

# Get the first profile ID from the database
PROFILE_ID=$(psql $DATABASE_URL -t -c "SELECT profile_id FROM advertiser_accounts WHERE user_id = '$USER_ID' LIMIT 1;" | xargs)

if [ -z "$PROFILE_ID" ]; then
  echo "Fetching profiles from Amazon API..."
  
  PROFILES_RESPONSE=$(curl -s -X GET "https://advertising-api.amazon.com/v2/profiles" \
    -H "Amazon-Advertising-API-ClientId: $CLIENT_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  if echo "$PROFILES_RESPONSE" | grep -q "profileId"; then
    PROFILE_ID=$(echo $PROFILES_RESPONSE | jq -r '.[0].profileId')
    echo "Retrieved profile ID: $PROFILE_ID"
  else
    echo "Error fetching profiles:"
    echo "$PROFILES_RESPONSE"
    exit 1
  fi
else
  echo "Using profile ID from database: $PROFILE_ID"
fi

# Generate dates in YYYY-MM-DD format for Amazon API V3
TODAY=$(date "+%Y-%m-%d")
TOMORROW=$(date -v+1d "+%Y-%m-%d" 2>/dev/null || date -d "tomorrow" "+%Y-%m-%d")

# If date command fails, hard-code dates as fallback
if [ -z "$TOMORROW" ]; then
  TODAY="2025-03-28"
  TOMORROW="2025-03-29"
fi

# Testing list profiles
echo "Testing list profiles API..."
PROFILES_RESPONSE=$(curl -s -X GET "https://advertising-api.amazon.com/v2/profiles" \
  -H "Amazon-Advertising-API-ClientId: $CLIENT_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Profiles response:"
echo "$PROFILES_RESPONSE" | jq .

# Test creating a campaign using V3 API
echo "Testing campaign creation API (V3)..."

# Use jq to properly construct JSON
CAMPAIGN_NAME="API Test Campaign $(date +%s)"

# Correct budget format with budgetType
CAMPAIGN_PAYLOAD=$(jq -n \
  --arg name "$CAMPAIGN_NAME" \
  --arg startDate "$TODAY" \
  --arg endDate "$TOMORROW" \
  --argjson budget "10.00" \
  '{
    campaigns: [
      {
        name: $name,
        campaignType: "sponsoredProducts",
        targetingType: "MANUAL",
        state: "PAUSED",
        budget: {
          budgetType: "DAILY",
          budget: $budget
        },
        startDate: $startDate,
        endDate: $endDate
      }
    ]
  }')

echo "Campaign payload:"
echo "$CAMPAIGN_PAYLOAD" | jq .

# Use the v3 API endpoint
CAMPAIGN_RESPONSE=$(curl -s -X POST "https://advertising-api.amazon.com/sp/campaigns" \
  -H "Content-Type: application/vnd.spCampaign.v3+json" \
  -H "Accept: application/vnd.spCampaign.v3+json" \
  -H "Amazon-Advertising-API-ClientId: $CLIENT_ID" \
  -H "Amazon-Advertising-API-Scope: $PROFILE_ID" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "$CAMPAIGN_PAYLOAD")

echo "Campaign creation response:"
echo "$CAMPAIGN_RESPONSE" | jq .

# Check for success response from v3 API
if echo "$CAMPAIGN_RESPONSE" | jq -e '.campaigns.success[0].campaignId' > /dev/null 2>&1; then
  CAMPAIGN_ID=$(echo $CAMPAIGN_RESPONSE | jq -r '.campaigns.success[0].campaignId')
  echo "Campaign created successfully with ID: $CAMPAIGN_ID"
  
  # Test creating an ad group
  echo "Testing ad group creation API..."
  
  # Use jq to construct ad group JSON
  ADGROUP_PAYLOAD=$(jq -n \
    --arg name "Test Ad Group" \
    --arg campaignId "$CAMPAIGN_ID" \
    --argjson defaultBid "1.0" \
    '{
      adGroups: [
        {
          name: $name,
          campaignId: $campaignId,
          defaultBid: $defaultBid,
          state: "PAUSED"
        }
      ]
    }')
  
  echo "Ad Group payload:"
  echo "$ADGROUP_PAYLOAD" | jq .
  
  ADGROUP_RESPONSE=$(curl -s -X POST "https://advertising-api.amazon.com/sp/adGroups" \
    -H "Content-Type: application/vnd.spAdGroup.v3+json" \
    -H "Accept: application/vnd.spAdGroup.v3+json" \
    -H "Amazon-Advertising-API-ClientId: $CLIENT_ID" \
    -H "Amazon-Advertising-API-Scope: $PROFILE_ID" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -d "$ADGROUP_PAYLOAD")
  
  echo "Ad Group creation response:"
  echo "$ADGROUP_RESPONSE" | jq .
  
  if echo "$ADGROUP_RESPONSE" | jq -e '.adGroups.success[0].adGroupId' > /dev/null 2>&1; then
    ADGROUP_ID=$(echo $ADGROUP_RESPONSE | jq -r '.adGroups.success[0].adGroupId')
    echo "Ad Group created successfully with ID: $ADGROUP_ID"
  else
    echo "Error creating ad group"
  fi
else
  echo "Error creating campaign"
fi

echo "Amazon API test completed"
