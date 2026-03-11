# 好评宝项目微信云开发迁移实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将好评宝项目从微信云开发架构迁移到独立后端架构，实现微信小程序、商家管理端与统一后端的完全解耦。

**Architecture:** 采用Node.js + Express构建RESTful API后端，MySQL作为主数据库，Redis作为缓存层，阿里云OSS作为文件存储，保持现有微信小程序和商家管理端的功能完整性。

**Tech Stack:**
- Backend: Node.js 18 LTS, Express.js, TypeScript
- Database: MySQL 8.0, Redis 7
- Storage: 阿里云OSS
- Auth: JWT + 微信授权
- Real-time: Socket.io
- Testing: Jest, Supertest
- DevOps: Docker, Nginx, PM2

---

## 总体时间安排（4周）

### 第1周：后端基础架构搭建
- Days 1-2: 项目初始化与基础架构
- Days 3-4: 数据库设计与实现
- Days 5: JWT认证系统
- Day 6: Redis缓存配置
- Day 7: 基础API框架

### 第2周：核心功能开发
- Days 1-2: 商品管理API
- Days 3-4: AI评价生成服务
- Days 5-6: 抽奖系统API
- Day 7: 文件存储服务

### 第3周：前端适配与数据迁移
- Days 1-2: 商家端适配
- Days 3-5: 小程序改造
- Days 6-7: 数据迁移

### 第4周：测试与部署
- Days 1-3: 全面测试
- Days 4-5: 部署配置
- Day 6: 灰度发布
- Day 7: 正式上线

---

## 详细实施任务

### Task 1: 后端项目初始化

**Files:**
- Create: `backend/`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/`
- Create: `backend/src/app.ts`
- Create: `backend/src/server.ts`
- Create: `backend/.env.example`

**Step 1: 初始化后端项目**

```bash
cd backend
npm init -y
npm install express cors helmet morgan dotenv jsonwebtoken bcryptjs
npm install -D typescript @types/node @types/express @types/cors @types/morgan ts-node nodemon
```

**Step 2: 配置TypeScript**

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: 创建基础应用文件**

```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 中间件
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

export default app;
```

```typescript
// backend/src/server.ts
import app from './app';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: 创建环境变量文件**

```env
# backend/.env.example
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=haopingbao

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT配置
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=7d

# AI服务配置
DEEPSEEK_API_KEY=your-deepseek-api-key

# 文件存储配置
OSS_ACCESS_KEY_ID=your-oss-access-key
OSS_ACCESS_KEY_SECRET=your-oss-secret
OSS_BUCKET=haopingbao-images
OSS_REGION=oss-cn-hangzhou

# 微信配置
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret
```

**Step 5: 配置启动脚本**

```json
// backend/package.json
{
  "scripts": {
    "start": "node dist/server.js",
    "dev": "nodemon src/server.ts",
    "build": "tsc",
    "test": "jest"
  }
}
```

**Step 6: 测试基础服务**

```bash
npm run dev
curl http://localhost:5000/health
```

**Step 7: 初始提交**

```bash
git add backend/
git commit -m "feat: init backend project with Express and TypeScript"
```

### Task 2: 数据库设计与实现

**Files:**
- Create: `backend/src/database/`
- Create: `backend/src/database/connection.ts`
- Create: `backend/src/database/models/`
- Create: `backend/src/database/models/User.ts`
- Create: `backend/src/database/models/Product.ts`
- Create: `backend/src/database/models/Review.ts`
- Create: `backend/src/database/models/LotteryRecord.ts`
- Create: `backend/src/database/models/LotteryCode.ts`
- Create: `backend/src/database/models/Prize.ts`

**Step 1: 创建数据库连接**

```typescript
// backend/src/database/connection.ts
import mysql from 'mysql2/promise';
import redis from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// MySQL连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Redis客户端
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

export { pool, redisClient };
```

**Step 2: 创建用户模型**

```typescript
// backend/src/database/models/User.ts
import { pool } from '../connection';

export interface User {
  id?: number;
  openid: string;
  nickname?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  static async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const [result] = await pool.execute(
      'INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)',
      [user.openid, user.nickname, user.avatar]
    );
    return { ...user, id: (result as any).insertId };
  }

  static async findByOpenid(openid: string): Promise<User | null> {
    const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [openid]);
    return (rows as User[])[0] || null;
  }

  static async update(id: number, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    await pool.execute(
      `UPDATE users SET ${fields} WHERE id = ?`,
      [...values, id]
    );

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return (rows as User[])[0] || null;
  }
}
```

**Step 3: 创建商品模型**

```typescript
// backend/src/database/models/Product.ts
import { pool } from '../connection';

export interface Product {
  id?: number;
  name: string;
  tags: string[];
  created_at?: Date;
  updated_at?: Date;
}

export class ProductModel {
  static async findAll(): Promise<Product[]> {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC');
    return rows as Product[];
  }

  static async findById(id: number): Promise<Product | null> {
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    return (rows as Product[])[0] || null;
  }

  static async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const [result] = await pool.execute(
      'INSERT INTO products (name, tags) VALUES (?, ?)',
      [product.name, JSON.stringify(product.tags)]
    );
    return { ...product, id: (result as any).insertId };
  }

  static async update(id: number, updates: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(updates).map(key => {
      if (key === 'tags') return `${key} = ?`;
      return `${key} = ?`;
    }).join(', ');

    const values = Object.entries(updates).map(([key, value]) => {
      if (key === 'tags') return JSON.stringify(value);
      return value;
    });

    await pool.execute(
      `UPDATE products SET ${fields} WHERE id = ?`,
      [...values, id]
    );

    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [id]);
    return (rows as Product[])[0] || null;
  }
}
```

