"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const monitoring_1 = __importDefault(require("../config/monitoring"));
const monitoring_2 = require("../services/monitoring");
const logDir = path_1.default.join(__dirname, '../../logs');
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
const consoleFormat = winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
        log += ` ${JSON.stringify(meta)}`;
    }
    return log;
}));
exports.logger = winston_1.default.createLogger({
    level: monitoring_1.default.logging.level,
    format: logFormat,
    defaultMeta: { service: 'haopingbao-backend' },
    transports: [
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 20 * 1024 * 1024,
            maxFiles: 10,
            tailable: true
        }),
        new winston_1.default.transports.File({
            filename: path_1.default.join(logDir, 'combined.log'),
            maxsize: 20 * 1024 * 1024,
            maxFiles: 10,
            tailable: true
        })
    ]
});
if (monitoring_1.default.logging.console) {
    exports.logger.add(new winston_1.default.transports.Console({
        format: consoleFormat
    }));
}
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;
        if (duration > monitoring_1.default.api.slowQueryThreshold) {
            exports.logger.warn('Slow query detected', {
                method,
                url: originalUrl,
                statusCode,
                duration,
                ip
            });
        }
        if (statusCode >= 400) {
            exports.logger.error('HTTP error', {
                method,
                url: originalUrl,
                statusCode,
                duration,
                ip
            });
            monitoring_2.monitoringService.incrementCounter('api.errors', {
                method,
                statusCode: statusCode.toString()
            });
        }
        monitoring_2.monitoringService.incrementCounter('api.requests', {
            method,
            statusCode: statusCode.toString()
        });
    });
    next();
};
exports.requestLogger = requestLogger;
exports.logger.exceptions.handle(new winston_1.default.transports.File({
    filename: path_1.default.join(logDir, 'exceptions.log'),
    maxsize: 20 * 1024 * 1024,
    maxFiles: 5
}));
exports.logger.rejections.handle(new winston_1.default.transports.File({
    filename: path_1.default.join(logDir, 'rejections.log'),
    maxsize: 20 * 1024 * 1024,
    maxFiles: 5
}));
exports.default = exports.logger;
//# sourceMappingURL=logger.js.map