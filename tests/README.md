# Adspirer Test Suite

This directory contains all test scripts for the Adspirer platform.

## Directory Structure

```
tests/
├── api/            # API endpoint tests
├── onboarding/     # Onboarding flow tests
└── utils/          # Testing utilities
```

## Test Suites

### API Tests
Located in `tests/api/`, these tests verify API functionality:
- `test-onboarding-api.js`: Tests all onboarding API endpoints
- `test-onboarding-data-api.js`: Verifies data persistence through API
- `test-reset-onboarding.js`: Tests the onboarding reset functionality

### Onboarding Tests
Located in `tests/onboarding/`, these test the onboarding workflow:
- `test-onboarding-data.js`: Tests data persistence for onboarding
- `test-onboarding-full.js`: End-to-end testing of the onboarding flow
- `verify-onboarding-forms.js`: Verifies onboarding component structure

### Utility Tests
Located in `tests/utils/`, these are helper scripts:
- `verify-onboarding-data.js`: Verifies database schema for onboarding
- `insert-test-onboarding-data.js`: Inserts test data directly into database

## Running Tests

You can use the provided shell scripts to run the tests:

1. Run all tests:
   ```
   ./run-tests.sh
   ```
   Then select option 1 from the menu.

2. Run only onboarding tests:
   ```
   ./tests/run-onboarding-tests.sh
   ```

## Test Credentials

For testing, use the following credentials:
- Email: abhilashreddi@gmail.com
- Password: T1l1icron!

## Notes

- All tests are designed to run independently
- Most tests have automatic cleanup to avoid data pollution
- The reset functionality is tested separately to ensure compliance