**Step 4: 创建数据库初始化脚本**

```typescript
// backend/src/database/init.ts
import { pool } from './connection';

export async function initializeDatabase() {
  const createTables = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openid VARCHAR(255) UNIQUE NOT NULL,
      nickname VARCHAR(255),
      avatar VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      tags JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      product_id INT NOT NULL,
      content TEXT NOT NULL,
      rating INT CHECK (rating >= 1 AND rating <= 5),
      tags JSON,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS prizes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      probability DECIMAL(5,4) DEFAULT 0.1,
      stock INT DEFAULT 0,
      image_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lottery_codes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(6) UNIQUE NOT NULL,
      prize_id INT,
      status TINYINT DEFAULT 0 COMMENT '0-未使用, 1-已使用',
      user_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      claimed_at TIMESTAMP NULL,
      FOREIGN KEY (prize_id) REFERENCES prizes(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS lottery_records (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      prize_id INT,
      prize_name VARCHAR(255),
      reward_code VARCHAR(6),
      is_claimed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (prize_id) REFERENCES prizes(id)
    );

    CREATE INDEX idx_lottery_codes_code ON lottery_codes(code);
    CREATE INDEX idx_lottery_codes_status ON lottery_codes(status);
    CREATE INDEX idx_lottery_records_user ON lottery_records(user_id);
    CREATE INDEX idx_lottery_records_created ON lottery_records(created_at);
  `;

  await pool.execute(createTables);
  console.log('Database tables initialized');
}
```

**Step 5: 创建数据库连接中间件**

```typescript
// backend/src/middleware/database.ts
import { pool } from '../database/connection';
import { Request, Response, NextFunction } from 'express';

export const withDatabase = (req: Request, res: Response, next: NextFunction) => {
  req.db = {
    getPool: () => pool,
    getRedis: () => redisClient
  };
  next();
};
```

**Step 6: 更新app.ts添加数据库中间件**

```typescript
// backend/src/app.ts
import withDatabase from './middleware/database';

// 添加数据库中间件
app.use(withDatabase);
```

**Step 7: 测试数据库连接**

```bash
npm run build
npm start
```

**Step 8: 提交数据库相关代码**

```bash
git add backend/src/database/
git commit -m "feat: add database models and connection"
```

### Task 3: JWT认证系统

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/services/auth.ts`
- Create: `backend/src/controllers/auth.ts`
- Create: `backend/src/routes/auth.ts`

**Step 1: 创建JWT服务**

```typescript
// backend/src/services/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../database/models/User';
import { redisClient } from '../database/connection';

export interface JWTPayload {
  userId: number;
  openid: string;
}

export class AuthService {
  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static async loginWithWechat(code: string) {
    // 这里需要调用微信API获取openid
    // 模拟实现，实际需要调用微信API
    const openid = `mock_openid_${code}`;

    let user = await UserModel.findByOpenid(openid);
    if (!user) {
      user = await UserModel.create({ openid });
    }

    const token = this.generateToken({
      userId: user.id!,
      openid: user.openid
    });

    return { user, token };
  }
}
```

**Step 2: 创建认证中间件**

```typescript
// backend/src/middleware/auth.ts
import { AuthService } from '../services/auth';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    openid: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = payload;
  next();
};
```

**Step 3: 创建认证控制器**

```typescript
// backend/src/controllers/auth.ts
import { AuthService } from '../services/auth';
import { Request, Response } from 'express';

export class AuthController {
  static async wechatLogin(req: Request, res: Response) {
    try {
      const { code } = req.body;

      if (!code) {
        return res.status(400).json({ error: 'Wechat code is required' });
      }

      const result = await AuthService.loginWithWechat(code);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      console.error('Wechat login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
}
```

**Step 4: 创建认证路由**

```typescript
// backend/src/routes/auth.ts
import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 微信登录
router.post('/wechat-login', AuthController.wechatLogin);

// 获取当前用户信息
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

export default router;
```

**Step 5: 更新app.ts添加认证路由**

```typescript
// backend/src/app.ts
import authRoutes from './routes/auth';

// 路由
app.use('/api/auth', authRoutes);
```

**Step 6: 测试认证功能**

```bash
# 测试微信登录
curl -X POST http://localhost:5000/api/auth/wechat-login \
  -H "Content-Type: application/json" \
  -d '{"code": "test123"}'

# 测试获取用户信息（需要先获取token）
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer your-token"
```

**Step 7: 提交认证系统**

```bash
git add backend/src/middleware/ backend/src/services/ backend/src/controllers/ backend/src/routes/
git commit -m "feat: add JWT authentication system"
```

### Task 4: Redis缓存配置

**Files:**
- Create: `backend/src/services/cache.ts`

**Step 1: 创建缓存服务**

```typescript
// backend/src/services/cache.ts
import { redisClient } from '../database/connection';

export class CacheService {
  static async get(key: string): Promise<any | null> {
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await redisClient.del(key);
    } catch (error) {
      console.error('Cache del error:', error);
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }
}
```

**Step 2: 测试缓存功能**

```typescript
// 测试缓存
const cacheService = require('./src/services/cache');

// 设置缓存
await cacheService.set('test', { data: 'hello' }, 60);

// 获取缓存
const data = await cacheService.get('test');
console.log(data); // { data: 'hello' }

// 删除缓存
await cacheService.del('test');
```

**Step 3: 提交缓存配置**

