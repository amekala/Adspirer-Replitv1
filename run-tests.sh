#!/bin/bash

# Exit on error
set -e

# Color definitions
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Adspirer Onboarding Tests ===${NC}\n"

# Step 1: Check if the application is running
echo -e "${YELLOW}Checking if the application is running...${NC}"
if curl -s http://localhost:5000 > /dev/null; then
  echo -e "${GREEN}✓ Application is running${NC}"
else
  echo -e "${RED}✗ Application is not running. Please start it with the 'Start application' workflow${NC}"
  exit 1
fi

# Step 2: Verify database schema
echo -e "\n${YELLOW}Verifying onboarding database schema...${NC}"
node tests/utils/verify-onboarding-schema.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Database schema verified${NC}"
else
  echo -e "${RED}✗ Database schema verification failed${NC}"
  exit 1
fi

# Step 3: Run the API tests
echo -e "\n${YELLOW}Running onboarding API tests...${NC}"
node tests/api/test-onboarding-api.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ API tests passed${NC}"
else
  echo -e "${RED}✗ API tests failed${NC}"
  exit 1
fi

# Step 4: Run data API tests
echo -e "\n${YELLOW}Running onboarding data API tests...${NC}"
node tests/api/test-onboarding-data-api.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Data API tests passed${NC}"
else
  echo -e "${RED}✗ Data API tests failed${NC}"
  exit 1
fi

echo -e "\n${GREEN}=== All tests passed successfully! ===${NC}"