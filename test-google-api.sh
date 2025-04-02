#!/bin/bash

# Load environment variables
set -a
source .env
set +a

echo "===== Google Ads API Test Script ====="
echo "This script will test the Google Ads API integration"
echo "Retrieving credentials from database..."

# Get the user ID to test with
USER_ID=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT id FROM users LIMIT 1;" | xargs)

if [ -z "$USER_ID" ]; then
  echo "Error: No users found in the database"
  exit 1
fi

echo "Using user ID: $USER_ID"

# Get the Google tokens from the database
TOKEN_QUERY="SELECT access_token, refresh_token, expires_at FROM google_tokens WHERE user_id = '$USER_ID';"
TOKENS=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "$TOKEN_QUERY")

if [ -z "$TOKENS" ]; then
  echo "Error: No Google tokens found for user $USER_ID"
  exit 1
fi

# Parse tokens (handling different formats)
ACCESS_TOKEN=$(echo "$TOKENS" | awk '{print $1}')
REFRESH_TOKEN=$(echo "$TOKENS" | awk '{print $2}')
EXPIRES_AT=$(echo "$TOKENS" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}')

# Get client ID from env variables
CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-$GOOGLE_CLIENT_ID}"
CLIENT_SECRET="${VITE_GOOGLE_CLIENT_SECRET:-$GOOGLE_CLIENT_SECRET}"

echo "Tokens retrieved:"
echo "- Access Token: ${ACCESS_TOKEN:0:20}..."
echo "- Refresh Token: ${REFRESH_TOKEN:0:20}..."
echo "- Expires At: $EXPIRES_AT"
echo "- Client ID: ${CLIENT_ID:0:10}..."

# Force token refresh to ensure we have a valid token
echo "Refreshing token..."

REFRESH_RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
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
  UPDATE_QUERY="UPDATE google_tokens SET access_token = '$ACCESS_TOKEN', last_refreshed = NOW(), expires_at = NOW() + INTERVAL '1 hour' WHERE user_id = '$USER_ID';"
  PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -c "$UPDATE_QUERY"
  echo "Token updated in database"
else
  echo "Error refreshing token:"
  echo "$REFRESH_RESPONSE"
  exit 1
fi

# Get the first customer ID from the database
CUSTOMER_ID=$(PGPASSWORD=$PGPASSWORD psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -t -c "SELECT customer_id FROM google_advertiser_accounts WHERE user_id = '$USER_ID' LIMIT 1;" | xargs)

if [ -z "$CUSTOMER_ID" ]; then
  echo "Error: No Google Ads customer ID found for user $USER_ID"
  exit 1
fi

echo "Using customer ID: $CUSTOMER_ID"

# Generate dates in YYYY-MM-DD format
TODAY=$(date "+%Y-%m-%d")
TOMORROW=$(date -v+1d "+%Y-%m-%d" 2>/dev/null || date -d "tomorrow" "+%Y-%m-%d")

# If date command fails, hard-code dates as fallback
if [ -z "$TOMORROW" ]; then
  TODAY="$(date '+%Y-%m-%d')"
  TOMORROW=$(date -j -v+1d -f "%Y-%m-%d" "$TODAY" "+%Y-%m-%d" 2>/dev/null || echo "$(date '+%Y')-$(date '+%m')-$(($(date '+%d') + 1))")
fi

# Test creating a campaign budget
echo "Testing campaign budget creation API..."

BUDGET_NAME="Test Budget $(date +%s)"
BUDGET_PAYLOAD=$(jq -n \
  --arg name "$BUDGET_NAME" \
  --argjson amount "10.00" \
  '{
    "campaignBudget": {
      "name": $name,
      "amountMicros": ($amount * 1000000),
      "deliveryMethod": "STANDARD",
      "explicitlyShared": false
    }
  }')

echo "Budget payload:"
echo "$BUDGET_PAYLOAD" | jq .

