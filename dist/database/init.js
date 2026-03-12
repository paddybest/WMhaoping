"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = initializeDatabase;
exports.insertInitialData = insertInitialData;
const connection_1 = require("./connection");
async function initializeDatabase() {
    const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openid VARCHAR(255) UNIQUE NOT NULL,
      nickname VARCHAR(255),
      avatar VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      tags JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      content TEXT NOT NULL,
      rating INT CHECK (rating >= 1 AND rating <= 5),
      tags JSON,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      probability DECIMAL(5,4) DEFAULT 0.1,
      stock INT DEFAULT 0,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lottery_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(6) UNIQUE NOT NULL,
      prize_id INT,
      status TINYINT DEFAULT 0 COMMENT '0-未使用, 1-已使用',
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lottery_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      prize_id INT,
      prize_name VARCHAR(255),
      reward_code VARCHAR(6),
      is_claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (prize_id) REFERENCES prizes(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX idx_lottery_codes_code ON lottery_codes(code);
    CREATE INDEX idx_lottery_codes_status ON lottery_codes(status);
    CREATE INDEX idx_lottery_codes_user_id ON lottery_codes(user_id);
    CREATE INDEX idx_lottery_codes_prize_id ON lottery_codes(prize_id);
    CREATE INDEX idx_lottery_records_user_id ON lottery_records(user_id);
    CREATE INDEX idx_lottery_records_prize_id ON lottery_records(prize_id);
    CREATE INDEX idx_lottery_records_created_at ON lottery_records(created_at);
    CREATE INDEX idx_lottery_records_reward_code ON lottery_records(reward_code);
    CREATE INDEX idx_reviews_user_id ON reviews(user_id);
    CREATE INDEX idx_reviews_product_id ON reviews(product_id);
    CREATE INDEX idx_reviews_rating ON reviews(rating);
    CREATE INDEX idx_reviews_created_at ON reviews(created_at);
  `;
    try {
        await connection_1.pool.execute(createTables);
        console.log('Database tables initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}
async function insertInitialData() {
    const initialProducts = [
        { name: '女装', tags: ['轻薄', '修身', '百搭', '舒适', '时尚', '潮流'] },
        { name: '男装', tags: ['休闲', '商务', '时尚', '舒适', '百搭', '潮流'] },
        { name: '数码', tags: ['高性能', '轻薄', '长续航', '拍照好', '游戏', '办公'] },
        { name: '美妆', tags: ['保湿', '美白', '抗衰老', '敏感肌', '天然', '有机'] }
    ];
    for (const product of initialProducts) {
        try {
            await connection_1.pool.execute('INSERT INTO products (name, tags) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [product.name, JSON.stringify(product.tags)]);
        }
        catch (error) {
            console.error(`Failed to insert product ${product.name}:`, error);
        }
    }
    const initialPrizes = [
        { name: 'iPhone 15', description: '最新款苹果手机', probability: 0.01, stock: 10 },
        { name: '华为手表', description: '智能手表', probability: 0.05, stock: 20 },
        { name: '50元优惠券', description: '无门槛优惠券', probability: 0.1, stock: 100 },
        { name: '谢谢参与', description: '下次再来', probability: 0.84, stock: 670 }
    ];
    for (const prize of initialPrizes) {
        try {
            await connection_1.pool.execute('INSERT INTO prizes (name, description, probability, stock) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = name', [prize.name, prize.description, prize.probability, prize.stock]);
        }
        catch (error) {
            console.error(`Failed to insert prize ${prize.name}:`, error);
        }
    }
    console.log('Initial data inserted successfully');
}
exports.default = initializeDatabase;
//# sourceMappingURL=init.js.map