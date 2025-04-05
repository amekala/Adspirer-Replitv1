#!/bin/bash

# Tests for Onboarding Flow
# This script runs all the onboarding test files in sequence

# Set text colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===================================${NC}"
echo -e "${BLUE}   RUNNING ONBOARDING TESTS       ${NC}"
echo -e "${BLUE}===================================${NC}"

# Test API endpoints
echo -e "\n${YELLOW}Testing onboarding API endpoints...${NC}"
node tests/api/test-onboarding-api.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Onboarding API tests passed!${NC}"
else
  echo -e "${RED}Onboarding API tests failed!${NC}"
fi

# Test data persistence
echo -e "\n${YELLOW}Testing onboarding data persistence...${NC}"
node tests/api/test-onboarding-data-api.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Onboarding data persistence tests passed!${NC}"
else
  echo -e "${RED}Onboarding data persistence tests failed!${NC}"
fi

# Verify onboarding database schema
echo -e "\n${YELLOW}Verifying onboarding database schema...${NC}"
node tests/utils/verify-onboarding-schema.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Database schema verification passed!${NC}"
else
  echo -e "${RED}Database schema verification failed!${NC}"
fi

# Test form components
echo -e "\n${YELLOW}Testing onboarding form components...${NC}"
node tests/onboarding/verify-onboarding-forms.js
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Onboarding form tests passed!${NC}"
else
  echo -e "${RED}Onboarding form tests failed!${NC}"
fi

# End of tests
echo -e "\n${BLUE}===================================${NC}"
echo -e "${BLUE}     ONBOARDING TESTS COMPLETE     ${NC}"
echo -e "${BLUE}===================================${NC}"