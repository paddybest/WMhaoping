import { pool } from '../connection';

export async function up() {
  // 创建支付订单表
  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(64) UNIQUE NOT NULL,
      merchant_id INTEGER NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      payment_id VARCHAR(64),
      trade_state VARCHAR(20),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_merchant_id ON payment_orders(merchant_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status)
  `);

  console.log('payment_orders 表创建成功');
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS payment_orders CASCADE');
}