```bash
git add backend/src/services/cache.ts
git commit -m "feat: add Redis cache service"
```

### Task 5: 商品管理API

**Files:**
- Create: `backend/src/controllers/product.ts`
- Create: `backend/src/routes/product.ts`

**Step 1: 创建商品控制器**

```typescript
// backend/src/controllers/product.ts
import { ProductModel, Product } from '../database/models/Product';
import { Request, Response } from 'express';

export class ProductController {
  static async getProducts(req: Request, res: Response) {
    try {
      const products = await ProductModel.findAll();
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  static async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await ProductModel.findById(parseInt(id));

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      const { name, tags } = req.body;

      if (!name || !tags) {
        return res.status(400).json({ error: 'Name and tags are required' });
      }

      const product = await ProductModel.create({ name, tags });

      res.status(201).json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const product = await ProductModel.update(parseInt(id), updates);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // 实际删除前检查是否有相关评价
      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
}
```

**Step 2: 创建商品路由**

```typescript
// backend/src/routes/product.ts
import { Router } from 'express';
import { ProductController } from '../controllers/product';

const router = Router();

// 获取所有商品
router.get('/', ProductController.getProducts);

// 获取单个商品
router.get('/:id', ProductController.getProduct);

// 创建商品
router.post('/', ProductController.createProduct);

// 更新商品
router.put('/:id', ProductController.updateProduct);

// 删除商品
router.delete('/:id', ProductController.deleteProduct);

export default router;
```

**Step 3: 更新app.ts添加商品路由**

```typescript
// backend/src/app.ts
import productRoutes from './routes/product';

// 路由
app.use('/api/products', productRoutes);
```

**Step 4: 测试商品API**

```bash
# 获取所有商品
curl http://localhost:5000/api/products/

# 创建商品
curl -X POST http://localhost:5000/api/products/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name": "女装", "tags": ["轻薄", "修身", "百搭", "舒适", "时尚", "潮流"]}'

# 更新商品
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"name": "男装", "tags": ["休闲", "商务", "时尚", "舒适", "百搭", "潮流"]}'
```

**Step 5: 提交商品管理API**

```bash
git add backend/src/controllers/product.ts backend/src/routes/product.ts
git commit -m "feat: add product management API"
```

### Task 6: AI评价生成服务

**Files:**
- Create: `backend/src/services/ai.ts`
- Create: `backend/src/controllers/review.ts`
- Create: `backend/src/routes/review.ts`

**Step 1: 创建AI服务**

```typescript
// backend/src/services/ai.ts
import axios from 'axios';
import { CacheService } from './cache';

export interface ReviewRequest {
  productName: string;
  tags: string[];
  rating: number;
  userId: number;
}

export interface ReviewResponse {
  content: string;
  imageUrl: string;
}

export class AIService {
  private static readonly API_URL = 'https://api.deepseek.com/v1/chat/completions';
  private static readonly MODEL = 'deepseek-chat';

  static async generateReview(request: ReviewRequest): Promise<ReviewResponse> {
    const cacheKey = `review:${request.userId}:${request.productName}:${JSON.stringify(request.tags)}:${request.rating}`;

    // 检查缓存
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const prompt = this.buildPrompt(request);

      const response = await axios.post(
        this.API_URL,
        {
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的商品评价助手，擅长生成真实、感人的商品评价。评价应该包含具体的个人体验，使用口语化的表达方式，让其他消费者信服。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
          }
        }
      );

      const content = response.data.choices[0].message.content;
      const imageUrl = await this.getRandomImageUrl(request.productName);

      const result: ReviewResponse = {
        content,
        imageUrl
      };

      // 缓存结果
      await CacheService.set(cacheKey, result, 3600); // 1小时缓存

      return result;
    } catch (error) {
      console.error('AI generate review error:', error);
      // 返回默认评价作为降级方案
      return this.getFallbackReview(request);
    }
  }

  private static buildPrompt(request: ReviewRequest): string {
    return `请为"${request.productName}"生成一个真实感人的商品评价。

要求：
1. 评分：${request.rating}星
2. 标签：${request.tags.join('、')}
3. 内容要包含具体的使用感受和个人体验
4. 语言要口语化，真实自然
5. 避免使用过于夸张的词语
6. 字数控制在200-300字

请生成一个完整的评价：`;
  }

  private static async getRandomImageUrl(category: string): Promise<string> {
    // 这里应该从OSS获取随机图片，现在返回占位图
    const categoryMap: Record<string, string> = {
      '女装': 'female-clothes',
      '男装': 'male-clothes',
      '数码': 'digital',
      '美妆': 'beauty'
    };

    const categoryFolder = categoryMap[category] || 'general';
    return `https://your-oss-bucket.oss-cn-hangzhou.aliyuncs.com/${categoryFolder}/random.jpg`;
  }

  private static getFallbackReview(request: ReviewRequest): ReviewResponse {
    const templates = [
      `这款${request.productName}真的很不错！${request.tags[0]}的设计让我很喜欢，用了一段时间感觉${request.tags[1]}，整体来说很满意，值得推荐！`,
      `购买${request.productName}已经有一段时间了，确实如宣传的那样${request.tags[0]}。${request.tags[1]}的特点很突出，性价比很高！`,
      `被${request.productName}的${request.tags.join('、')}所吸引，使用体验超出预期。${request.rating}星的推荐，大家放心购买！`
    ];

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    return {
      content: randomTemplate,
      imageUrl: 'https://your-oss-bucket.oss-cn-hangzhou.aliyuncs.com/fallback/default.jpg'
    };
  }
}
```

**Step 2: 创建评价控制器**

```typescript
// backend/src/controllers/review.ts
import { AIService } from '../services/ai';
import { ReviewModel } from '../database/models/Review';
import { Request, Response } from 'express';

