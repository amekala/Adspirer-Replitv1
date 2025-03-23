#!/bin/bash

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:5000"
EMAIL="test@example.com"
PASSWORD="password123"
TEST_MESSAGE="Test message from terminal script $(date)"

# Test results
login_success=false
conversation_created=false
message_sent=false
message_retrieved=false

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Testing Chat Message Functionality     ${NC}"
echo -e "${BLUE}=========================================${NC}"

# Step 1: Login to get session cookie
echo -e "\n${YELLOW}Step 1: Logging in...${NC}"
response=$(curl -s -c cookies.txt -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  -w "\n%{http_code}")

# Extract status code from response
status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
  echo -e "${GREEN}Login successful!${NC}"
  login_success=true
  
  # Extract user ID for verification
  user_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | cut -d':' -f2 | tr -d '"')
  echo -e "User ID: $user_id"
else
  echo -e "${RED}Login failed with status code: $status_code${NC}"
  echo -e "${RED}Response: $response_body${NC}"
  exit 1
fi

# Step 2: Create a new conversation
echo -e "\n${YELLOW}Step 2: Creating a new conversation...${NC}"
response=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/chat/conversations" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Test Conversation\"}" \
  -w "\n%{http_code}")

status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
  echo -e "${GREEN}Conversation created successfully!${NC}"
  conversation_created=true
  
  # Extract conversation ID from response
  conversation_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | cut -d':' -f2 | tr -d '"' | head -1)
  echo -e "Conversation ID: $conversation_id"
else
  echo -e "${RED}Failed to create conversation: $status_code${NC}"
  echo -e "${RED}Response: $response_body${NC}"
  exit 1
fi

# Step 3: Send a user message
echo -e "\n${YELLOW}Step 3: Sending user message...${NC}"
response=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/chat/conversations/$conversation_id/messages" \
  -H "Content-Type: application/json" \
  -d "{\"role\":\"user\",\"content\":\"$TEST_MESSAGE\"}" \
  -w "\n%{http_code}")

status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
  echo -e "${GREEN}Message sent successfully!${NC}"
  message_sent=true
  
  # Extract message ID
  message_id=$(echo "$response_body" | grep -o '"id":"[^"]*"' | cut -d':' -f2 | tr -d '"' | head -1)
  echo -e "Message ID: $message_id"
else
  echo -e "${RED}Failed to send message: $status_code${NC}"
  echo -e "${RED}Response: $response_body${NC}"
fi

# Step 4: Wait for AI to respond
echo -e "\n${YELLOW}Step 4: Triggering AI message...${NC}"
response=$(curl -s -b cookies.txt -X POST "$BASE_URL/api/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{\"conversationId\":\"$conversation_id\",\"message\":\"$TEST_MESSAGE\"}" \
  -w "\n%{http_code}")

status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

# This is a streaming response, so we just check if it started successfully
if [ "$status_code" -eq 200 ]; then
  echo -e "${GREEN}AI response triggered successfully!${NC}"
else
  echo -e "${RED}Failed to trigger AI response: $status_code${NC}"
  echo -e "${RED}Response: $response_body${NC}"
fi

# Step 5: Get conversation messages after a short delay
echo -e "\n${YELLOW}Step 5: Waiting 3 seconds for AI to respond...${NC}"
sleep 3

echo -e "${YELLOW}Retrieving conversation messages...${NC}"
response=$(curl -s -b cookies.txt -X GET "$BASE_URL/api/chat/conversations/$conversation_id" \
  -w "\n%{http_code}")

status_code=$(echo "$response" | tail -n1)
response_body=$(echo "$response" | sed '$d')

if [ "$status_code" -eq 200 ]; then
  echo -e "${GREEN}Retrieved conversation messages successfully!${NC}"
  
  # Check if our test message is in the response
  if echo "$response_body" | grep -q "$TEST_MESSAGE"; then
    echo -e "${GREEN}User message found in conversation!${NC}"
    message_retrieved=true
  else
    echo -e "${RED}User message NOT found in conversation!${NC}"
    echo -e "${YELLOW}First 300 characters of response:${NC}"
    echo "$response_body" | head -c 300
  fi
  
  # Check if there's an assistant response
  if echo "$response_body" | grep -q '"role":"assistant"'; then
    echo -e "${GREEN}Assistant message found in conversation!${NC}"
    
    # Extract assistant message for display
    assistant_msg=$(echo "$response_body" | grep -o '"role":"assistant","content":"[^"]*"' | head -1)
    echo -e "${BLUE}AI Response: ${NC}${assistant_msg}"
  else
    echo -e "${YELLOW}No assistant message found yet${NC}"
  fi
else
  echo -e "${RED}Failed to retrieve conversation: $status_code${NC}"
  echo -e "${RED}Response: $response_body${NC}"
fi

# Clean up cookies file
rm -f cookies.txt

# Print test summary
echo -e "\n${BLUE}=========================================${NC}"
echo -e "${BLUE}             TEST SUMMARY               ${NC}"
echo -e "${BLUE}=========================================${NC}"
echo -e "Login Success:         $(if $login_success; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; fi)"
echo -e "Conversation Created:  $(if $conversation_created; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; fi)"
echo -e "Message Sent:          $(if $message_sent; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; fi)"
echo -e "Message Retrieved:     $(if $message_retrieved; then echo -e "${GREEN}PASS${NC}"; else echo -e "${RED}FAIL${NC}"; fi)"

echo -e "\n${BLUE}If all tests passed, the user message is correctly being handled by the API.${NC}"
echo -e "${BLUE}To check visual rendering in the UI, please open the chat page in your browser.${NC}"