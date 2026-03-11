import { pool } from './src/database/connection';

async function addTestProduct() {
  try {
    // 检查商家是否存在
    const [merchants]: any = await pool.execute('SELECT id FROM merchants LIMIT 1');
    if (merchants.length === 0) {
      console.log('No merchant found, creating one...');
      await pool.execute(
        'INSERT INTO merchants (name, contact_phone, status) VALUES (?, ?, ?)',
        ['测试商家', '13800138000', 1]
      );
    }

    const merchantId = merchants[0]?.id || 1;

    // 确保分类存在
    await pool.execute(`
      INSERT INTO product_categories (id, merchant_id, name, level, path)
      VALUES (1, ${merchantId}, '烧烤', 0, '/1/')
      ON DUPLICATE KEY UPDATE name = '烧烤'
    `);
    console.log('✅ Category created');

    // 检查商品是否已存在
    const [existing]: any = await pool.execute(
      'SELECT id FROM product_items WHERE name = ? AND merchant_id = ?',
      ['烧烤吧', merchantId]
    );

    if (existing.length > 0) {
      console.log('Product already exists:', existing[0].id);
    } else {
      // 创建测试商品
      await pool.execute(
        `INSERT INTO product_items (merchant_id, category_id, name, is_active) 
         VALUES (?, ?, ?, ?)`,
        [merchantId, 1, '烧烤吧', 1]
      );
      console.log('✅ Product "烧烤吧" created successfully');
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    process.exit(0);
  }
}

addTestProduct();