export class ReviewController {
  static async generateReview(req: Request, res: Response) {
    try {
      const { productName, tags, rating } = req.body;
      const userId = req.user!.id;

      if (!productName || !tags || !rating) {
        return res.status(400).json({ error: 'Product name, tags and rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      // 生成AI评价
      const aiResult = await AIService.generateReview({
        productName,
        tags,
        rating,
        userId
      });

      // 保存评价到数据库
      const review = await ReviewModel.create({
        userId,
        productId: 1, // 临时用第一个商品ID
        content: aiResult.content,
        rating,
        tags,
        imageUrl: aiResult.imageUrl
      });

      res.json({
        success: true,
        data: {
          review,
          ...aiResult
        }
      });
    } catch (error) {
      console.error('Generate review error:', error);
      res.status(500).json({ error: 'Failed to generate review' });
    }
  }

  static async getReviews(req: Request, res: Response) {
    try {
      // 获取用户评价列表
      res.json({
        success: true,
        data: []
      });
    } catch (error) {
      console.error('Get reviews error:', error);
      res.status(500).json({ error: 'Failed to get reviews' });
    }
  }
}
```

**Step 3: 创建评价模型**

```typescript
// backend/src/database/models/Review.ts
import { pool } from '../connection';

export interface Review {
  id?: number;
  user_id: number;
  product_id: number;
  content: string;
  rating: number;
  tags: string[];
  image_url: string;
  created_at?: Date;
}

export class ReviewModel {
  static async create(review: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, product_id, content, rating, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [review.user_id, review.product_id, review.content, review.rating, JSON.stringify(review.tags), review.image_url]
    );
    return { ...review, id: (result as any).insertId };
  }

  static async findByUserId(userId: number): Promise<Review[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as Review[];
  }
}
```

**Step 4: 创建评价路由**

```typescript
// backend/src/routes/review.ts
import { Router } from 'express';
import { ReviewController } from '../controllers/review';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 生成评价（需要认证）
router.post('/generate', authenticate, ReviewController.generateReview);

// 获取用户评价列表（需要认证）
router.get('/', authenticate, (req: AuthRequest, res) => {
  // TODO: 实现获取用户评价列表
  res.json({ success: true, data: [] });
});

export default router;
```

**Step 5: 更新app.ts添加评价路由**

```typescript
// backend/src/app.ts
import reviewRoutes from './routes/review';

// 路由
app.use('/api/reviews', reviewRoutes);
```

**Step 6: 测试评价生成API**

```bash
# 生成评价（需要先获取token）
curl -X POST http://localhost:5000/api/reviews/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "productName": "女装",
    "tags": ["轻薄", "修身"],
    "rating": 5
  }'
```

**Step 7: 提交AI评价服务**

```bash
git add backend/src/services/ai.ts backend/src/controllers/review.ts backend/src/database/models/Review.ts backend/src/routes/review.ts
git commit -m "feat: add AI review generation service"
```

### Task 7: 抽奖系统API

**Files:**
- Create: `backend/src/services/lottery.ts`
- Create: `backend/src/controllers/lottery.ts`
- Create: `backend/src/routes/lottery.ts`

**Step 1: 创建奖品模型**

```typescript
// backend/src/database/models/Prize.ts
import { pool } from '../connection';

export interface Prize {
  id?: number;
  name: string;
  description?: string;
  probability: number;
  stock: number;
  image_url?: string;
  created_at?: Date;
}

export class PrizeModel {
  static async findAll(): Promise<Prize[]> {
    const [rows] = await pool.execute('SELECT * FROM prizes ORDER BY created_at DESC');
    return rows as Prize[];
  }

  static async findById(id: number): Promise<Prize | null> {
    const [rows] = await pool.execute('SELECT * FROM prizes WHERE id = ?', [id]);
    return (rows as Prize[])[0] || null;
  }
}
```

**Step 2: 创建抽奖服务**

```typescript
// backend/src/services/lottery.ts
import { PrizeModel, Prize } from '../database/models/Prize';
import { UserModel, User } from '../database/models/User';
import { LotteryCodeModel } from '../database/models/LotteryCode';
import { LotteryRecordModel } from '../database/models/LotteryRecord';
import { CacheService } from './cache';

export interface LotteryResult {
  prize: Prize | null;
  code?: string;
}

export class LotteryService {
  // 每日抽奖限制
  private static readonly DAILY_LIMIT = 3;

  static async canDraw(userId: number): Promise<{ canDraw: boolean; remaining: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 检查今日抽奖次数
    const count = await LotteryRecordModel.countByUserIdAndDate(userId, today, tomorrow);
    const remaining = Math.max(0, this.DAILY_LIMIT - count);

    return {
      canDraw: remaining > 0,
      remaining
    };
  }

