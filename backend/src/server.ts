import app from './app';
import { SocketService } from './services/socket';

const PORT = parseInt(process.env.PORT || '8080');

async function startServer() {
  try {
    // 暂时跳过数据库初始化，仅测试WebSocket功能
    console.log('Skipping database initialization for WebSocket test');

    const server = require('http').createServer(app);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api`);
      console.log(`Health Check: http://localhost:${PORT}/health`);
      console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
    });

    // 初始化Socket.io
    SocketService.init(server);

    // 优雅关闭
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

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();