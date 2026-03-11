import { pool } from './connection';

async function addColumn() {
  try {
    // PostgreSQL: 使用 IF NOT EXISTS
    await pool.query('ALTER TABLE product_items ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(500)');
    console.log('✅ Column qr_code_url added');
  } catch (e: any) {
    // PostgreSQL 错误码是 42710 表示字段已存在
    if (e.code === '42710') {
      console.log('⊘ Column qr_code_url already exists');
    } else {
      console.error('Error:', e.message);
    }
  }
  process.exit(0);
}

addColumn();
