import { EventEmitter } from 'events';
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
export declare class MonitoringService extends EventEmitter {
    private metrics;
    private alerts;
    private intervals;
    constructor();
    private initializeMonitoring;
    private startMetricsCollection;
    private startHealthCheck;
    private startErrorRateMonitoring;
    private startResourceMonitoring;
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    incrementCounter(name: string, tags?: Record<string, string>): void;
    getMetricValue(name: string): number | undefined;
    triggerAlert(type: string, message: string, severity?: 'low' | 'medium' | 'high' | 'critical', metrics?: Record<string, number>): void;
    private sendAlertNotification;
    private collectBasicMetrics;
    getMetrics(): Map<string, MetricData[]>;
    getAlerts(): AlertData[];
    cleanup(): void;
}
export declare const monitoringService: MonitoringService;
export {};
//# sourceMappingURL=monitoring.d.ts.map