  static async draw(userId: number): Promise<LotteryResult> {
    // 检查是否可以抽奖
    const { canDraw, remaining } = await this.canDraw(userId);

    if (!canDraw) {
      throw new Error(`今日抽奖次数已用完，剩余${remaining}次`);
    }

    // 获取所有奖品
    const prizes = await PrizeModel.findAll();

    // 计算中奖概率
    const totalProbability = prizes.reduce((sum, prize) => sum + prize.probability, 0);

    // 随机选择奖品
    const random = Math.random() * totalProbability;
    let accumulated = 0;

    for (const prize of prizes) {
      accumulated += prize.probability;

      if (random <= accumulated && prize.stock > 0) {
        // 中奖了
        await prize.stock--;
        await PrizeModel.update(prize.id!, { stock: prize.stock });

        // 生成兑换码
        const code = await this.generateCode();

        // 创建兑换码记录
        await LotteryCodeModel.create({
          code,
          prize_id: prize.id!,
          status: 0
        });

        // 创建抽奖记录
        await LotteryRecordModel.create({
          user_id: userId,
          prize_id: prize.id!,
          prize_name: prize.name,
          reward_code: code
        });

        return {
          prize,
          code
        };
      }
    }

    // 未中奖
    return { prize: null };
  }

  static async generateCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (await LotteryCodeModel.findByCode(code));

    return code;
  }

  static async getUserPrizes(userId: number) {
    return await LotteryRecordModel.findByUserId(userId);
  }

  static async claimPrize(userId: number, code: string): Promise<boolean> {
    const lotteryCode = await LotteryCodeModel.findByCode(code);

    if (!lotteryCode || lotteryCode.status === 1) {
      throw new Error('无效的兑换码');
    }

    if (lotteryCode.user_id !== userId) {
      throw new Error('兑换码不属于当前用户');
    }

    await LotteryCodeModel.updateStatus(code, 1);
    await LotteryRecordModel.updateClaimed(code);

    return true;
  }
}
```

**Step 3: 更新抽奖记录模型**

```typescript
// backend/src/database/models/LotteryRecord.ts
import { pool } from '../connection';

export interface LotteryRecord {
  id?: number;
  user_id: number;
  prize_id: number;
  prize_name: string;
  reward_code: string;
  is_claimed: boolean;
  created_at?: Date;
  claimed_at?: Date;
}

export class LotteryRecordModel {
  static async create(record: Omit<LotteryRecord, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryRecord> {
    const [result] = await pool.execute(
      'INSERT INTO lottery_records (user_id, prize_id, prize_name, reward_code, is_claimed) VALUES (?, ?, ?, ?, ?)',
      [record.user_id, record.prize_id, record.prize_name, record.reward_code, record.is_claimed]
    );
    return { ...record, id: (result as any).insertId };
  }

  static async findByUserId(userId: number): Promise<LotteryRecord[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM lottery_records WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows as LotteryRecord[];
  }

  static async countByUserIdAndDate(userId: number, startDate: Date, endDate: Date): Promise<number> {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM lottery_records WHERE user_id = ? AND created_at >= ? AND created_at < ?',
      [userId, startDate, endDate]
    );
    return (rows as any[])[0].count;
  }

  static async updateClaimed(code: string): Promise<void> {
    await pool.execute(
      'UPDATE lottery_records SET is_claimed = 1, claimed_at = NOW() WHERE reward_code = ?',
      [code]
    );
  }
}
```

**Step 4: 创建兑换码模型**

```typescript
// backend/src/database/models/LotteryCode.ts
import { pool } from '../connection';

export interface LotteryCode {
  id?: number;
  code: string;
  prize_id?: number;
  status: number;
  user_id?: number;
  created_at?: Date;
  claimed_at?: Date;
}

export class LotteryCodeModel {
  static async create(code: Omit<LotteryCode, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryCode> {
    const [result] = await pool.execute(
      'INSERT INTO lottery_codes (code, prize_id, status, user_id) VALUES (?, ?, ?, ?)',
      [code.code, code.prize_id, code.status, code.user_id]
    );
    return { ...code, id: (result as any).insertId };
  }

  static async findByCode(code: string): Promise<LotteryCode | null> {
    const [rows] = await pool.execute('SELECT * FROM lottery_codes WHERE code = ?', [code]);
    return (rows as LotteryCode[])[0] || null;
  }

  static async updateStatus(code: string, status: number): Promise<void> {
    await pool.execute(
      'UPDATE lottery_codes SET status = ?, claimed_at = NOW() WHERE code = ?',
      [status, code]
    );
  }
}
```

**Step 5: 创建抽奖控制器**

```typescript
// backend/src/controllers/lottery.ts
import { LotteryService } from '../services/lottery';
import { Request, Response } from 'express';

export class LotteryController {
  static async draw(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      // 检查是否可以抽奖
      const { canDraw, remaining } = await LotteryService.canDraw(userId);

      if (!canDraw) {
        return res.status(400).json({
          error: `今日抽奖次数已用完，剩余${remaining}次`,
          remaining
        });
      }

      // 执行抽奖
      const result = await LotteryService.draw(userId);

      res.json({
        success: true,
        data: {
          prize: result.prize,
          code: result.code,
          remaining
        }
      });
    } catch (error) {
      console.error('Lottery draw error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '抽奖失败'
      });
    }
  }

  static async getUserPrizes(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const prizes = await LotteryService.getUserPrizes(userId);

      res.json({
        success: true,
        data: prizes
      });
    } catch (error) {
      console.error('Get user prizes error:', error);
      res.status(500).json({ error: '获取奖品列表失败' });
    }
  }

  static async claimPrize(req: Request, res: Response) {
    try {
      const { code } = req.body;
      const userId = req.user!.id;

      if (!code) {
        return res.status(400).json({ error: '兑换码不能为空' });
      }

      const success = await LotteryService.claimPrize(userId, code);

      res.json({
        success: true,
        data: { claimed: success }
      });
    } catch (error) {
      console.error('Claim prize error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : '核销失败'
      });
    }
  }
}
```

**Step 6: 创建抽奖路由**

```typescript
// backend/src/routes/lottery.ts
import { Router } from 'express';
import { LotteryController } from '../controllers/lottery';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// 抽奖（需要认证）
router.post('/draw', authenticate, LotteryController.draw);

