import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_categories (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      parent_id INTEGER DEFAULT NULL,
      level INTEGER NOT NULL DEFAULT 0,
      path VARCHAR(500) NOT NULL DEFAULT '/',
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_categories_merchant_parent ON product_categories(merchant_id, parent_id);
    CREATE INDEX IF NOT EXISTS idx_product_categories_path ON product_categories(path);
  `;

  await pool.query(createTable);
  console.log('product_categories table created successfully');
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS product_categories CASCADE');
  console.log('product_categories table dropped successfully');
}
