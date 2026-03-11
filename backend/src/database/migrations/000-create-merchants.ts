import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS merchants (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      shop_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_merchants_username ON merchants(username);
  `;

  await pool.query(createTable);
  console.log('merchants table created successfully');
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS merchants CASCADE');
  console.log('merchants table dropped successfully');
}