// 获取用户奖品列表（需要认证）
router.get('/my-prizes', authenticate, LotteryController.getUserPrizes);

// 核销奖品（需要认证）
router.post('/claim', authenticate, LotteryController.claimPrize);

export default router;
```

**Step 7: 更新app.ts添加抽奖路由**

```typescript
// backend/src/app.ts
import lotteryRoutes from './routes/lottery';

// 路由
app.use('/api/lottery', lotteryRoutes);
```

**Step 8: 测试抽奖API**

```bash
# 抽奖（需要先获取token）
curl -X POST http://localhost:5000/api/lottery/draw \
  -H "Authorization: Bearer your-token"

# 获取用户奖品
curl -X GET http://localhost:5000/api/lottery/my-prizes \
  -H "Authorization: Bearer your-token"
```

**Step 9: 提交抽奖系统**

```bash
git add backend/src/services/lottery.ts backend/src/controllers/lottery.ts backend/src/database/models/Prize.ts backend/src/database/models/LotteryCode.ts backend/src/database/models/LotteryRecord.ts backend/src/routes/lottery.ts
git commit -m "feat: add lottery system API"
```

### Task 8: 文件存储服务集成

**Files:**
- Create: `backend/src/services/storage.ts`
- Create: `backend/src/controllers/upload.ts`
- Create: `backend/src/routes/upload.ts`

**Step 1: 安装OSS SDK**

```bash
npm install @aliyun/oss
```

**Step 2: 创建存储服务**

```typescript
// backend/src/services/storage.ts
import OSS from 'ali-oss';
import { randomBytes } from 'crypto';

export class StorageService {
  private static client: OSS;

  static init() {
    this.client = new OSS({
      region: process.env.OSS_REGION,
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET
    });
  }

  static async uploadFile(file: Buffer, originalname: string): Promise<string> {
    if (!this.client) {
      this.init();
    }

    const extension = originalname.split('.').pop() || 'jpg';
    const filename = `${randomBytes(8).toString('hex')}.${extension}`;
    const key = `images/${filename}`;

    await this.client.put(key, file);

    return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`;
  }

  static async deleteFile(key: string): Promise<void> {
    if (!this.client) {
      this.init();
    }

    await this.client.delete(key);
  }

  static async getFileUrl(key: string): Promise<string> {
    return `https://${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com/${key}`;
  }
}
```

**Step 3: 创建文件上传控制器**

```typescript
// backend/src/controllers/upload.ts
import multer from 'multer';
import { StorageService } from '../services/storage';
import { Request, Response } from 'express';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export class UploadController {
  static async uploadImage(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const url = await StorageService.uploadFile(req.file.buffer, req.file.originalname);

      res.json({
        success: true,
        data: {
          url,
          filename: req.file.originalname,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Image upload failed' });
    }
  }
}

export { upload };
```

**Step 4: 创建上传路由**

```typescript
// backend/src/routes/upload.ts
import { Router } from 'express';
import { UploadController, upload } from '../controllers/upload';

const router = Router();

// 上传图片（需要认证）
router.post('/image', upload.single('image'), UploadController.uploadImage);

export default router;
```

**Step 5: 更新app.ts添加上传路由**

```typescript
// backend/src/app.ts
import uploadRoutes from './routes/upload';

// 路由
app.use('/api/upload', uploadRoutes);
```

**Step 6: 测试文件上传**

```bash
# 安装curl（如果还没有）
# 上传图片（需要先获取token）
curl -X POST http://localhost:5000/api/upload/image \
  -H "Authorization: Bearer your-token" \
  -F "image=@/path/to/your/image.jpg"
```

**Step 7: 提交文件存储服务**

```bash
git add backend/src/services/storage.ts backend/src/controllers/upload.ts backend/src/routes/upload.ts
git commit -m "feat: add file storage service with OSS"
```

### Task 9: WebSocket实时通信

**Files:**
- Create: `backend/src/services/socket.ts`
- Create: `backend/src/server.ts`（更新）

**Step 1: 安装Socket.io**

```bash
npm install socket.io
```

**Step 2: 创建Socket服务**

```typescript
// backend/src/services/socket.ts
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
```

**Step 3: 更新server.ts集成Socket**

```typescript
// backend/src/server.ts
import app from './app';
import { initializeDatabase } from './database/init';
import { SocketService } from './services/socket';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // 初始化数据库
    await initializeDatabase();

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
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

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
```

**Step 4: 测试WebSocket连接**

```bash
# 使用浏览器开发者工具或WebSocket客户端测试
# 连接 ws://localhost:5000
# 发送消息：{ event: 'join-merchant', data: '1' }
# 应该收到连接确认
```

**Step 5: 提交WebSocket服务**

```bash
git add backend/src/services/socket.ts backend/src/server.ts
git commit -m "feat: add WebSocket real-time communication"
```

### Task 10: 商家端适配

**Files:**
- Modify: `shangjiaduan/src/api/`（更新API地址）
- Modify: `shangjiaduan/src/utils/auth.ts`（更新认证逻辑）

**Step 1: 更新API配置**

```typescript
// shangjiaduan/src/api/config.ts
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://your-domain.com/api'
  : 'http://localhost:5000/api';

export const WS_URL = process.env.NODE_ENV === 'production'
  ? 'wss://your-domain.com'
  : 'ws://localhost:5000';
```

**Step 2: 更新认证工具**

```typescript
// shangjiaduan/src/utils/auth.ts
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

// 存储token
export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

// 请求拦截器
axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Step 3: 更新Socket连接**

```typescript
// shangjiaduan/src/utils/socket.ts
import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../api/config';

export let socket: Socket;

export const initSocket = (merchantId?: number) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(WS_URL, {
    auth: {
      token: localStorage.getItem('token')
    }
  });

  if (merchantId) {
    socket.emit('join-merchant', merchantId);
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null as any;
  }
};
```

**Step 4: 更新登录逻辑**

```typescript
// shangjiaduan/src/pages/Login/Login.tsx
import { API_BASE_URL } from '../../api/config';

const Login = () => {
  const handleLogin = async (code: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/wechat-login`, { code });
      const { token } = response.data.data;

      localStorage.setItem('token', token);
      // 跳转到仪表盘
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  // 微信登录逻辑...
};
```

**Step 5: 测试商家端适配**

```bash
cd shangjiaduan
npm install
npm run dev
```

**Step 6: 提交商家端适配**

```bash
git add shangjiaduan/src/api/ shangjiaduan/src/utils/
git commit -m "feat: adapt merchant frontend for independent backend"
```

### Task 11: 小程序端改造

**Files:**
- Modify: `yonghuduan/pages/`（更新页面逻辑）
- Create: `yonghuduan/utils/api.ts`（API工具）

**Step 1: 创建API工具**

```typescript
// yonghuduan/utils/api.ts
const API_BASE_URL = 'http://localhost:5000/api';

