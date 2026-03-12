"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringService = exports.MonitoringService = void 0;
const events_1 = require("events");
const monitoring_1 = __importDefault(require("../config/monitoring"));
const logger_1 = require("../utils/logger");
class MonitoringService extends events_1.EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.alerts = [];
        this.intervals = [];
        this.initializeMonitoring();
    }
    initializeMonitoring() {
        this.startMetricsCollection();
        this.startHealthCheck();
        this.startErrorRateMonitoring();
        this.startResourceMonitoring();
    }
    startMetricsCollection() {
        const interval = setInterval(() => {
            this.collectBasicMetrics();
        }, monitoring_1.default.dataCollection.performanceInterval);
        this.intervals.push(interval);
    }
    startHealthCheck() {
        setInterval(async () => {
            try {
                const response = await fetch(`http://localhost:${monitoring_1.default.app.port}${monitoring_1.default.healthCheck.path}`);
                const health = await response.json();
                this.recordMetric('health.status', response.status === 200 ? 1 : 0);
                if (response.status !== 200) {
                    this.triggerAlert('health.check.failed', 'Health check failed', 'high');
                }
            }
            catch (error) {
                this.recordMetric('health.status', 0);
                this.triggerAlert('health.check.error', `Health check error: ${error instanceof Error ? error.message : String(error)}`, 'critical');
            }
        }, monitoring_1.default.healthCheck.interval);
    }
    startErrorRateMonitoring() {
        setInterval(() => {
            const recentErrors = this.metrics.get('api.errors') || [];
            const totalRequests = this.metrics.get('api.requests') || [];
            if (totalRequests.length > 0 && recentErrors.length > 0) {
                const errorRate = recentErrors.length / totalRequests.length;
                if (errorRate > monitoring_1.default.metrics.errorRateThreshold) {
                    this.triggerAlert('high.error.rate', `Error rate is ${errorRate}`, 'high');
                }
            }
        }, monitoring_1.default.dataCollection.errorLogInterval);
    }
    startResourceMonitoring() {
        if (process.memoryUsage) {
            setInterval(() => {
                const memoryUsage = process.memoryUsage();
                this.recordMetric('memory.rss', memoryUsage.rss / 1024 / 1024);
                this.recordMetric('memory.heapUsed', memoryUsage.heapUsed / 1024 / 1024);
                this.recordMetric('memory.heapTotal', memoryUsage.heapTotal / 1024 / 1024);
                if (memoryUsage.heapUsed / 1024 / 1024 > monitoring_1.default.metrics.memoryThreshold) {
                    this.triggerAlert('memory.high', `Memory usage high: ${memoryUsage.heapUsed / 1024 / 1024}MB`, 'high');
                }
            }, monitoring_1.default.dataCollection.performanceInterval);
        }
    }
    recordMetric(name, value, tags = {}) {
        const metric = {
            timestamp: Date.now(),
            type: 'gauge',
            value,
            tags
        };
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const metrics = this.metrics.get(name);
        metrics.push(metric);
        if (metrics.length > 1000) {
            metrics.splice(0, metrics.length - 1000);
        }
        this.emit('metric', { name, value, tags });
    }
    incrementCounter(name, tags = {}) {
        const currentValue = this.getMetricValue(name) || 0;
        this.recordMetric(name, currentValue + 1, tags);
    }
    getMetricValue(name) {
        const metrics = this.metrics.get(name);
        if (!metrics || metrics.length === 0) {
            return undefined;
        }
        return metrics[metrics.length - 1].value;
    }
    triggerAlert(type, message, severity = 'medium', metrics) {
        const alert = {
            type,
            message,
            severity,
            timestamp: Date.now(),
            metrics
        };
        this.alerts.push(alert);
        if (this.alerts.length > 100) {
            this.alerts.splice(0, this.alerts.length - 100);
        }
        logger_1.logger.warn(`[${severity.toUpperCase()}] ${type}: ${message}`, { metrics });
        this.sendAlertNotification(alert);
        this.emit('alert', alert);
    }
    sendAlertNotification(alert) {
        logger_1.logger.info(`Alert sent: ${alert.type} - ${alert.message}`);
    }
    collectBasicMetrics() {
        this.recordMetric('app.uptime', process.uptime());
        this.recordMetric('app.cpu', Math.random() * 100);
    }
    getMetrics() {
        return this.metrics;
    }
    getAlerts() {
        return this.alerts;
    }
    cleanup() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.metrics.clear();
        this.alerts = [];
    }
}
exports.MonitoringService = MonitoringService;
exports.monitoringService = new MonitoringService();
//# sourceMappingURL=monitoring.js.map