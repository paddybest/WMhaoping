import { jest } from '@jest/globals';

// Unmock the database connection for migration tests
jest.unmock('../../database/connection');

import { up, down } from '../../database/migrations/001-create-product-categories';
import { pool } from '../../database/connection';

describe('Product Categories Migration', () => {
  beforeAll(async () => {
    await up();
  });

  afterAll(async () => {
    await down();
    // Close the pool connection after all tests
    await pool.end();
  });

  it('should create product_categories table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_categories"');
    expect((rows as any[]).length).toBe(1);
  });

  it('should have all required columns', async () => {
    const [columns] = await pool.execute('DESCRIBE product_categories');
    const columnNames = (columns as any[]).map((c: any) => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('merchant_id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('parent_id');
    expect(columnNames).toContain('level');
    expect(columnNames).toContain('path');
    expect(columnNames).toContain('order_index');
  });
});