BUDGET_RESPONSE=$(curl -s -X POST "https://googleads.googleapis.com/v16/customers/$CUSTOMER_ID/campaignBudgets:mutate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "developer-token: $GOOGLE_DEVELOPER_TOKEN" \
  -H "login-customer-id: $CUSTOMER_ID" \
  -d "$BUDGET_PAYLOAD")

echo "Budget creation response:"
echo "$BUDGET_RESPONSE" | jq .

# Check for success response
if echo "$BUDGET_RESPONSE" | jq -e '.results[0].resourceName' > /dev/null 2>&1; then
  BUDGET_RESOURCE_NAME=$(echo $BUDGET_RESPONSE | jq -r '.results[0].resourceName')
  echo "Budget created successfully with resource name: $BUDGET_RESOURCE_NAME"
  
  # Test creating a campaign
  echo "Testing campaign creation API..."
  
  CAMPAIGN_NAME="API Test Campaign $(date +%s)"
  CAMPAIGN_PAYLOAD=$(jq -n \
    --arg name "$CAMPAIGN_NAME" \
    --arg budgetResource "$BUDGET_RESOURCE_NAME" \
    --arg startDate "$(echo $TODAY | tr -d '-')" \
    --arg endDate "$(echo $TODAY | tr -d '-')"30 \
    '{
      "campaign": {
        "name": $name,
        "campaignBudget": $budgetResource,
        "advertisingChannelType": "SEARCH",
        "status": "PAUSED",
        "manualCpc": {},
        "networkSettings": {
          "targetGoogleSearch": true,
          "targetSearchNetwork": true,
          "targetContentNetwork": false,
          "targetPartnerSearchNetwork": false
        },
        "startDate": $startDate,
        "endDate": $endDate
      }
    }')
  
  echo "Campaign payload:"
  echo "$CAMPAIGN_PAYLOAD" | jq .
  
  CAMPAIGN_RESPONSE=$(curl -s -X POST "https://googleads.googleapis.com/v16/customers/$CUSTOMER_ID/campaigns:mutate" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "developer-token: $GOOGLE_DEVELOPER_TOKEN" \
    -H "login-customer-id: $CUSTOMER_ID" \
    -d "$CAMPAIGN_PAYLOAD")
  
  echo "Campaign creation response:"
  echo "$CAMPAIGN_RESPONSE" | jq .
  
  if echo "$CAMPAIGN_RESPONSE" | jq -e '.results[0].resourceName' > /dev/null 2>&1; then
    CAMPAIGN_RESOURCE_NAME=$(echo $CAMPAIGN_RESPONSE | jq -r '.results[0].resourceName')
    echo "Campaign created successfully with resource name: $CAMPAIGN_RESOURCE_NAME"
    
    # Test creating an ad group
    echo "Testing ad group creation API..."
    
    ADGROUP_NAME="Test Ad Group $(date +%s)"
    ADGROUP_PAYLOAD=$(jq -n \
      --arg name "$ADGROUP_NAME" \
      --arg campaignResource "$CAMPAIGN_RESOURCE_NAME" \
      --argjson cpcBidMicros "1000000" \
      '{
        "adGroup": {
          "name": $name,
          "campaign": $campaignResource,
          "type": "SEARCH_STANDARD",
          "cpcBidMicros": $cpcBidMicros,
          "status": "ENABLED"
        }
      }')
    
    echo "Ad Group payload:"
    echo "$ADGROUP_PAYLOAD" | jq .
    
    ADGROUP_RESPONSE=$(curl -s -X POST "https://googleads.googleapis.com/v16/customers/$CUSTOMER_ID/adGroups:mutate" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $ACCESS_TOKEN" \
      -H "developer-token: $GOOGLE_DEVELOPER_TOKEN" \
      -H "login-customer-id: $CUSTOMER_ID" \
      -d "$ADGROUP_PAYLOAD")
    
    echo "Ad Group creation response:"
    echo "$ADGROUP_RESPONSE" | jq .
    
    if echo "$ADGROUP_RESPONSE" | jq -e '.results[0].resourceName' > /dev/null 2>&1; then
      ADGROUP_RESOURCE_NAME=$(echo $ADGROUP_RESPONSE | jq -r '.results[0].resourceName')
      echo "Ad Group created successfully with resource name: $ADGROUP_RESOURCE_NAME"
    else
      echo "Error creating ad group"
    fi
  else
    echo "Error creating campaign"
  fi
else
  echo "Error creating budget"
fi

echo "Google Ads API test completed" 