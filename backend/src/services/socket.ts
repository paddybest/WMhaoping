import { Server } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class SocketService {
  private static io: Server;

  static init(server: HTTPServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupEventHandlers();
  }

  private static setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // 加入商家房间
      socket.on('join-merchant', (merchantId) => {
        socket.join(`merchant-${merchantId}`);
        console.log(`Client ${socket.id} joined merchant ${merchantId}`);
      });

      // 离开商家房间
      socket.on('leave-merchant', (merchantId) => {
        socket.leave(`merchant-${merchantId}`);
      });

      // 新评价通知
      socket.on('new-review', (data) => {
        this.io.to('merchant-all').emit('new-review-notification', data);
      });

      // 抽奖结果通知
      socket.on('lottery-result', (data) => {
        this.io.to('merchant-all').emit('lottery-result-notification', data);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  static notifyNewReview(merchantId: number, review: any) {
    this.io.to(`merchant-${merchantId}`).emit('new-review', review);
  }

  static notifyLotteryResult(merchantId: number, result: any) {
    this.io.to(`merchant-${merchantId}`).emit('lottery-result', result);
  }
}

export default SocketService;