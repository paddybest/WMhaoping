import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// PostgreSQL连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'haopingbao',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 连接测试
pool.on('error', (err: Error) => {
  console.error('PostgreSQL pool error:', err);
});

// Redis 客户端（暂时禁用）
const redisClient: any = null;

export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    throw error;
  }
}

export { pool, redisClient };
