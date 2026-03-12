import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { SocketService } from './services/socket';
import { withDatabase, checkDatabaseHealth } from './middleware/database';
import { validateAllConfigs } from './utils/configValidation';

// 导入路由
import authRoutes from './routes/auth';
import merchantAuthRoutes from './routes/merchantAuth';
import productRoutes from './routes/product';
import reviewRoutes from './routes/review';
import lotteryRoutes from './routes/lottery';
import uploadRoutes from './routes/upload';
import productCategoryRoutes from './routes/productCategory';
import productItemRoutes from './routes/productItem';
import productImageRoutes from './routes/productImage';
import miniprogramProductRoutes from './routes/miniprogramProduct';
import miniprogramMerchantRoutes from './routes/miniprogramMerchant';
import miniprogramCustomerServiceRoutes from './routes/miniprogramCustomerService';
import miniprogramPrizeRoutes from './routes/miniprogramPrize';
import merchantPrizeRoutes from './routes/merchantPrize';
import merchantQRCodeRoutes from './routes/merchantQRCode';
import qrCodeScanRoutes from './routes/qrCodeScan';
import tagsRoutes from './routes/tags';
import statsRoutes from './routes/stats';
import redemptionRoutes from './routes/redemption';

dotenv.config();

// 验证所有配置
const configValidation = validateAllConfigs();
if (!configValidation.isValid) {
  console.error('❌ Application configuration is invalid. Please fix the errors above before starting the server.');
  process.exit(1);
}

const app = express();
const server = createServer(app);

// 中间件
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: true, // 允许所有来源（开发环境）
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 设置响应字符编码为 UTF-8
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

app.use(morgan('dev', { stream: process.stdout }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 应用数据库中间件
app.use(withDatabase);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/merchant/auth', merchantAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/lottery', lotteryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/merchant/categories', productCategoryRoutes);
// 产品图片路由必须在产品路由之前，避免 /:id/images 被 /:id 匹配
app.use('/api/merchant/products', productImageRoutes);
app.use('/api/merchant/products', productItemRoutes);
app.use('/api/miniprogram', miniprogramProductRoutes);
app.use('/api/miniprogram/customer-service', miniprogramCustomerServiceRoutes);
app.use('/api/miniprogram/merchant', miniprogramMerchantRoutes);
app.use('/api/miniprogram/prizes', miniprogramPrizeRoutes);
app.use('/api/merchant/prizes', merchantPrizeRoutes);
app.use('/api/merchant/qrcode', merchantQRCodeRoutes);
app.use('/api/merchant/scan', qrCodeScanRoutes);
app.use('/api/merchant/tags', tagsRoutes);
app.use('/api/merchant/stats', statsRoutes);
app.use('/api/redemption', redemptionRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.path
  });
});

// 错误处理中间件
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 初始化Socket服务
SocketService.init(server);

export default app;