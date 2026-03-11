import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_items (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      name VARCHAR(255) NOT NULL,
      tags JSONB,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_items_merchant_category ON product_items(merchant_id, category_id);
  `;

  await pool.query(createTable);
  console.log('product_items table created successfully');
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS product_items CASCADE');
  console.log('product_items table dropped successfully');
}
