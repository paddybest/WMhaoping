import { up as upCategories, down as downCategories } from '../../database/migrations/001-create-product-categories';
import { up, down } from '../../database/migrations/002-create-product-items';
import { pool } from '../../database/connection';

describe('Product Items Migration', () => {
  beforeAll(async () => {
    // Create merchants table first (dependency for both migrations)
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Run product_categories migration (dependency for product_items)
    await upCategories();
    // Run product_items migration
    await up();
  });

  afterAll(async () => {
    await down();
    await downCategories();
    await pool.execute('DROP TABLE IF EXISTS merchants');
  });

  it('should create product_items table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_items"') as any;
    expect(rows.length).toBe(1);
  });
});
