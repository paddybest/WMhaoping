# Test Helpers Reference Guide

This document provides a quick reference for all available test helper functions.

## Table of Contents

- [Database Helpers](#database-helpers)
- [JWT Token Helpers](#jwt-token-helpers)
- [QR Code Signature Helpers](#qr-code-signature-helpers)
- [Password Hashing Helpers](#password-hashing-helpers)
- [Merchant Test Data Helpers](#merchant-test-data-helpers)
- [Prize Test Data Helpers](#prize-test-data-helpers)
- [Lottery Code Test Data Helpers](#lottery-code-test-data-helpers)
- [HTTP Request Helpers](#http-request-helpers)
- [Assertion Helpers](#assertion-helpers)

## Database Helpers

### setupTestEnv()

Sets up the test database (creates database if needed).

```typescript
await setupTestEnv();
```

### cleanupTestEnv()

Cleans up all tables in the test database. Call this after each test.

```typescript
await cleanupTestEnv();
```

### teardownTestEnv()

Closes the test database connection. Call this after all tests.

```typescript
await teardownTestEnv();
```

### insertTestData(table, data)

Inserts test data into a table.

```typescript
const merchantId = await insertTestData('merchants', {
  username: 'test_merchant',
  password: 'hashed_password',
  shop_name: 'Test Shop'
});
```

### selectTestData(table, where)

Selects test data from a table.

```typescript
const merchants = await selectTestData('merchants', { id: 1 });
```

### countTestData(table, where)

Counts records in a table.

```typescript
const count = await countTestData('merchants', { is_active: 1 });
```

## JWT Token Helpers

### generateTestUserToken(userId, openid, expiresIn)

Generates a JWT token for a user.

```typescript
const token = generateTestUserToken(1, 'test_openid_123', '7d');
```

### generateTestMerchantToken(merchantId, username, expiresIn)

Generates a JWT token for a merchant.

```typescript
const token = generateTestMerchantToken(1, 'test_merchant', '7d');
```

### verifyTestToken(token)

Verifies a JWT token.

```typescript
const payload = verifyTestToken(token);
if (payload) {
  console.log('Token is valid:', payload);
}
```

## QR Code Signature Helpers

### generateTestQRCodeSignature(merchantId)

Generates a QR code signature for a merchant.

```typescript
const signature = generateTestQRCodeSignature(123);
// Returns: "s1nRexUWgwmK46Gn"
```

### verifyTestQRCodeSignature(merchantId, signature)

Verifies a QR code signature.

```typescript
const isValid = verifyTestQRCodeSignature(123, 's1nRexUWgwmK46Gn');
// Returns: true
```

## Password Hashing Helpers

### hashTestPassword(password)

Hashes a password using bcrypt.

```typescript
const hashedPassword = await hashTestPassword('my_password');
```

### verifyTestPassword(password, hashedPassword)

Verifies a password against a hash.

```typescript
const isValid = await verifyTestPassword('my_password', hashedPassword);
// Returns: true or false
```

## Merchant Test Data Helpers

### createTestMerchant(overrides)

Creates a test merchant in the database.

```typescript
const merchant = await createTestMerchant({
  username: 'test_merchant',
  shopName: 'Test Shop',
  name: 'Test Merchant',
  is_active: true
});

// Returns: { id: 1, username: 'test_merchant', shopName: 'Test Shop', ... }
```

### createTestMerchants(count, baseOverrides)

Creates multiple test merchants.

```typescript
const merchants = await createTestMerchants(5, { is_active: true });
// Creates 5 merchants with is_active: true
```

## Prize Test Data Helpers

### createTestPrize(merchantId, overrides)

Creates a test prize for a merchant.

```typescript
const prize = await createTestPrize(1, {
  name: 'Test Prize',
  description: 'Test description',
  probability: 10,
  stock: 100,
  image_url: 'https://example.com/prize.png'
});

// Returns: { id: 1, merchant_id: 1, name: 'Test Prize', ... }
```

### createTestPrizes(merchantId, count, baseOverrides)

Creates multiple test prizes for a merchant.

```typescript
const prizes = await createTestPrizes(1, 3, { stock: 50 });
// Creates 3 prizes with stock: 50
```

## Lottery Code Test Data Helpers

### createTestLotteryCode(overrides)

Creates a test lottery code.

```typescript
const code = await createTestLotteryCode({
  code: 'ABC123',
  prize_id: 1,
  merchant_id: 1,
  status: 0
});

// Returns: { id: 1, code: 'ABC123', prize_id: 1, ... }
```

### createTestLotteryCodes(prizeId, count, overrides)

Creates multiple test lottery codes for a prize.

```typescript
const codes = await createTestLotteryCodes(1, 10, { status: 0 });
// Creates 10 codes with status: 0
```

## HTTP Request Helpers

### getMerchantAuthHeaders(merchantId, username)

Generates authorization headers for a merchant request.

```typescript
const headers = getMerchantAuthHeaders(1, 'test_merchant');

// Returns: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIs...' }

// Usage with supertest:
await request(app)
  .get('/api/merchants/me')
  .set(headers);
```

### getUserAuthHeaders(userId, openid)

Generates authorization headers for a user request.

```typescript
const headers = getUserAuthHeaders(1, 'test_openid_123');

// Returns: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIs...' }
```

## Assertion Helpers

### assertHasProperties(obj, properties)

Asserts that an object has specific properties. Throws an error if any property is missing.

```typescript
const merchant = { id: 1, username: 'test', shopName: 'Test Shop' };
assertHasProperties(merchant, ['id', 'username', 'shopName']);
// Passes

assertHasProperties(merchant, ['id', 'username', 'email']);
// Throws: Object is missing property: email
```

### assertObjectsMatch(obj1, obj2, properties)

Asserts that two objects have the same values for specific properties.

```typescript
const obj1 = { id: 1, name: 'Test', value: 100 };
const obj2 = { id: 1, name: 'Test', value: 200 };

assertObjectsMatch(obj1, obj2, ['id', 'name']);
// Passes

assertObjectsMatch(obj1, obj2, ['id', 'name', 'value']);
// Throws: Objects differ on property 'value': 100 !== 200
```

## Complete Test Example

```typescript
import request from 'supertest';
import app from '../src/app';
import {
  setupTestEnv,
  cleanupTestEnv,
  createTestMerchant,
  createTestPrize,
  getMerchantAuthHeaders
} from './helpers';

describe('Prize API', () => {
  beforeAll(async () => {
    await setupTestEnv();
  });

  afterAll(async () => {
    await cleanupTestEnv();
  });

  afterEach(async () => {
    await cleanupTestEnv();
  });

  it('should create a prize', async () => {
    // Create test merchant
    const merchant = await createTestMerchant();
    const headers = getMerchantAuthHeaders(merchant.id!, merchant.username);

    // Create prize
    const response = await request(app)
      .post('/api/prizes')
      .set(headers)
      .send({
        name: 'Test Prize',
        probability: 10,
        stock: 100
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Test Prize');
    expect(response.body.merchant_id).toBe(merchant.id);
  });

  it('should get prizes for a merchant', async () => {
    // Create test merchant and prizes
    const merchant = await createTestMerchant();
    await createTestPrize(merchant.id!, { name: 'Prize 1' });
    await createTestPrize(merchant.id!, { name: 'Prize 2' });

    const headers = getMerchantAuthHeaders(merchant.id!, merchant.username);

    // Get prizes
    const response = await request(app)
      .get('/api/prizes')
      .set(headers);

    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });
});
```

## Best Practices

### 1. Always Clean Up Between Tests

```typescript
afterEach(async () => {
  await cleanupTestEnv();
});
```

### 2. Use Descriptive Test Data

```typescript
// Good
const merchant = await createTestMerchant({
  username: 'test_merchant_with_prizes',
  shopName: 'Test Shop with Prizes'
});

// Avoid
const merchant = await createTestMerchant();
```

### 3. Verify Data in Database

```typescript
const prize = await createTestPrize(merchantId);
const dbPrize = await selectTestData('prizes', { id: prize.id });
expect(dbPrize.length).toBe(1);
```

### 4. Use Assertions for Object Properties

```typescript
const response = { id: 1, name: 'Test', value: 100 };
assertHasProperties(response, ['id', 'name', 'value']);
```

### 5. Test Multi-Tenant Isolation

```typescript
it('should not allow merchant to access another merchant data', async () => {
  const merchant1 = await createTestMerchant({ username: 'merchant1' });
  const merchant2 = await createTestMerchant({ username: 'merchant2' });

  const prize = await createTestPrize(merchant1.id!);

  // Try to access with merchant2's token
  const headers = getMerchantAuthHeaders(merchant2.id!, merchant2.username);

  const response = await request(app)
    .get(`/api/prizes/${prize.id}`)
    .set(headers);

  expect(response.status).toBe(403);
});
```

## Troubleshooting

### Issue: Tests fail with "EADDRINUSE"

The server is already running. Stop it before running tests, or use a different port in test environment.

### Issue: "Table doesn't exist"

Make sure to call `setupTestEnv()` in `beforeAll()` to create the test database.

### Issue: Tests are not isolated

Make sure to call `cleanupTestEnv()` in `afterEach()` to clean up between tests.

### Issue: Mocks not working

Make sure the setup files are loaded. Check `jest.config.js` has:
```javascript
setupFilesAfterEnv: [
  '<rootDir>/src/tests/setup.ts',
  '<rootDir>/tests/setup-test-db.ts'
]
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Phase 5.1 Completion Summary](../docs/phase-5.1-completion-summary.md)
