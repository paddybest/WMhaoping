// 单独运行的迁移脚本 - 添加 product_categories.tags 列
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'pgm-2ze0671j02f2008n.pg.rds.aliyuncs.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'Yidashi',
  password: process.env.DB_PASSWORD || 'Zxcvb135',
  database: process.env.DB_NAME || 'WMhaopingbao',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    // 检查列是否存在
    const checkResult = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'product_categories' AND column_name = 'tags'
    `);

    if (checkResult.rows.length > 0) {
      console.log('⊘ tags 列已存在');
    } else {
      await client.query(`
        ALTER TABLE product_categories ADD COLUMN tags JSONB DEFAULT '[]'
      `);
      console.log('✅ 已添加 tags 列到 product_categories 表');
    }

    // 插入迁移记录
    const migrationResult = await client.query(
      "SELECT name FROM migrations WHERE name = '011-add-category-tags-column'"
    );
    if (migrationResult.rows.length === 0) {
      await client.query(
        "INSERT INTO migrations (name) VALUES ('011-add-category-tags-column')"
      );
      console.log('✅ 已插入迁移记录');
    } else {
      console.log('⊘ 迁移记录已存在');
    }

    console.log('\n✅ 迁移完成！');
  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
