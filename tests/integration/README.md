# Integration Tests Documentation

This directory contains comprehensive integration tests for the adocavo.net project. These tests validate critical business flows and ensure the system works correctly end-to-end.

## Test Structure

### 1. Authentication Flow (`authentication.test.ts`)

Tests the complete user authentication system including:

- User registration with default credits
- Email uniqueness constraints
- Session management
- OAuth account linking
- Admin operations
- User role management

### 2. Script Generation Flow (`script-generation.test.ts`)

Tests the core script generation feature:

- Hook management (creation, activation, deactivation)
- Script generation with credit deduction
- Rate limiting for generation
- JSON validation
- Bulk operations
- History tracking

### 3. Rating System (`rating-system.test.ts`)

Tests the script rating functionality:

- Rating creation with constraints (1-5 stars)
- Rating updates
- Average calculation
- Rating distribution
- User and script-based queries
- Cascading deletes

### 4. Favorites System (`favorites-system.test.ts`)

Tests the hook favorites feature:

- Adding hooks to favorites
- Enforcing unique user-hook combinations
- Querying favorites by category
- Bulk operations
- Analytics and statistics

### 5. Waitlist Flow (`waitlist-flow.test.ts`)

Tests the waitlist management:

- Email validation and normalization
- Source tracking
- Bulk operations
- Analytics and conversion tracking
- Data cleanup operations

### 6. Admin Operations (`admin-operations.test.ts`)

Tests administrative features:

- Admin user creation and management
- Hook review queue (pending, approved, rejected)
- System analytics
- Security enforcement
- Data management and migrations

### 7. Error Scenarios (`error-scenarios.test.ts`)

Tests error handling and edge cases:

- Rate limiting enforcement
- Insufficient credits
- Invalid inputs
- API failures
- System recovery
- Extreme values and edge cases

## Test Utilities

The `test-utils.ts` file provides:

- Test environment setup with Miniflare D1
- Database cleanup functions
- Mock data generators
- Helper functions for common operations
- Rate limit testing utilities

## Running Tests

### Run all integration tests

```bash
npm run test:integration
```

### Run specific test file

```bash
npx vitest run tests/integration/authentication.test.ts
```

### Run with coverage

```bash
npx vitest run --coverage tests/integration
```

## Test Environment

Tests use Miniflare to simulate the Cloudflare Workers environment:

- In-memory D1 database
- Mock environment bindings
- Isolated test state
- Automatic cleanup between tests

## Best Practices

1. **Test Isolation**: Each test should clean up after itself
2. **Real Data**: Tests use real database operations, not mocks
3. **Error Coverage**: Both success and failure scenarios are tested
4. **Performance**: Tests include performance benchmarks for large datasets
5. **Edge Cases**: Tests handle extreme values, Unicode, and special characters

## Adding New Tests

When adding new integration tests:

1. Place tests in the appropriate test file based on functionality
2. Use the test utilities for setup and cleanup
3. Include both positive and negative test cases
4. Test edge cases and error conditions
5. Follow the existing naming conventions and structure

## Database Migrations

The integration tests run migrations before each test suite:

- Uses `drizzle-orm/d1` for D1 database operations
- Creates fresh database schema for each test run
- Ensures tests run against the latest schema

## Mock Data

Test data generators are available in `test-utils.ts`:

- `createTestUser()`: Creates a test user with default values
- `createTestHook()`: Creates a test hook with realistic data
- `createTestScript()`: Creates a generated script
- `generateTestUsers()`: Creates multiple test users
- `generateTestHooks()`: Creates multiple test hooks

## Performance Considerations

- Tests are designed to run quickly with in-memory database
- Large datasets are generated in batches to avoid memory issues
- Test timeout is set to 20 seconds per test
- Complex queries include performance assertions

## Security Testing

Tests include security validations:

- Input validation for all user-provided data
- SQL injection protection
- Authentication and authorization checks
- Admin privilege enforcement
- Rate limiting tests

## Contributing

When modifying integration tests:

1. Ensure all tests still pass
2. Add tests for new functionality
3. Update documentation as needed
4. Follow the existing code style
5. Consider adding performance tests for new features

## Troubleshooting

### Common Issues

1. **Database Timeout**: Increase test timeout or optimize queries
2. **Memory Issues**: Use batch operations for large datasets
3. **Connection Errors**: Ensure Miniflare is properly configured
4. **Schema Mismatch**: Update migration files or test data

### Debug Mode

Run tests with verbose output:

```bash
npx vitest run --reporter verbose
```

### Database Inspection

To inspect the database during test development:

```javascript
// Add this to test to see current state
console.log(await db.select().from(schema.users));
```

## Future Enhancements

- Add API integration tests with mocked HTTP requests
- Include browser automation tests for UI flows
- Add load testing for high-throughput scenarios
- Implement property-based testing for edge cases