const request = (url: string, options: any = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE_URL}${url}`,
      ...options,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // 清除本地存储并跳转到登录页
          wx.removeStorageSync('token');
          wx.navigateTo({
            url: '/pages/login/login'
          });
          reject(new Error('Unauthorized'));
        } else {
          reject(new Error(res.data.message || 'Request failed'));
        }
      },
      fail: reject
    });
  });
};

export const get = (url: string) => request(url, { method: 'GET' });
export const post = (url: string, data: any) => request(url, {
  method: 'POST',
  data: JSON.stringify(data),
  header: { 'Content-Type': 'application/json' }
});
export const put = (url: string, data: any) => request(url, {
  method: 'PUT',
  data: JSON.stringify(data),
  header: { 'Content-Type': 'application/json' }
});
export const del = (url: string) => request(url, { method: 'DELETE' });
```

**Step 2: 更新首页逻辑**

```typescript
// yonghuduan/pages/index/index.ts
import { post } from '../../utils/api';

Page({
  data: {
    categories: [],
    selectedCategory: '',
    selectedTags: [],
    rating: 5,
    loading: false
  },

  onLoad() {
    this.loadCategories();
  },

  async loadCategories() {
    try {
      const res = await await get('/products');
      this.setData({ categories: res.data });
    } catch (error) {
      console.error('Load categories failed:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  generateReview() {
    if (!this.data.selectedCategory || this.data.selectedTags.length === 0) {
      wx.showToast({
        title: '请选择类目和标签',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    post('/reviews/generate', {
      productName: this.data.selectedCategory,
      tags: this.data.selectedTags,
      rating: this.data.rating
    })
    .then((res) => {
      this.setData({ loading: false });
      wx.navigateTo({
        url: `/pages/result/index?data=${encodeURIComponent(JSON.stringify(res.data))}`
      });
    })
    .catch((error) => {
      this.setData({ loading: false });
      wx.showToast({
        title: '生成失败',
        icon: 'none'
      });
    });
  }
});
```

**Step 3: 更新抽奖页面**

```typescript
// yonghuduan/pages/lottery/index.ts
import { post, get } from '../../utils/api';

Page({
  data: {
    remainingDraws: 0,
    prizes: [],
    loading: false
  },

  onLoad() {
    this.checkDrawLimit();
    this.loadUserPrizes();
  },

  async checkDrawLimit() {
    try {
      const res = await post('/lottery/draw');
      this.setData({ remainingDraws: res.data.remaining });
    } catch (error) {
      // 没有抽奖次数时会有错误，这是正常的
    }
  },

  async loadUserPrizes() {
    try {
      const res = await get('/lottery/my-prizes');
      this.setData({ prizes: res.data });
    } catch (error) {
      console.error('Load prizes failed:', error);
    }
  },

  drawLottery() {
    if (this.data.remainingDraws <= 0) {
      wx.showToast({
        title: '今日抽奖次数已用完',
        icon: 'none'
      });
      return;
    }

    this.setData({ loading: true });

    post('/lottery/draw')
    .then((res) => {
      this.setData({
        loading: false,
        remainingDraws: res.data.remaining
      });

      if (res.data.prize) {
        wx.showModal({
          title: '恭喜中奖！',
          content: `您获得了：${res.data.prize.name}`,
          showCancel: false,
          confirmText: '查看兑换码',
          success: () => {
            wx.setStorageSync('rewardCode', res.data.code);
            wx.showToast({
              title: `兑换码：${res.data.code}`,
              icon: 'none'
            });
          }
        });
      } else {
        wx.showToast({
          title: '很遗憾，未中奖',
          icon: 'none'
        });
      }
    })
    .catch((error) => {
      this.setData({ loading: false });
      wx.showToast({
        title: error.message || '抽奖失败',
        icon: 'none'
      });
    });
  }
});
```

**Step 4: 更新小程序配置**

```json
// yonghuduan/app.js
App({
  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    }
  }
});
```

**Step 5: 测试小程序改造**

