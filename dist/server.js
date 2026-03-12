"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./services/socket");
const PORT = parseInt(process.env.PORT || '7777');
async function startServer() {
    try {
        console.log('Skipping database initialization for WebSocket test');
        const server = require('http').createServer(app_1.default);
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('API Base URL: http://localhost:5000/api');
            console.log('Health Check: http://localhost:5000/health');
            console.log('WebSocket endpoint: ws://localhost:5000');
        });
        socket_1.SocketService.init(server);
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });
        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down gracefully');
            server.close(() => {
                console.log('Process terminated');
                process.exit(0);
            });
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map