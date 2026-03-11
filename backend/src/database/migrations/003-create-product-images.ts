import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      oss_file_id VARCHAR(500),
      order_index INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES product_items(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_product_images_product_order ON product_images(product_id, order_index);
  `;

  await pool.query(createTable);
  console.log('product_images table created successfully');
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS product_images CASCADE');
  console.log('product_images table dropped successfully');
}
