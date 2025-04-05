#!/bin/bash

# Script to run all onboarding tests in sequence
echo "===================================="
echo "Running all Onboarding test scripts"
echo "===================================="

# Run the direct database interaction test script
echo -e "\n\n============ RUNNING test-onboarding-data.js ============"
node test-onboarding-data.js

# Wait for any pending operations to complete
sleep 2

# Run the API-focused test script
echo -e "\n\n============ RUNNING test-api-onboarding-data.js ============"
node test-api-onboarding-data.js

echo -e "\n\n============ ALL TESTS COMPLETED ============"