/**
 * Merchant Model Tests
 *
 * These tests verify CRUD operations and cascade delete behavior for the Merchant model.
 * IMPORTANT: These are REAL database tests (not mock tests) using testPool.execute().
 *
 * Test Infrastructure:
 * - Uses testPool from backend/src/database/test-connection.ts
 * - Test database: haopingbao_test (configured in .env.test)
 * - Real database operations for testing data integrity and constraints
 */

import {
  getTestPool,
  setupTestDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  countTestData,
  insertTestData
} from '../../src/database/test-connection';
import bcrypt from 'bcryptjs';

describe('Merchant Model - Data Model Tests', () => {
  const testPool = getTestPool();

  /**
   * Setup test database before running tests
   * Creates the test database if it doesn't exist
   */
  beforeAll(async () => {
    await setupTestDatabase();
  });

  /**
   * Clean up all tables between each test
   * Ensures test isolation and no test data pollution
   */
  beforeEach(async () => {
    await cleanupTestDatabase();
  });

  /**
   * Close test database connection after all tests
   */
  afterAll(async () => {
    await closeTestDatabase();
  });

  describe('Create Merchant Tests', () => {
    test('should create merchant with valid data', async () => {
      // Arrange: Prepare merchant data with hashed password
      const plainPassword = 'test_password_123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const merchantData = {
        username: 'test_merchant_001',
        password: hashedPassword,
        shop_name: 'Test Shop 001',
        name: 'Test Merchant Name',
        description: 'This is a test merchant',
        is_active: 1
      };

      // Act: Insert merchant into database
      const [result] = await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, description, is_active)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantData.username, merchantData.password, merchantData.shop_name, merchantData.name, merchantData.description, merchantData.is_active]
      );

      // Assert: Verify insert was successful
      const resultSetHeader = result as any;
      expect(resultSetHeader.affectedRows).toBe(1);
      expect(resultSetHeader.insertId).toBeDefined();
      expect(resultSetHeader.insertId).toBeGreaterThan(0);

      // Verify: Check that merchant was actually inserted
      const [rows] = await testPool.execute(
        'SELECT * FROM merchants WHERE id = ?',
        [resultSetHeader.insertId]
      );

      const merchants = rows as any[];
      expect(merchants).toHaveLength(1);
      expect(merchants[0].username).toBe(merchantData.username);
      expect(merchants[0].shop_name).toBe(merchantData.shop_name);
      expect(merchants[0].name).toBe(merchantData.name);
      expect(merchants[0].is_active).toBe(1);
    });

    test('should enforce unique username constraint', async () => {
      // Arrange: Create first merchant with username 'test_user'
      const hashedPassword = await bcrypt.hash('password123', 10);

      await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['test_user', hashedPassword, 'First Shop', 'First Merchant', 1]
      );

      // Act & Assert: Try to create second merchant with same username
      // This should throw an error due to unique constraint violation
      await expect(
        testPool.execute(
          `INSERT INTO merchants (username, password, shop_name, name, is_active)
           VALUES (?, ?, ?, ?, ?)`,
          ['test_user', hashedPassword, 'Second Shop', 'Second Merchant', 1]
        )
      ).rejects.toThrow();

      // Verify: Only one merchant with username 'test_user' exists
      const [rows] = await testPool.execute(
        'SELECT COUNT(*) as count FROM merchants WHERE username = ?',
        ['test_user']
      );

      const result = rows as any[];
      expect(result[0].count).toBe(1);
    });
  });

  describe('Merchant Model Relations - Cascade Delete Tests', () => {
    test('should cascade delete related product_categories', async () => {
      // Arrange: Create merchant
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [merchantResult] = await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['test_merchant_002', hashedPassword, 'Test Shop', 'Test Merchant', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create product_categories for merchant
      const [category1Result] = await testPool.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Category 1', null, 0, '/', 0]
      );
      const categoryId1 = (category1Result as any).insertId;

      // Update path for category 1
      await testPool.execute(
        'UPDATE product_categories SET path = ? WHERE id = ?',
        [`/${categoryId1}/`, categoryId1]
      );

      const [category2Result] = await testPool.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Category 2', null, 0, '/', 1]
      );
      const categoryId2 = (category2Result as any).insertId;

      // Update path for category 2
      await testPool.execute(
        'UPDATE product_categories SET path = ? WHERE id = ?',
        [`/${categoryId2}/`, categoryId2]
      );

      // Verify categories exist
      const initialCategoryCount = await countTestData('product_categories', { merchant_id: merchantId });
      expect(initialCategoryCount).toBe(2);

      // Act: Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Assert: Verify product_categories were cascade deleted
      const finalCategoryCount = await countTestData('product_categories', { merchant_id: merchantId });
      expect(finalCategoryCount).toBe(0);

      // Verify merchant was deleted
      const merchantCount = await countTestData('merchants', { id: merchantId });
      expect(merchantCount).toBe(0);
    });

    test('should cascade delete related product_items', async () => {
      // Arrange: Create merchant
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [merchantResult] = await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['test_merchant_003', hashedPassword, 'Test Shop', 'Test Merchant', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create product_category for merchant (required for product_items)
      const [categoryResult] = await testPool.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Test Category', null, 0, '/', 0]
      );
      const categoryId = (categoryResult as any).insertId;

      // Update path for category
      await testPool.execute(
        'UPDATE product_categories SET path = ? WHERE id = ?',
        [`/${categoryId}/`, categoryId]
      );

      // Create product_items for merchant
      const tags1 = JSON.stringify(['tag1', 'tag2']);
      const [product1Result] = await testPool.execute(
        `INSERT INTO product_items (merchant_id, category_id, name, tags, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [merchantId, categoryId, 'Product 1', tags1, 1]
      );

      const tags2 = JSON.stringify(['tag3']);
      const [product2Result] = await testPool.execute(
        `INSERT INTO product_items (merchant_id, category_id, name, tags, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [merchantId, categoryId, 'Product 2', tags2, 1]
      );

      // Verify products exist
      const initialProductCount = await countTestData('product_items', { merchant_id: merchantId });
      expect(initialProductCount).toBe(2);

      // Act: Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Assert: Verify product_items were cascade deleted
      const finalProductCount = await countTestData('product_items', { merchant_id: merchantId });
      expect(finalProductCount).toBe(0);

      // Verify merchant was deleted
      const merchantCount = await countTestData('merchants', { id: merchantId });
      expect(merchantCount).toBe(0);
    });

    test('should cascade delete related prizes', async () => {
      // Arrange: Create merchant
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [merchantResult] = await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['test_merchant_004', hashedPassword, 'Test Shop', 'Test Merchant', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create prizes for merchant
      await testPool.execute(
        `INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Prize 1', 'Description 1', 10, 100, 'https://example.com/prize1.png']
      );

      await testPool.execute(
        `INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Prize 2', 'Description 2', 20, 50, 'https://example.com/prize2.png']
      );

      await testPool.execute(
        `INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Prize 3', 'Description 3', 30, 75, 'https://example.com/prize3.png']
      );

      // Verify prizes exist
      const initialPrizeCount = await countTestData('prizes', { merchant_id: merchantId });
      expect(initialPrizeCount).toBe(3);

      // Act: Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Assert: Verify prizes were cascade deleted
      const finalPrizeCount = await countTestData('prizes', { merchant_id: merchantId });
      expect(finalPrizeCount).toBe(0);

      // Verify merchant was deleted
      const merchantCount = await countTestData('merchants', { id: merchantId });
      expect(merchantCount).toBe(0);
    });

    test('should cascade delete combined relations (products and prizes)', async () => {
      // Arrange: Create merchant
      const hashedPassword = await bcrypt.hash('password123', 10);
      const [merchantResult] = await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['test_merchant_005', hashedPassword, 'Test Shop', 'Test Merchant', 1]
      );
      const merchantId = (merchantResult as any).insertId;

      // Create product_categories for merchant
      const [category1Result] = await testPool.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Category 1', null, 0, '/', 0]
      );
      const categoryId1 = (category1Result as any).insertId;
      await testPool.execute('UPDATE product_categories SET path = ? WHERE id = ?', [`/${categoryId1}/`, categoryId1]);

      const [category2Result] = await testPool.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Category 2', null, 0, '/', 1]
      );
      const categoryId2 = (category2Result as any).insertId;
      await testPool.execute('UPDATE product_categories SET path = ? WHERE id = ?', [`/${categoryId2}/`, categoryId2]);

      // Create product_items for merchant
      const tags1 = JSON.stringify(['tag1']);
      await testPool.execute(
        `INSERT INTO product_items (merchant_id, category_id, name, tags, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [merchantId, categoryId1, 'Product 1', tags1, 1]
      );

      const tags2 = JSON.stringify(['tag2']);
      await testPool.execute(
        `INSERT INTO product_items (merchant_id, category_id, name, tags, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [merchantId, categoryId2, 'Product 2', tags2, 1]
      );

      // Create prizes for merchant
      await testPool.execute(
        `INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Prize A', 'Description A', 15, 80, 'https://example.com/prizeA.png']
      );

      await testPool.execute(
        `INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [merchantId, 'Prize B', 'Description B', 25, 60, 'https://example.com/prizeB.png']
      );

      // Verify all related data exists before deletion
      const initialCategoryCount = await countTestData('product_categories', { merchant_id: merchantId });
      const initialProductCount = await countTestData('product_items', { merchant_id: merchantId });
      const initialPrizeCount = await countTestData('prizes', { merchant_id: merchantId });

      expect(initialCategoryCount).toBe(2);
      expect(initialProductCount).toBe(2);
      expect(initialPrizeCount).toBe(2);

      // Act: Delete merchant
      await testPool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);

      // Assert: Verify all related data was cascade deleted
      const finalCategoryCount = await countTestData('product_categories', { merchant_id: merchantId });
      const finalProductCount = await countTestData('product_items', { merchant_id: merchantId });
      const finalPrizeCount = await countTestData('prizes', { merchant_id: merchantId });

      expect(finalCategoryCount).toBe(0);
      expect(finalProductCount).toBe(0);
      expect(finalPrizeCount).toBe(0);

      // Verify merchant was deleted
      const merchantCount = await countTestData('merchants', { id: merchantId });
      expect(merchantCount).toBe(0);
    });
  });

  describe('Test Isolation', () => {
    test('should not pollute other tests with data', async () => {
      // Arrange: Create a merchant
      const hashedPassword = await bcrypt.hash('password123', 10);
      await testPool.execute(
        `INSERT INTO merchants (username, password, shop_name, name, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        ['isolation_test', hashedPassword, 'Isolation Shop', 'Isolation Merchant', 1]
      );

      // Act: Count all merchants in database
      const [rows] = await testPool.execute('SELECT COUNT(*) as count FROM merchants');
      const result = rows as any[];

      // Assert: Should only have this one merchant (no pollution from other tests)
      expect(result[0].count).toBe(1);
    });
  });
});
