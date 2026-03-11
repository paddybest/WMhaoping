import { pool } from './src/database/connection';

async function addColumn() {
  try {
    await pool.execute('ALTER TABLE product_tag_labels ADD COLUMN order_index INT DEFAULT 0 COMMENT "排序索引"');
    console.log('Column added successfully');
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

addColumn();
