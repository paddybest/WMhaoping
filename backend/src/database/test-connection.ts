import { createPool, Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

/**
 * Test Database Configuration
 *
 * This module provides test database connection and utilities for setting up
 * and cleaning up the test database between test runs.
 */

/**
 * Test database connection pool (lazy-loaded)
 * The pool is created only when first accessed to avoid connecting during module import
 */
let _testPool: Pool | null = null;

export function getTestPool(): Pool {
  if (!_testPool) {
    _testPool = createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME_TEST || 'haopingbao_test',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return _testPool;
}

// For backward compatibility, export testPool as a getter
export const testPool: Pool = new Proxy({} as Pool, {
  get(target, prop) {
    return getTestPool()[prop as keyof Pool];
  }
});

/**
 * Tables to clear between tests
 * IMPORTANT: If you add new tables to the database, update this array!
 * Tables are listed in dependency order (child tables before parent tables)
 */
const TABLES = [
  'qr_code_scans',
  'qr_scan_statistics',
  'lottery_codes',
  'prizes',
  'product_images',
  'product_items',
  'product_categories',
  'merchants'
];

/**
 * Set up the test database
 *
 * Creates the test database if it doesn't exist and runs migrations if needed.
 * This should be called once before running tests.
 *
 * @example
 * ```typescript
 * import { setupTestDatabase } from '../src/database/test-connection';
 *
 * beforeAll(async () => {
 *   await setupTestDatabase();
 * });
 * ```
 */
export async function setupTestDatabase(): Promise<void> {
  try {
    // Connect without specifying database first
    const poolWithoutDb = createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Create test database if not exists
    await poolWithoutDb.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME_TEST || 'haopingbao_test'}`);

    // Close temporary connection
    await poolWithoutDb.end();

    console.log(`[TestDB] Test database '${process.env.DB_NAME_TEST || 'haopingbao_test'}' ready`);
  } catch (error) {
    console.error('[TestDB] Failed to setup test database:', error);
    throw error;
  }
}

/**
 * Clean up all tables in the test database
 *
 * Deletes all data from all tables. This should be called after each test
 * to ensure test isolation.
 *
 * @example
 * ```typescript
 * import { cleanupTestDatabase } from '../src/database/test-connection';
 *
 * afterEach(async () => {
 *   await cleanupTestDatabase();
 * });
 * ```
 */
export async function cleanupTestDatabase(): Promise<void> {
  try {
    // Disable foreign key checks temporarily
    await testPool.execute('SET FOREIGN_KEY_CHECKS = 0');

    // Delete all data from tables in reverse dependency order
    // WARNING: Table name interpolation - test code only with trusted TABLES array
    for (const table of TABLES) {
      await testPool.execute(`DELETE FROM ${table} WHERE 1=1`);
    }

    // Re-enable foreign key checks
    await testPool.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('[TestDB] Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * Close the test database connection
 *
 * This should be called once after all tests have run.
 *
 * @example
 * ```typescript
 * import { closeTestDatabase } from '../src/database/test-connection';
 *
 * afterAll(async () => {
 *   await closeTestDatabase();
 * });
 * ```
 */
export async function closeTestDatabase(): Promise<void> {
  try {
    if (_testPool) {
      await _testPool.end();
      _testPool = null;
      console.log('[TestDB] Test database connection closed');
    }
  } catch (error) {
    console.error('[TestDB] Failed to close test database connection:', error);
    throw error;
  }
}

/**
 * TRUNCATE TABLES - Clear all data from a table
 * NOTE: Table name interpolation is acceptable here because:
 * 1. This is test-only code, not production
 * 2. TABLES array contains trusted constants
 * 3. DO NOT copy this pattern to production code without proper validation
 *
 * Clears data from specific tables only.
 *
 * @param tables - Array of table names to truncate
 * @example
 * ```typescript
 * await truncateTables(['merchants', 'prizes']);
 * ```
 */
export async function truncateTables(tables: string[]): Promise<void> {
  try {
    await testPool.execute('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tables) {
      // WARNING: Table name interpolation - test code only with trusted TABLES array
      await testPool.execute(`DELETE FROM ${table} WHERE 1=1`);
    }

    await testPool.execute('SET FOREIGN_KEY_CHECKS = 1');
  } catch (error) {
    console.error('[TestDB] Failed to truncate tables:', error);
    throw error;
  }
}

/**
 * Insert test data into a table
 *
 * Utility function to quickly insert test data during tests.
 *
 * @param table - Table name
 * @param data - Object with column names and values
 * @returns Insert ID
 * @example
 * ```typescript
 * const merchantId = await insertTestData('merchants', {
 *   username: 'test_merchant',
 *   password: 'hashed_password',
 *   shop_name: 'Test Shop',
 *   name: 'Test Merchant',
 *   is_active: 1
 * });
 * ```
 */
export async function insertTestData(table: string, data: Record<string, any>): Promise<number> {
  const columns = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);

  // WARNING: Table name interpolation - test code only with trusted TABLES array
  const [result] = await testPool.execute(
    `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
    values
  );

  return (result as ResultSetHeader).insertId;
}

/**
 * Select test data from a table
 *
 * Utility function to query test data during tests.
 *
 * @param table - Table name
 * @param where - Object with column names and values for WHERE clause
 * @returns Array of rows
 * @example
 * ```typescript
 * const merchants = await selectTestData('merchants', { id: 1 });
 * ```
 */
export async function selectTestData(
  table: string,
  where: Record<string, any> = {}
): Promise<RowDataPacket[]> {
  // WARNING: Table name interpolation - test code only, DO NOT use in production
  let query = `SELECT * FROM ${table}`;
  const values: any[] = [];

  if (Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map(key => `${key} = ?`);
    query += ` WHERE ${conditions.join(' AND ')}`;
    values.push(...Object.values(where));
  }

  const [rows] = await testPool.execute(query, values);
  return rows as RowDataPacket[];
}

/**
 * Count records in a table
 *
 * @param table - Table name
 * @param where - Optional WHERE clause conditions
 * @returns Count of records
 */
export async function countTestData(
  table: string,
  where: Record<string, any> = {}
): Promise<number> {
  // WARNING: Table name interpolation - test code only, DO NOT use in production
  let query = `SELECT COUNT(*) as count FROM ${table}`;
  const values: any[] = [];

  if (Object.keys(where).length > 0) {
    const conditions = Object.keys(where).map(key => `${key} = ?`);
    query += ` WHERE ${conditions.join(' AND ')}`;
    values.push(...Object.values(where));
  }

  const [rows] = await testPool.execute(query, values);
  return (rows as RowDataPacket[])[0].count;
}

/**
 * Execute a raw SQL query
 *
 * Utility function for custom SQL queries in tests.
 *
 * @param query - SQL query string
 * @param values - Query parameters
 * @returns Query results
 */
export async function executeTestQuery(
  query: string,
  values: any[] = []
): Promise<RowDataPacket[]> {
  // WARNING: Table name interpolation - test code only, DO NOT use in production
  const [rows] = await testPool.execute(query, values);
  return rows as RowDataPacket[];
}
