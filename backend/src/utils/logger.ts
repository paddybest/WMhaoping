import winston from 'winston';
import path from 'path';
import fs from 'fs';
import monitoringConfig from '../config/monitoring';
import { monitoringService } from '../services/monitoring';

// 创建日志目录
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义格式
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    return log;
  })
);

// 创建 Winston logger
export const logger = winston.createLogger({
  level: monitoringConfig.logging.level,
  format: logFormat,
  defaultMeta: { service: 'haopingbao-backend' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
      tailable: true
    }),
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// 在开发环境中添加控制台输出
if (monitoringConfig.logging.console) {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// HTTP 请求日志中间件
export const requestLogger = (req: any, res: any, next: any) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, originalUrl, ip } = req;
    const { statusCode } = res;

    // 记录慢查询
    if (duration > monitoringConfig.api.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip
      });
    }

    // 记录错误响应
    if (statusCode >= 400) {
      logger.error('HTTP error', {
        method,
        url: originalUrl,
        statusCode,
        duration,
        ip
      });

      // 增加错误计数器
      monitoringService.incrementCounter('api.errors', {
        method,
        statusCode: statusCode.toString()
      });
    }

    // 记录请求计数器
    monitoringService.incrementCounter('api.requests', {
      method,
      statusCode: statusCode.toString()
    });
  });

  next();
};

// 异常处理
logger.exceptions.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'exceptions.log'),
    maxsize: 20 * 1024 * 1024,
    maxFiles: 5
  })
);

// 未处理的 Promise 异常
logger.rejections.handle(
  new winston.transports.File({
    filename: path.join(logDir, 'rejections.log'),
    maxsize: 20 * 1024 * 1024,
    maxFiles: 5
  })
);

export default logger;