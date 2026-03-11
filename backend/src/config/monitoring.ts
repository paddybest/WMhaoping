export default {
  app: {
    port: process.env.PORT || 5000,
    name: 'haopingbao-backend'
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    console: process.env.NODE_ENV !== 'production'
  },

  api: {
    slowQueryThreshold: 1000 // 1秒
  },

  healthCheck: {
    path: '/health',
    interval: 30000 // 30秒
  },

  dataCollection: {
    performanceInterval: 60000, // 60秒
    errorLogInterval: 30000 // 30秒
  },

  metrics: {
    errorRateThreshold: 0.05, // 5%
    memoryThreshold: 500, // 500MB
    cpuThreshold: 80 // 80%
  },

  alerts: {
    enabled: true,
    channels: ['console']
  }
};