```bash
# 使用微信开发者工具打开yonghuduan目录
# 编译并运行小程序
```

**Step 6: 提交小程序改造**

```bash
git add yonghuduan/utils/ yonghuduan/pages/*/index.ts
git commit -m "feat: adapt wechat mini-program for independent backend"
```

### Task 12: 数据迁移

**Files:**
- Create: `backend/scripts/migrate-data.ts`
- Create: `backend/scripts/migrate-data.js`

**Step 1: 创建数据迁移脚本**

```typescript
// backend/scripts/migrate-data.ts
import { pool } from '../src/database/connection';
import { initializeDatabase } from '../src/database/init';

async function migrateProducts() {
  console.log('Migrating products...');

  // 从微信云导出的产品数据
  const products = [
    { name: '女装', tags: ['轻薄', '修身', '百搭', '舒适', '时尚', '潮流'] },
    { name: '男装', tags: ['休闲', '商务', '时尚', '舒适', '百搭', '潮流'] },
    { name: '数码', tags: ['高性能', '轻薄', '长续航', '拍照好', '游戏', '办公'] },
    { name: '美妆', tags: ['保湿', '美白', '抗衰老', '敏感肌', '天然', '有机'] }
  ];

  for (const product of products) {
    await pool.execute(
      'INSERT INTO products (name, tags) VALUES (?, ?)',
      [product.name, JSON.stringify(product.tags)]
    );
  }

  console.log('Products migrated successfully');
}

async function migrateImages() {
  console.log('Migrating images...');

  // 迁移图片逻辑
  // 这里需要从微信云存储下载图片，上传到OSS
  console.log('Images migration skipped - manual upload required');
}

async function main() {
  try {
    // 初始化数据库
    await initializeDatabase();

    // 执行迁移
    await migrateProducts();
    await migrateImages();

    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
```

**Step 2: 运行迁移脚本**

```bash
cd backend
npm run build
node scripts/migrate-data.js
```

**Step 3: 提交迁移脚本**

```bash
git add backend/scripts/
git commit -m "feat: add data migration scripts"
```

### Task 13: Docker配置

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/docker-compose.yml`
- Create: `backend/.dockerignore`

**Step 1: 创建Dockerfile**

```dockerfile
# backend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 5000

# 启动应用
CMD ["npm", "start"]
```

**Step 2: 创建docker-compose.yml**

```yaml
# backend/docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=root
      - DB_PASSWORD=rootpassword
      - DB_NAME=haopingbao
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=
      - JWT_SECRET=your-jwt-secret-key
      - DEEPSEEK_API_KEY=your-deepseek-api-key
      - OSS_ACCESS_KEY_ID=your-oss-access-key
      - OSS_ACCESS_KEY_SECRET=your-oss-secret
      - OSS_BUCKET=haopingbao-images
      - OSS_REGION=oss-cn-hangzhou
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: haopingbao
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

**Step 3: 创建.dockerignore**

`````
# backend/.dockerignore
node_modules
npm-debug.log
Dockerfile
.dockerignore
.git
.gitignore
README.md
dist
`````

**Step 4: 测试Docker部署**

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**Step 5: 提交Docker配置**

```bash
git add backend/Dockerfile backend/docker-compose.yml backend/.dockerignore
git commit -m "feat: add Docker deployment configuration"
```

### Task 14: 测试和部署

**Files:**
- Create: `backend/tests/`
- Create: `backend/tests/auth.test.ts`
- Create: `backend/tests/product.test.ts`

**Step 1: 创建测试配置**

```typescript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts'
  ]
};
```

**Step 2: 创建认证测试**

```typescript
// backend/tests/auth.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  it('should login with wechat code', async () => {
    const response = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test123' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.openid).toBeDefined();
  });
});
```

**Step 3: 创建产品测试**

```typescript
// backend/tests/product.test.ts
import request from 'supertest';
import app from '../src/app';

describe('Product API', () => {
  let token: string;

  beforeAll(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test123' });

    token = loginResponse.body.data.token;
  });

  it('should get all products', async () => {
    const response = await request(app)
      .get('/api/products')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should create product', async () => {
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: '测试类目',
        tags: ['标签1', '标签2']
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('测试类目');
  });
});
```

**Step 4: 运行测试**

```bash
cd backend
npm test
```

**Step 5: 部署到生产环境**

```bash
# 构建生产版本
npm run build

# 使用PM2启动
npm install -g pm2
pm2 start dist/server.js --name "haopingbao-api"

# 配置Nginx反向代理
# /etc/nginx/sites-available/haopingbao
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**Step 6: 提交测试和部署**

```bash
git add backend/tests/ backend/jest.config.js
git commit -m "feat: add comprehensive test suite and production deployment"
```

---

## 风险控制和注意事项

### 1. 数据安全
- 迁移前完整备份数据
- 使用事务确保数据一致性
- 验证迁移后的数据完整性

### 2. 服务可用性
- 采用灰度发布策略
- 保持原服务运行一段时间
- 准备快速回滚方案

### 3. 性能优化
- 添加缓存层（Redis）
- 数据库索引优化
- 静态资源CDN加速

### 4. 监控和日志
- 实时监控系统状态
- 记录详细的操作日志
- 设置告警机制

## 后续优化建议

1. **API文档**：使用Swagger生成API文档
2. **限流保护**：实现API限流机制
3. **缓存优化**：增加热点数据缓存
4. **数据库分库分表**：应对数据增长
5. **容器编排**：使用Kubernetes管理服务

---

Plan complete and saved to `docs/plans/2024-12-15-cloud-migration-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
