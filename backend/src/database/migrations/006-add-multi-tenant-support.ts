import { pool } from '../connection';

export async function up() {
  console.log('Adding multi-tenant support...');

  const merchantColumns = [
    { name: 'customer_service_qr_url', sql: "VARCHAR(500)" },
    { name: 'qr_code_url', sql: "VARCHAR(500)" }
  ];

  for (const col of merchantColumns) {
    try {
      await pool.query(`ALTER TABLE merchants ADD COLUMN IF NOT EXISTS ${col.name} ${col.sql}`);
      console.log(`  ✓ Added merchants.${col.name}`);
    } catch (error: any) {
      if (error.code === '42701') {
        console.log(`  ⊘ merchants.${col.name} already exists`);
      } else {
        throw error;
      }
    }
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        probability NUMERIC(5,4) DEFAULT 0.1,
        stock INTEGER DEFAULT 0,
        image_url VARCHAR(500),
        merchant_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prizes_merchant_id ON prizes(merchant_id)`);
    console.log('  ✓ prizes table created');
  } catch (error: any) {
    console.log('  ⊘ prizes table already exists');
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lottery_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        prize_id INTEGER,
        merchant_id INTEGER,
        status SMALLINT DEFAULT 0,
        user_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP DEFAULT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lottery_codes_code ON lottery_codes(code)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lottery_codes_status ON lottery_codes(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lottery_codes_merchant_id ON lottery_codes(merchant_id)`);
    console.log('  ✓ lottery_codes table created');
  } catch (error: any) {
    console.log('  ⊘ lottery_codes table already exists');
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lottery_records (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        prize_id INTEGER,
        prize_name VARCHAR(255),
        reward_code VARCHAR(6),
        is_claimed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        claimed_at TIMESTAMP DEFAULT NULL
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lottery_records_user_id ON lottery_records(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_lottery_records_reward_code ON lottery_records(reward_code)`);
    console.log('  ✓ lottery_records table created');
  } catch (error: any) {
    console.log('  ⊘ lottery_records table already exists');
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        product_id INTEGER DEFAULT 1,
        merchant_id INTEGER,
        content TEXT NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        tags JSONB,
        image_url VARCHAR(500),
        screenshot_url VARCHAR(500),
        verify_status VARCHAR(20) DEFAULT 'pending',
        verify_reason VARCHAR(255),
        reward_amount NUMERIC(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_merchant_id ON reviews(merchant_id)`);
    console.log('  ✓ reviews table created');
  } catch (error: any) {
    console.log('  ⊘ reviews table already exists');
  }

  console.log('Multi-tenant support added successfully');
}

export async function down() {
  console.log('Removing multi-tenant support...');

  try { await pool.query('DROP TABLE IF EXISTS lottery_records CASCADE'); } catch (e) {}
  try { await pool.query('DROP TABLE IF EXISTS lottery_codes CASCADE'); } catch (e) {}
  try { await pool.query('DROP TABLE IF EXISTS prizes CASCADE'); } catch (e) {}
  try { await pool.query('DROP TABLE IF EXISTS reviews CASCADE'); } catch (e) {}

  try {
    await pool.query('ALTER TABLE merchants DROP COLUMN IF EXISTS customer_service_qr_url');
  } catch (error: any) {
    console.log('  ⊘ Column already removed');
  }

  try {
    await pool.query('ALTER TABLE merchants DROP COLUMN IF EXISTS qr_code_url');
  } catch (error: any) {
    console.log('  ⊘ Column already removed');
  }

  console.log('Multi-tenant support removed successfully');
}
