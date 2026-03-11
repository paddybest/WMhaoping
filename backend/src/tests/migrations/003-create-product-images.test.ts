import { jest } from '@jest/globals';

// Unmock the database connection for migration tests
jest.unmock('../../database/connection');

import { up as up001, down as down001 } from '../../database/migrations/001-create-product-categories';
import { up as up002, down as down002 } from '../../database/migrations/002-create-product-items';
import { up, down } from '../../database/migrations/003-create-product-images';
import { pool } from '../../database/connection';

describe('Product Images Migration', () => {
  beforeAll(async () => {
    // Create merchants table first (dependency for product_categories)
    const createMerchants = `
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    await pool.execute(createMerchants);

    // Run dependent migrations
    await up001();  // Create product_categories table
    await up002();  // Create product_items table
    await up();     // Create product_images table
  });

  afterAll(async () => {
    await down();      // Drop product_images table
    await down002();   // Drop product_items table
    await down001();   // Drop product_categories table
    await pool.execute('DROP TABLE IF EXISTS merchants'); // Drop merchants table
  });

  it('should create product_images table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_images"') as any;
    expect(rows.length).toBe(1);
  });
});
