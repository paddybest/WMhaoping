"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
class SocketService {
    static init(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                methods: ['GET', 'POST']
            }
        });
        this.setupEventHandlers();
    }
    static setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);
            socket.on('join-merchant', (merchantId) => {
                socket.join(`merchant-${merchantId}`);
                console.log(`Client ${socket.id} joined merchant ${merchantId}`);
            });
            socket.on('leave-merchant', (merchantId) => {
                socket.leave(`merchant-${merchantId}`);
            });
            socket.on('new-review', (data) => {
                this.io.to('merchant-all').emit('new-review-notification', data);
            });
            socket.on('lottery-result', (data) => {
                this.io.to('merchant-all').emit('lottery-result-notification', data);
            });
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }
    static notifyNewReview(merchantId, review) {
        this.io.to(`merchant-${merchantId}`).emit('new-review', review);
    }
    static notifyLotteryResult(merchantId, result) {
        this.io.to(`merchant-${merchantId}`).emit('lottery-result', result);
    }
}
exports.SocketService = SocketService;
exports.default = SocketService;
//# sourceMappingURL=socket.js.map