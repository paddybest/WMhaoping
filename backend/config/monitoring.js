const fs = require('fs');
const path = require('path');

module.exports = {
  // 应用监控配置
  app: {
    name: 'haopingbao-backend',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json',
    directory: path.join(__dirname, '../logs'),
    maxFiles: 10,
    maxSize: '10m',
    console: process.env.NODE_ENV !== 'production'
  },

  // 健康检查配置
  healthCheck: {
    interval: 30000, // 30秒
    timeout: 5000,   // 5秒
    retries: 3,
    path: '/health'
  },

  // 监控指标
  metrics: {
    // CPU 使用率阈值
    cpuThreshold: 80, // 80%
    // 内存使用阈值
    memoryThreshold: 512, // 512MB
    // 响应时间阈值（毫秒）
    responseTimeThreshold: 1000,
    // 错误率阈值
    errorRateThreshold: 0.05 // 5%
  },

  // 数据库监控
  database: {
    maxConnections: 20,
    minConnections: 5,
    acquireTimeout: 30000,
    idleTimeout: 10000
  },

  // Redis 监控
  redis: {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    lazyConnect: true
  },

  // API 监控
  api: {
    // 白名单（不监控的路径）
    whiteList: [
      '/health',
      '/metrics'
    ],
    // 慢查询阈值（毫秒）
    slowQueryThreshold: 1000,
    // 错误码监控
    monitorStatusCodes: [500, 502, 503, 504]
  },

  // 告警配置
  alerts: {
    // 邮件告警（可选）
    email: {
      enabled: false,
      service: process.env.SMTP_SERVICE,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM,
      to: process.env.SMTP_TO
    },
    // Webhook 告警
    webhook: {
      enabled: false,
      url: process.env.WEBHOOK_URL,
      timeout: 5000
    },
    // Slack 告警（可选）
    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      channel: process.env.SLACK_CHANNEL
    }
  },

  // 日志轮转配置
  logRotation: {
    enabled: true,
    interval: '1d',
    compress: true,
    maxSize: '20m',
    maxFiles: 14
  },

  // 数据收集配置
  dataCollection: {
    // 性能数据收集间隔（毫秒）
    performanceInterval: 60000,
    // 错误日志收集间隔（毫秒）
    errorLogInterval: 30000,
    // 请求日志收集间隔（毫秒）
    requestLogInterval: 30000
  }
};