import { pool } from '../connection';

/**
 * 创建产品标签关联表
 */
export async function up() {
  console.log('Creating product_tags table...');

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_tags (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, tag_id),
        FOREIGN KEY (product_id) REFERENCES product_items(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES product_tag_labels(id) ON DELETE CASCADE
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_tags_product_id ON product_tags(product_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_product_tags_tag_id ON product_tags(tag_id)`);

    console.log('✅ product_tags table created successfully');

  } catch (error) {
    console.error('Error creating product_tags table:', error);
    throw error;
  }
}

/**
 * 回滚此迁移
 */
export async function down() {
  console.log('Dropping product_tags table...');

  try {
    await pool.query(`DROP TABLE IF EXISTS product_tags CASCADE`);
    console.log('✅ product_tags table dropped successfully');

  } catch (error) {
    console.error('Error dropping product_tags table:', error);
    throw error;
  }
}
