import { Request, Response, NextFunction } from 'express';

// 简单的内存限流器
interface RateLimitStore {
  count: number;
  resetTime: number;
}

const limitStore = new Map<string, RateLimitStore>();

// 清理过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of limitStore.entries()) {
    if (now > value.resetTime) {
      limitStore.delete(key);
    }
  }
}, 60000); // 每分钟清理一次

export const rateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 使用IP地址作为标识
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    let record = limitStore.get(key);

    if (!record || now > record.resetTime) {
      // 创建新记录或重置
      record = {
        count: 1,
        resetTime: now + options.windowMs
      };
      limitStore.set(key, record);
      return next();
    }

    if (record.count >= options.max) {
      return res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later'
      });
    }

    record.count++;
    limitStore.set(key, record);
    next();
  };
};

// 小程序API限流：每分钟100次请求
export const miniprogramRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 100,
  message: '请求过于频繁，请稍后再试'
});

// 通用API限流：每分钟200次请求
export const generalRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: '请求过于频繁，请稍后再试'
});
