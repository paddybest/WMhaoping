import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';

// 扩展Express Request接口
declare global {
  namespace Express {
    interface Request {
      db: {
        getPool: () => typeof pool;
        getRedis: () => Promise<any>;
      };
    }
  }
}

export const withDatabase = (req: Request, res: Response, next: NextFunction) => {
  req.db = {
    getPool: () => pool,
    getRedis: async () => {
      // 延迟导入Redis客户端
      const redis = await import('redis');
      return redis.createClient({
        url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
        password: process.env.REDIS_PASSWORD || ''
      });
    }
  };
  next();
};

// 数据库健康检查中间件
export const checkDatabaseHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 检查PostgreSQL连接
    await pool.query('SELECT 1');

    // 检查Redis连接（延迟初始化）
    const redis = await import('redis');
    const redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`,
      password: process.env.REDIS_PASSWORD || ''
    });
    await redisClient.ping();
    redisClient.quit();

    next();
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Database service unavailable',
      timestamp: new Date().toISOString()
    });
  }
};

// 事务处理中间件
export const withTransaction = (req: Request, res: Response, next: NextFunction) => {
  // 事务处理将在实际使用时实现
  next();
};

// 清理连接中间件
export const cleanupDatabaseConnection = (req: Request, res: Response, next: NextFunction) => {
  // 连接清理将在实际使用时实现
  next();
};