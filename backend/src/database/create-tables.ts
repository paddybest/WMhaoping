import mysql from 'mysql2/promise';

async function createTables() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'rootpassword',
    database: 'haopingbao_dev'
  });

  try {
    // 创建 users 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        openid VARCHAR(255) UNIQUE,
        nickname VARCHAR(255),
        avatar VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ users table created');

    // 创建 reviews 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        product_id INT,
        merchant_id INT NOT NULL,
        content TEXT,
        rating INT DEFAULT 5,
        tags JSON,
        image_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log('✅ reviews table created');

    // 创建 prizes 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        merchant_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        probability DECIMAL(5,4) DEFAULT 0.1,
        stock INT DEFAULT 0,
        image_url VARCHAR(500),
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id)
      )
    `);
    console.log('✅ prizes table created');

    // 创建 lottery_codes 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lottery_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        prize_id INT,
        status TINYINT DEFAULT 0 COMMENT '0-未使用, 1-已使用',
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP NULL,
        INDEX idx_code (code),
        INDEX idx_status (status)
      )
    `);
    console.log('✅ lottery_codes table created');

    // 创建 lottery_records 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS lottery_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        prize_id INT,
        prize_name VARCHAR(255),
        reward_code VARCHAR(6),
        is_claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_prize_id (prize_id)
      )
    `);
    console.log('✅ lottery_records table created');

    // 创建 qr_code_scans 表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS qr_code_scans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        merchant_id INT NOT NULL,
        user_openid VARCHAR(255),
        qr_code_url VARCHAR(500),
        scan_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_merchant_id (merchant_id),
        INDEX idx_user_openid (user_openid)
      )
    `);
    console.log('✅ qr_code_scans table created');

    // 插入测试奖品
    await connection.query(`
      INSERT INTO prizes (id, merchant_id, name, description, probability, stock, is_active)
      VALUES
        (1, 1, '谢谢参与', '下次再来', 0.7, 100, 1),
        (2, 1, '5元优惠券', '无门槛5元优惠券', 0.2, 50, 1),
        (3, 1, '免费菜品', '价值20元菜品', 0.1, 10, 1)
      ON DUPLICATE KEY UPDATE name = name
    `);
    console.log('✅ Test prizes inserted');

    console.log('\n🎉 All tables created successfully!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

createTables();
