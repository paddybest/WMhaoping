import mysql from 'mysql2/promise';

async function createDatabase() {
  // 连接时不指定数据库
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'rootpassword'
  });

  try {
    await connection.query('CREATE DATABASE IF NOT EXISTS haopingbao_dev');
    await connection.query('USE haopingbao_dev');
    console.log('✅ Database haopingbao_dev created');

    // 创建商家表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS merchants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        shop_name VARCHAR(255),
        name VARCHAR(255),
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Merchants table created');

    // 创建测试商家
    await connection.execute(`
      INSERT INTO merchants (id, username, password, shop_name, name, is_active)
      VALUES (1, 'test', '$2a$10$test', '测试店铺', '测试商家', 1)
      ON DUPLICATE KEY UPDATE name = '测试商家', is_active = 1
    `);
    console.log('✅ Test merchant created');

    // 创建商品分类表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        merchant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        level INT DEFAULT 0,
        path VARCHAR(500),
        tags JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id)
      )
    `);
    console.log('✅ product_categories table created');

    // 创建商品表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        merchant_id INT NOT NULL,
        category_id INT,
        name VARCHAR(255) NOT NULL,
        tags JSON,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_category_id (category_id)
      )
    `);
    console.log('✅ product_items table created');

    // 创建商品图片表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        image_url VARCHAR(500),
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_product_id (product_id)
      )
    `);
    console.log('✅ product_images table created');

    // 创建商品标签表
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_tag_labels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        merchant_id INT NOT NULL,
        category_id INT,
        name VARCHAR(255) NOT NULL,
        order_index INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_category_id (category_id)
      )
    `);
    console.log('✅ product_tag_labels table created');

    // 创建测试分类
    await connection.execute(`
      INSERT INTO product_categories (id, merchant_id, name, level, path)
      VALUES (1, 1, '美食', 0, '/1/')
      ON DUPLICATE KEY UPDATE name = '美食'
    `);
    console.log('✅ Test category created');

    // 创建测试商品
    await connection.execute(`
      INSERT INTO product_items (id, merchant_id, category_id, name, is_active)
      VALUES (1, 1, 1, '招牌炒饭', 1), (2, 1, 1, '宫保鸡丁', 1), (3, 1, 1, '红烧肉', 1)
      ON DUPLICATE KEY UPDATE name = name
    `);
    console.log('✅ Test products created');

    // 创建测试标签
    await connection.execute(`
      INSERT INTO product_tag_labels (id, merchant_id, name, order_index)
      VALUES (1, 1, '好吃', 1), (2, 1, '分量足', 2), (3, 1, '味道棒', 3), (4, 1, '推荐', 4)
      ON DUPLICATE KEY UPDATE name = name
    `);
    console.log('✅ Test tags created');

    console.log('\n🎉 All test data created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createDatabase();
