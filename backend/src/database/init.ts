import { pool } from './connection';

export async function initializeDatabase() {
  // PostgreSQL 语法
  const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      openid VARCHAR(255) UNIQUE NOT NULL,
      nickname VARCHAR(255),
      avatar VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      tags JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      content TEXT NOT NULL,
      rating INT CHECK (rating >= 1 AND rating <= 5),
      tags JSONB,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      probability DECIMAL(5,4) DEFAULT 0.1,
      stock INT DEFAULT 0,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lottery_codes (
      id SERIAL PRIMARY KEY,
      code VARCHAR(6) UNIQUE NOT NULL,
      prize_id INT,
      status SMALLINT DEFAULT 0,
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lottery_records (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL,
      prize_id INT,
      prize_name VARCHAR(255),
      reward_code VARCHAR(6),
      is_claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_lottery_codes_code ON lottery_codes(code);
    CREATE INDEX IF NOT EXISTS idx_lottery_codes_status ON lottery_codes(status);
    CREATE INDEX IF NOT EXISTS idx_lottery_codes_user_id ON lottery_codes(user_id);
    CREATE INDEX IF NOT EXISTS idx_lottery_codes_prize_id ON lottery_codes(prize_id);
    CREATE INDEX IF NOT EXISTS idx_lottery_records_user_id ON lottery_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_lottery_records_prize_id ON lottery_records(prize_id);
    CREATE INDEX IF NOT EXISTS idx_lottery_records_created_at ON lottery_records(created_at);
    CREATE INDEX IF NOT EXISTS idx_lottery_records_reward_code ON lottery_records(reward_code);
    CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at);
  `;

  try {
    await pool.query(createTables);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// 插入初始数据的辅助函数
export async function insertInitialData() {
  // 插入初始商品数据 (PostgreSQL 使用 ON CONFLICT)
  const initialProducts = [
    { name: '女装', tags: ['轻薄', '修身', '百搭', '舒适', '时尚', '潮流'] },
    { name: '男装', tags: ['休闲', '商务', '时尚', '舒适', '百搭', '潮流'] },
    { name: '数码', tags: ['高性能', '轻薄', '长续航', '拍照好', '游戏', '办公'] },
    { name: '美妆', tags: ['保湿', '美白', '抗衰老', '敏感肌', '天然', '有机'] }
  ];

  for (const product of initialProducts) {
    try {
      await pool.query(
        'INSERT INTO products (name, tags) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
        [product.name, JSON.stringify(product.tags)]
      );
    } catch (error) {
      console.error(`Failed to insert product ${product.name}:`, error);
    }
  }

  // 插入初始奖品数据
  const initialPrizes = [
    { name: 'iPhone 15', description: '最新款苹果手机', probability: 0.01, stock: 10 },
    { name: '华为手表', description: '智能手表', probability: 0.05, stock: 20 },
    { name: '50元优惠券', description: '无门槛优惠券', probability: 0.1, stock: 100 },
    { name: '谢谢参与', description: '下次再来', probability: 0.84, stock: 670 }
  ];

  for (const prize of initialPrizes) {
    try {
      await pool.query(
        'INSERT INTO prizes (name, description, probability, stock) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
        [prize.name, prize.description, prize.probability, prize.stock]
      );
    } catch (error) {
      console.error(`Failed to insert prize ${prize.name}:`, error);
    }
  }

  console.log('Initial data inserted successfully');
}

export default initializeDatabase;