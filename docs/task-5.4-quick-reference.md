# Merchant Model Tests - Quick Reference

## Overview
Real database tests for Merchant model CRUD operations and cascade delete behavior.

## File Location
```
backend/tests/models/merchant.test.ts
```

## Test Structure

### Test Suites (7 tests total)

#### 1. Create Merchant Tests (2 tests)
- `should create merchant with valid data` - Verify merchant creation
- `should enforce unique username constraint` - Verify unique constraint

#### 2. Cascade Delete Tests (4 tests)
- `should cascade delete related product_categories` - Delete categories when merchant deleted
- `should cascade delete related product_items` - Delete products when merchant deleted
- `should cascade delete related prizes` - Delete prizes when merchant deleted
- `should cascade delete combined relations (products and prizes)` - Delete all related data

#### 3. Test Isolation (1 test)
- `should not pollute other tests with data` - Verify cleanup between tests

## Running the Tests

### Basic Run
```bash
cd backend
npm test -- --testPathPattern=tests/models/merchant.test.ts
```

### Verbose Output
```bash
cd backend
npm test -- --testPathPattern=tests/models/merchant.test.ts --verbose
```

### With Coverage
```bash
cd backend
npm test -- --testPathPattern=tests/models/merchant.test.ts --coverage
```

### Watch Mode
```bash
cd backend
npm test -- --testPathPattern=tests/models/merchant.test.ts --watch
```

## Database Setup

### Test Database
- **Name**: `haopingbao_test`
- **Host**: localhost
- **Port**: 3306
- **User**: root
- **Password**: rootpassword

### Tables Required
```sql
merchants
product_categories
product_items
product_images
prizes
qr_code_scans
qr_scan_statistics
lottery_codes
```

### Foreign Key Constraints
All tables with `merchant_id` foreign key have `ON DELETE CASCADE`:
- product_categories.merchant_id → merchants.id
- product_items.merchant_id → merchants.id
- prizes.merchant_id → merchants.id
- lottery_codes.merchant_id → merchants.id

## Test Results

### Expected Output
```
PASS tests/models/merchant.test.ts
  Merchant Model - Data Model Tests
    Create Merchant Tests
      √ should create merchant with valid data (99 ms)
      √ should enforce unique username constraint (108 ms)
    Merchant Model Relations - Cascade Delete Tests
      √ should cascade delete related product_categories (347 ms)
      √ should cascade delete related product_items (112 ms)
      √ should cascade delete related prizes (119 ms)
      √ should cascade delete combined relations (products and prizes) (341 ms)
    Test Isolation
      √ should not pollute other tests with data (81 ms)

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
```

### Performance
- **Total Time**: ~3-4 seconds
- **Average per test**: ~500 ms
- **Slowest test**: cascade delete operations (300-350 ms)

## Key Features

### Real Database Operations
- Uses `testPool.execute()` for SQL operations
- No mocking - tests actual database behavior
- Validates real constraints

### Test Isolation
- `beforeEach`: Calls `cleanupTestDatabase()`
- Each test starts with clean state
- No test pollution

### Security
- All queries use prepared statements (? placeholders)
- Passwords hashed with bcrypt
- No SQL injection vulnerabilities

## Common Issues

### Issue: "Unknown column 'name' in 'field list'"
**Cause**: Merchants table missing columns from migration 005
**Solution**: Run migration 005 or recreate table with all columns

### Issue: "Table 'haopingbao_test.XXX' doesn't exist"
**Cause**: Test database tables not created
**Solution**: Run database migrations for test database

### Issue: Tests pass but data persists
**Cause**: `cleanupTestDatabase()` not working
**Solution**: Check foreign key constraints and cleanup logic

## Test Dependencies

### Required Modules
```typescript
import {
  getTestPool,
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  countTestData,
  insertTestData
} from '../../src/database/test-connection';
import bcrypt from 'bcryptjs';
```

### Test Configuration
- Jest: Configured in `jest.config.js`
- Environment: `.env.test`
- Database connection: `src/database/test-connection.ts`

## Extending the Tests

### Adding New Tests

1. **Create Test Function**
```typescript
test('should do something new', async () => {
  // Arrange
  const testData = { ... };

  // Act
  const result = await testPool.execute('...', [...]);

  // Assert
  expect(result).toBeDefined();
});
```

2. **Use Helper Functions**
```typescript
// Count records
const count = await countTestData('table_name', { condition });

// Insert test data
const id = await insertTestData('table_name', { data });
```

3. **Clean Up**
```typescript
beforeEach(async () => {
  await cleanupTestDatabase();
});
```

## Comparison: Model Tests vs Mock Tests

### Model Tests (This File)
- ✅ Real database operations
- ✅ Tests actual constraints
- ✅ Validates cascade behavior
- ✅ More comprehensive
- ❌ Slower execution
- ❌ Requires database setup

### Mock Tests (Middleware, API)
- ✅ Fast execution
- ✅ No database required
- ✅ Isolated testing
- ❌ Doesn't test real database
- ❌ May miss constraint issues

## Coverage

### Code Coverage
These tests provide coverage for:
- CRUD operations
- Foreign key constraints
- Cascade delete behavior
- Unique constraints
- Data validation

### Database Coverage
- Table structure validation
- Foreign key integrity
- Constraint enforcement
- Cascade operations

## Maintenance

### When to Update Tests

1. **Schema Changes**
   - Add/remove columns
   - Change constraints
   - Update foreign keys

2. **Model Changes**
   - Add new methods
   - Change existing methods
   - Update business logic

3. **New Features**
   - Add new relations
   - Add new tables
   - Add new constraints

## Related Tests

- `tests/middleware/auth.test.ts` - Authentication middleware (mocks)
- `tests/api/merchant.test.ts` - Merchant API endpoints (integration)
- `tests/setup-verification.test.ts` - Test infrastructure verification

## Support

### Documentation
- Main: `docs/task-5.4-completion-summary.md`
- Test connection: `src/database/test-connection.ts`
- Database models: `src/database/models/Merchant.ts`

### Issue Tracking
Report issues to:
- Test failures
- Database setup problems
- Performance issues

---

**Last Updated**: 2026-02-16
**Status**: ✅ All tests passing (7/7)
**Version**: 1.0.0
