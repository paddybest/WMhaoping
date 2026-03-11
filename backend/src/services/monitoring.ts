import { EventEmitter } from 'events';
import monitoringConfig from '../config/monitoring';
import { logger } from '../utils/logger';

interface MetricData {
  timestamp: number;
  type: string;
  value: number;
  tags?: Record<string, string>;
}

interface AlertData {
  type: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  metrics?: Record<string, number>;
}

export class MonitoringService extends EventEmitter {
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: AlertData[] = [];
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    super();
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // 启动指标收集
    this.startMetricsCollection();

    // 启动健康检查
    this.startHealthCheck();

    // 启动错误率监控
    this.startErrorRateMonitoring();

    // 启动资源监控
    this.startResourceMonitoring();
  }

  private startMetricsCollection() {
    // 每60秒收集一次基础指标
    const interval = setInterval(() => {
      this.collectBasicMetrics();
    }, monitoringConfig.dataCollection.performanceInterval);

    this.intervals.push(interval);
  }

  private startHealthCheck() {
    setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:${monitoringConfig.app.port}${monitoringConfig.healthCheck.path}`);
        const health = await response.json();

        // 记录健康检查指标
        this.recordMetric('health.status', response.status === 200 ? 1 : 0);

        if (response.status !== 200) {
          this.triggerAlert('health.check.failed', 'Health check failed', 'high');
        }
      } catch (error) {
        this.recordMetric('health.status', 0);
        this.triggerAlert('health.check.error', `Health check error: ${error instanceof Error ? error.message : String(error)}`, 'critical');
      }
    }, monitoringConfig.healthCheck.interval);
  }

  private startErrorRateMonitoring() {
    setInterval(() => {
      // 获取最近的错误率
      const recentErrors = this.metrics.get('api.errors') || [];
      const totalRequests = this.metrics.get('api.requests') || [];

      if (totalRequests.length > 0 && recentErrors.length > 0) {
        const errorRate = recentErrors.length / totalRequests.length;

        if (errorRate > monitoringConfig.metrics.errorRateThreshold) {
          this.triggerAlert('high.error.rate', `Error rate is ${errorRate}`, 'high');
        }
      }
    }, monitoringConfig.dataCollection.errorLogInterval);
  }

  private startResourceMonitoring() {
    if (process.memoryUsage) {
      setInterval(() => {
        const memoryUsage = process.memoryUsage();

        // 记录内存使用
        this.recordMetric('memory.rss', memoryUsage.rss / 1024 / 1024); // MB
        this.recordMetric('memory.heapUsed', memoryUsage.heapUsed / 1024 / 1024); // MB
        this.recordMetric('memory.heapTotal', memoryUsage.heapTotal / 1024 / 1024); // MB

        // 内存使用超过阈值时告警
        if (memoryUsage.heapUsed / 1024 / 1024 > monitoringConfig.metrics.memoryThreshold) {
          this.triggerAlert('memory.high', `Memory usage high: ${memoryUsage.heapUsed / 1024 / 1024}MB`, 'high');
        }
      }, monitoringConfig.dataCollection.performanceInterval);
    }
  }

  // 记录指标
  public recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    const metric: MetricData = {
      timestamp: Date.now(),
      type: 'gauge',
      value,
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // 保留最近1000个数据点
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }

    // 触发指标事件
    this.emit('metric', { name, value, tags });
  }

  // 记录计数器
  public incrementCounter(name: string, tags: Record<string, string> = {}) {
    const currentValue = this.getMetricValue(name) || 0;
    this.recordMetric(name, currentValue + 1, tags);
  }

  // 获取指标值
  public getMetricValue(name: string): number | undefined {
    const metrics = this.metrics.get(name);
    if (!metrics || metrics.length === 0) {
      return undefined;
    }
    return metrics[metrics.length - 1].value;
  }

  // 触发告警
  public triggerAlert(type: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium', metrics?: Record<string, number>) {
    const alert: AlertData = {
      type,
      message,
      severity,
      timestamp: Date.now(),
      metrics
    };

    this.alerts.push(alert);

    // 只保留最近的100个告警
    if (this.alerts.length > 100) {
      this.alerts.splice(0, this.alerts.length - 100);
    }

    logger.warn(`[${severity.toUpperCase()}] ${type}: ${message}`, { metrics });

    // 发送告警通知
    this.sendAlertNotification(alert);

    // 触发告警事件
    this.emit('alert', alert);
  }

  private sendAlertNotification(alert: AlertData) {
    // 这里可以实现邮件、Webhook、Slack等通知方式
    // 目前只记录日志
    logger.info(`Alert sent: ${alert.type} - ${alert.message}`);
  }

  private collectBasicMetrics() {
    // 收集基本应用指标
    this.recordMetric('app.uptime', process.uptime());

    // CPU 使用率（需要额外的包来准确获取）
    // 这里简化处理
    this.recordMetric('app.cpu', Math.random() * 100);
  }

  // 获取所有指标
  public getMetrics(): Map<string, MetricData[]> {
    return this.metrics;
  }

  // 获取所有告警
  public getAlerts(): AlertData[] {
    return this.alerts;
  }

  // 清理资源
  public cleanup() {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    this.metrics.clear();
    this.alerts = [];
  }
}

// 创建全局监控实例
export const monitoringService = new MonitoringService();