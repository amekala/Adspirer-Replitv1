# Adspirer Project

Adspirer is an advanced AI-powered marketing platform for retail media optimization, providing intelligent campaign management and brand identity development across multiple advertising platforms.

## Features

- User Onboarding System
- Multi-platform API Integration (Amazon Ads, Google Ads)
- AI-enhanced campaign insights
- Brand identity development tools
- Customizable dashboards
- Advanced data visualization

## Tech Stack

- **Frontend**: React with TypeScript
- **Backend**: Express (Node.js)
- **Database**: PostgreSQL
- **ORM**: Drizzle
- **Styling**: Tailwind CSS
- **Authentication**: JWT with Passport
- **API Integration**: REST APIs for major advertising platforms

## Testing

The project includes comprehensive test suites for the onboarding process:

### Running Tests

1. Make sure the application is running with the "Start application" workflow
2. Run the test script:

```bash
./run-tests.sh
```

This will:
- Verify the database schema for onboarding tables
- Test the onboarding API functionality
- Verify data persistence across all onboarding steps
- Test the reset onboarding functionality

### Individual Tests

You can also run individual tests:

- Database schema verification:
```bash
node tests/utils/verify-onboarding-schema.js
```

- API tests:
```bash
node tests/api/test-onboarding-api.js
```

- Data persistence tests:
```bash
node tests/api/test-onboarding-data-api.js
```

## Onboarding Flow

The onboarding flow consists of 6 steps:

1. **Business Core**: Basic business information
2. **Connect Platforms**: Connecting ad platforms (Amazon, Google)
3. **Brand Identity**: Branding information
4. **Products/Services**: Product catalog details
5. **Creative Examples**: Ad creative preferences
6. **Performance Context**: Performance goals and benchmarks

All steps are validated and stored in the database.
