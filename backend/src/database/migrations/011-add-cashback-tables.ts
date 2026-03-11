import { pool } from '../connection';

export async function up() {
  // 1. 添加 prizes 表的返现字段
  try {
    await pool.query(`
      ALTER TABLE prizes
      ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(10,2) DEFAULT 0
    `);
  } catch (e: any) {
    if (e.code !== '42701') throw e;
    console.log('  - cash_amount column already exists');
  }

  try {
    await pool.query(`
      ALTER TABLE prizes
      ADD COLUMN IF NOT EXISTS is_cash_reward SMALLINT DEFAULT 0
    `);
  } catch (e: any) {
    if (e.code !== '42701') throw e;
    console.log('  - is_cash_reward column already exists');
  }

  // 2. 创建商家余额表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS merchant_balances (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER UNIQUE NOT NULL,
      balance NUMERIC(10,2) DEFAULT 0,
      total_recharged NUMERIC(10,2) DEFAULT 0,
      total_redeemed NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_merchant_balances_merchant_id ON merchant_balances(merchant_id)`);

  // 3. 创建返现记录表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS redemption_records (
      id SERIAL PRIMARY KEY,
      merchant_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      prize_id INTEGER NOT NULL,
      lottery_record_id INTEGER,
      reward_code VARCHAR(6),
      cash_amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      screenshot_url VARCHAR(500),
      verified_by INTEGER,
      verified_at TIMESTAMP DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_redemption_records_merchant_id ON redemption_records(merchant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_redemption_records_user_id ON redemption_records(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_redemption_records_status ON redemption_records(status)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_redemption_records_reward_code ON redemption_records(reward_code)`);

  // 4. 初始化测试商家的余额 (PostgreSQL 使用 ON CONFLICT)
  await pool.query(`
    INSERT INTO merchant_balances (merchant_id, balance, total_recharged, total_redeemed)
    VALUES (1, 1000.00, 1000.00, 0)
    ON CONFLICT (merchant_id) DO NOTHING
  `);

  // 5. 更新测试奖品的返现金额 (PostgreSQL 使用 INSERT ... ON CONFLICT)
  await pool.query(`
    INSERT INTO prizes (id, merchant_id, name, description, probability, stock, cash_amount, is_cash_reward) VALUES
    (1, 1, '谢谢参与', '下次再来', 0.7, 100, 0, 0),
    (2, 1, '5元现金', '无门槛5元现金红包', 0.2, 50, 5.00, 1),
    (3, 1, '10元现金', '无门槛10元现金红包', 0.1, 10, 10.00, 1)
    ON CONFLICT (id) DO UPDATE SET cash_amount = EXCLUDED.cash_amount, is_cash_reward = EXCLUDED.is_cash_reward
  `);

  console.log('Cashback tables created successfully');
}

export async function down() {
  await pool.query('ALTER TABLE prizes DROP COLUMN IF EXISTS cash_amount');
  await pool.query('ALTER TABLE prizes DROP COLUMN IF EXISTS is_cash_reward');
  await pool.query('DROP TABLE IF EXISTS redemption_records CASCADE');
  await pool.query('DROP TABLE IF EXISTS merchant_balances CASCADE');
}
