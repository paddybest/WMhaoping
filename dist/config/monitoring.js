"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    app: {
        port: process.env.PORT || 5000,
        name: 'haopingbao-backend'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        console: process.env.NODE_ENV !== 'production'
    },
    api: {
        slowQueryThreshold: 1000
    },
    healthCheck: {
        path: '/health',
        interval: 30000
    },
    dataCollection: {
        performanceInterval: 60000,
        errorLogInterval: 30000
    },
    metrics: {
        errorRateThreshold: 0.05,
        memoryThreshold: 500,
        cpuThreshold: 80
    },
    alerts: {
        enabled: true,
        channels: ['console']
    }
};
//# sourceMappingURL=monitoring.js.map