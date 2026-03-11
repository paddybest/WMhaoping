import { pool } from './connection';

async function addMissingColumns() {
  try {
    const columns = [
      { table: 'product_categories', name: 'tags', sql: 'JSON COMMENT "标签"' },
      { table: 'product_items', name: 'tags', sql: 'JSON COMMENT "标签"' }
    ];

    for (const col of columns) {
      try {
        // PostgreSQL: 使用 IF NOT EXISTS
        await pool.query(`ALTER TABLE ${col.table} ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql.replace("COMMENT", "-- COMMENT")}`);
        console.log(`✅ Added ${col.table}.${col.name}`);
      } catch (e: any) {
        // PostgreSQL 错误码是 42710 表示字段已存在
        if (e.code === '42710') {
          console.log(`⊘ ${col.table}.${col.name} already exists`);
        } else {
          throw e;
        }
      }
    }

    // PostgreSQL: 使用 ON CONFLICT
    await pool.query(`
      INSERT INTO product_categories (id, merchant_id, name, level, path)
      VALUES (1, 1, '美食', 0, '/1/')
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
    console.log('✅ Category created');

    await pool.query(`
      INSERT INTO product_items (id, merchant_id, category_id, name, is_active)
      VALUES (1, 1, 1, '招牌炒饭', 1)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `);
    console.log('✅ Product created');

    const productsResult = await pool.query('SELECT * FROM product_items WHERE merchant_id = 1');
    console.log('Products:', productsResult.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addMissingColumns();
