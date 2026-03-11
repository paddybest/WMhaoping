import { pool } from './connection';

async function createTestMerchant() {
  try {
    // PostgreSQL: 使用 ON CONFLICT
    await pool.query(`
      INSERT INTO merchants (id, username, password, shop_name, name, is_active)
      VALUES (1, 'test', '$2a$10$test', '测试店铺', '测试商家', 1)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active
    `);
    console.log('✅ Test merchant created/updated');

    const result = await pool.query('SELECT * FROM merchants WHERE id = 1');
    console.log('Merchant data:', result.rows);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestMerchant();
