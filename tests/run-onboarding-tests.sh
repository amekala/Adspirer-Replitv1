#!/bin/bash

# Run Onboarding Tests
# This script will run all the onboarding test scripts one by one

echo "==================================================="
echo "Running Onboarding Tests"
echo "==================================================="

# Install node-fetch if not already installed
echo "Checking for required dependencies..."
npm list node-fetch || npm install --save-dev node-fetch

echo ""
echo "==================================================="
echo "Running API-only test for onboarding workflow..."
echo "==================================================="
node tests/api/test-onboarding-api.js

echo ""
echo "==================================================="
echo "Running API test for onboarding data with verification..."
echo "==================================================="
node tests/api/test-onboarding-data-api.js

echo ""
echo "==================================================="
echo "Running full onboarding workflow test..."
echo "==================================================="
node tests/onboarding/test-onboarding-full.js

echo ""
echo "==================================================="
echo "Running data persistence verification test..."
echo "==================================================="
node tests/onboarding/test-onboarding-data.js

echo ""
echo "==================================================="
echo "Verifying onboarding components..."
echo "==================================================="
node tests/onboarding/verify-onboarding-forms.js

echo ""
echo "==================================================="
echo "Running reset onboarding test..."
echo "==================================================="
node tests/api/test-reset-onboarding.js

echo ""
echo "==================================================="
echo "All tests completed"
echo "==================================================="