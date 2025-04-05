#!/bin/bash

# Main Test Script
# This script provides a menu to run different test suites

# Make all test scripts executable
chmod +x tests/run-onboarding-tests.sh

# Print a colorful menu header
echo -e "\e[1;36m===========================================================\e[0m"
echo -e "\e[1;36m                  Adspirer Test Suite\e[0m"
echo -e "\e[1;36m===========================================================\e[0m"

# Menu options
echo -e "\e[1;33mAvailable Test Suites:\e[0m"
echo -e "\e[1;33m------------------\e[0m"
echo "1) Run All Tests"
echo "2) Run Onboarding Tests"
echo "3) Run API Tests Only"
echo "4) Run Database Tests Only"
echo "5) Exit"
echo ""
echo -n "Please select an option (1-5): "
read choice

case $choice in
    1)
        echo -e "\e[1;32m===========================================================\e[0m"
        echo -e "\e[1;32m                  Running All Tests\e[0m"
        echo -e "\e[1;32m===========================================================\e[0m"
        ./tests/run-onboarding-tests.sh
        # Add more test suites here as they are developed
        ;;
    2)
        echo -e "\e[1;32m===========================================================\e[0m"
        echo -e "\e[1;32m                Running Onboarding Tests\e[0m"
        echo -e "\e[1;32m===========================================================\e[0m"
        ./tests/run-onboarding-tests.sh
        ;;
    3)
        echo -e "\e[1;32m===========================================================\e[0m"
        echo -e "\e[1;32m                  Running API Tests\e[0m"
        echo -e "\e[1;32m===========================================================\e[0m"
        node tests/api/test-onboarding-api.js
        node tests/api/test-onboarding-data-api.js
        node tests/api/test-reset-onboarding.js
        ;;
    4)
        echo -e "\e[1;32m===========================================================\e[0m"
        echo -e "\e[1;32m                Running Database Tests\e[0m"
        echo -e "\e[1;32m===========================================================\e[0m"
        # DB-specific tests will be added here
        node tests/utils/verify-onboarding-data.js
        ;;
    5)
        echo "Exiting..."
        exit 0
        ;;
    *)
        echo -e "\e[1;31mInvalid option. Exiting...\e[0m"
        exit 1
        ;;
esac

echo -e "\e[1;32m===========================================================\e[0m"
echo -e "\e[1;32m                  Tests Completed\e[0m"
echo -e "\e[1;32m===========================================================\e[0m"