declare const _default: {
    app: {
        port: string | number;
        name: string;
    };
    logging: {
        level: string;
        console: boolean;
    };
    api: {
        slowQueryThreshold: number;
    };
    healthCheck: {
        path: string;
        interval: number;
    };
    dataCollection: {
        performanceInterval: number;
        errorLogInterval: number;
    };
    metrics: {
        errorRateThreshold: number;
        memoryThreshold: number;
        cpuThreshold: number;
    };
    alerts: {
        enabled: boolean;
        channels: string[];
    };
};
export default _default;
//# sourceMappingURL=monitoring.d.ts.map