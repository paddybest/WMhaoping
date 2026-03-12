import { pool } from '../connection';

/**
 * 为 product_categories 表添加 tags 列
 */
export async function up() {
  console.log('Adding tags column to product_categories table...');

  try {
    await pool.query(`
      ALTER TABLE product_categories
      ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'
    `);
    console.log('✅ Added tags column to product_categories table');
  } catch (error: any) {
    if (error.code === '42701') {
      console.log('⊘ tags column already exists in product_categories');
    } else {
      console.error('Error adding tags column:', error);
      throw error;
    }
  }
}

/**
 * 回滚此迁移
 */
export async function down() {
  console.log('Dropping tags column from product_categories table...');

  try {
    await pool.query(`
      ALTER TABLE product_categories
      DROP COLUMN IF EXISTS tags
    `);
    console.log('✅ Dropped tags column from product_categories table');
  } catch (error) {
    console.error('Error dropping tags column:', error);
    throw error;
  }
}
