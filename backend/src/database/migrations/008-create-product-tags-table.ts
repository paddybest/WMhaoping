import { pool } from '../connection';

/**
 * 创建产品标签表
 */
export async function up() {
  console.log('Creating product_tag_labels table...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_tag_labels (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        category_id INTEGER,
        merchant_id INTEGER NOT NULL,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_tag_labels_merchant_category ON product_tag_labels(merchant_id, category_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_tag_labels_name ON product_tag_labels(name)`);

    console.log('product_tag_labels table created successfully');

  } catch (error) {
    console.error('Error creating product_tag_labels table:', error);
    throw error;
  }
}

/**
 * 回滚此迁移
 */
export async function down() {
  console.log('Dropping product_tag_labels table...');

  try {
    await pool.query(`DROP TABLE IF EXISTS product_tag_labels CASCADE`);
    console.log('product_tag_labels table dropped successfully');

  } catch (error) {
    console.error('Error dropping product_tag_labels table:', error);
    throw error;
  }
}
