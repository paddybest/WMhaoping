# 小程序API - 商家信息接口文档

**任务**: Task #5 - 小程序API改造（商家信息接口）
**状态**: ✅ 实施完成
**日期**: 2026-02-16

---

## 概述

为小程序提供商家信息查询API，支持获取商家详情和客服二维码。这些API是公开接口，无需JWT认证，但实现了速率限制保护。

---

## API端点

### 1. 获取所有活跃商家列表

**端点**: `GET /api/miniprogram/merchant`

**描述**: 获取所有活跃的商家列表

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "优质水果店",
      "description": "新鲜水果，当日配送",
      "isActive": true,
      "customerServiceQrUrl": "https://oss.example.com/cs-qr/1.png",
      "qrCodeUrl": "https://oss.example.com/merchant-qr/1.png",
      "createdAt": "2026-02-16T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "美味面包房",
      "description": "现烤面包，香甜可口",
      "isActive": true,
      "customerServiceQrUrl": "https://oss.example.com/cs-qr/2.png",
      "qrCodeUrl": "https://oss.example.com/merchant-qr/2.png",
      "createdAt": "2026-02-16T11:00:00.000Z"
    }
  ]
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Failed to get merchants"
}
```

---

### 2. 获取商家详情

**端点**: `GET /api/miniprogram/merchant/:id`

**描述**: 根据商家ID获取详细信息

**路径参数**:
- `id` (必填): 商家ID

**请求示例**:
```bash
GET /api/miniprogram/merchant/1
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "优质水果店",
    "description": "新鲜水果，当日配送",
    "shopName": "Quality Fruit Shop",
    "isActive": true,
    "customerServiceQrUrl": "https://oss.example.com/cs-qr/1.png",
    "qrCodeUrl": "https://oss.example.com/merchant-qr/1.png",
    "createdAt": "2026-02-16T10:00:00.000Z",
    "updatedAt": "2026-02-16T10:00:00.000Z"
  }
}
```

**错误响应**:

400 Bad Request (无效的ID):
```json
{
  "success": false,
  "error": "Invalid Merchant ID"
}
```

404 Not Found (商家不存在):
```json
{
  "success": false,
  "error": "Merchant not found"
}
```

404 Not Found (商家未激活):
```json
{
  "success": false,
  "error": "Merchant is not active"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "Failed to get merchant"
}
```

---

### 3. 获取商家客服二维码

**端点**: `GET /api/miniprogram/merchant/customer-service/:merchantId`

**描述**: 获取指定商家的客服二维码URL

**路径参数**:
- `merchantId` (必填): 商家ID

**请求示例**:
```bash
GET /api/miniprogram/merchant/customer-service/1
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "merchantName": "优质水果店",
    "qrCodeUrl": "https://oss.example.com/cs-qr/1.png"
  }
}
```

**错误响应**:

400 Bad Request (无效的ID):
```json
{
  "success": false,
  "error": "Invalid Merchant ID"
}
```

404 Not Found (商家不存在):
```json
{
  "success": false,
  "error": "Merchant not found"
}
```

404 Not Found (商家未激活):
```json
{
  "success": false,
  "error": "Merchant is not active"
}
```

404 Not Found (未设置客服二维码):
```json
{
  "success": false,
  "error": "Customer service QR code not available"
}
```

500 Internal Server Error:
```json
{
  "success": false,
  "error": "Failed to get customer service QR code"
}
```

---

## 安全特性

### 1. 速率限制
- 所有端点都应用了`miniprogramRateLimit`中间件
- 防止API滥用和DDoS攻击
- 默认限制：每个IP每分钟最多100次请求（可在配置中调整）

### 2. 输入验证
- 所有ID参数都进行类型检查（必须为有效整数）
- 商家必须存在且处于活跃状态
- 不暴露敏感信息（如密码哈希）

### 3. 数据过滤
- 自动过滤未激活的商家
- 不返回商家的敏感字段
- 客服二维码为可选字段，未设置时返回404

---

## 使用场景

### 场景1: 小程序首页显示商家信息

**前端代码示例** (微信小程序):
```javascript
// 加载商家信息
async loadMerchantInfo(merchantId) {
  wx.request({
    url: `${app.globalData.baseUrl}/miniprogram/merchant/${merchantId}`,
    method: 'GET',
    success: (res) => {
      if (res.data.success) {
        const merchant = res.data.data;

        // 显示商家信息
        this.setData({
          merchantName: merchant.name,
          merchantDescription: merchant.description,
          merchantQrUrl: merchant.qrCodeUrl
        });
      } else {
        wx.showToast({
          title: res.data.error || '加载失败',
          icon: 'none'
        });
      }
    },
    fail: (error) => {
      console.error('加载商家信息失败:', error);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    }
  });
}
```

### 场景2: 客服页面显示二维码

**前端代码示例**:
```javascript
// 加载客服二维码
async loadCustomerServiceQR(merchantId) {
  wx.request({
    url: `${app.globalData.baseUrl}/miniprogram/merchant/customer-service/${merchantId}`,
    method: 'GET',
    success: (res) => {
      if (res.data.success) {
        this.setData({
          customerServiceQR: res.data.data.qrCodeUrl,
          merchantName: res.data.data.merchantName
        });
      } else {
        // 如果未设置客服二维码，显示默认提示
        this.setData({
          error: '暂无客服二维码'
        });
      }
    }
  });
}
```

### 场景3: 商家选择列表

**前端代码示例**:
```javascript
// 获取所有活跃商家
async loadActiveMerchants() {
  wx.request({
    url: `${app.globalData.baseUrl}/miniprogram/merchant`,
    method: 'GET',
    success: (res) => {
      if (res.data.success) {
        this.setData({
          merchants: res.data.data
        });
      }
    }
  });
}
```

---

## 测试指南

### 手动测试 (使用curl)

#### 测试1: 获取所有商家
```bash
curl -X GET http://localhost:5000/api/miniprogram/merchant
```

#### 测试2: 获取特定商家详情
```bash
curl -X GET http://localhost:5000/api/miniprogram/merchant/1
```

#### 测试3: 获取客服二维码
```bash
curl -X GET http://localhost:5000/api/miniprogram/merchant/customer-service/1
```

#### 测试4: 无效商家ID
```bash
curl -X GET http://localhost:5000/api/miniprogram/merchant/999999
# 预期: 404 Not Found
```

#### 测试5: 无效的ID格式
```bash
curl -X GET http://localhost:5000/api/miniprogram/merchant/abc
# 预期: 400 Bad Request
```

### 自动化测试 (使用Jest)

创建测试文件 `backend/src/tests/miniprogramMerchant.test.ts`:

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import miniprogramMerchantRouter from '../../routes/miniprogramMerchant';

describe('Miniprogram Merchant API', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/miniprogram/merchant', miniprogramMerchantRouter);
  });

  describe('GET /api/miniprogram/merchant', () => {
    it('should return list of active merchants', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('customerServiceQrUrl');
      expect(response.body.data[0]).toHaveProperty('qrCodeUrl');
    });
  });

  describe('GET /api/miniprogram/merchant/:id', () => {
    it('should return merchant details for valid ID', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id', 1);
      expect(response.body.data).toHaveProperty('name');
      expect(response.body.data).toHaveProperty('description');
      expect(response.body.data).not.toHaveProperty('password'); // 不应返回密码
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Merchant not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Merchant ID');
    });
  });

  describe('GET /api/miniprogram/merchant/customer-service/:merchantId', () => {
    it('should return customer service QR code', async () => {
      const response = await request(app)
        .get('/api/miniprogram/merchant/customer-service/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('qrCodeUrl');
      expect(response.body.data).toHaveProperty('merchantId');
      expect(response.body.data).toHaveProperty('merchantName');
    });

    it('should return 404 when QR code not available', async () => {
      // 假设ID=2的商家没有设置客服二维码
      const response = await request(app)
        .get('/api/miniprogram/merchant/customer-service/2')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Customer service QR code not available');
    });
  });
});
```

运行测试:
```bash
cd backend
npm test -- miniprogramMerchant.test.ts
```

---

## 数据库Schema要求

这些API依赖于以下数据库字段（已在Task #2中实现）:

### merchants表
```sql
CREATE TABLE merchants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255),
  name VARCHAR(255),
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  customer_service_qr_url VARCHAR(500),  -- 客服二维码URL
  qr_code_url VARCHAR(500),              -- 商家专属二维码URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**关键字段**:
- `customer_service_qr_url`: 客服二维码URL（可为空）
- `qr_code_url`: 商家专属二维码URL（可为空）
- `is_active`: 商家是否处于活跃状态

---

## 性能优化

### 1. 缓存策略（可选）
```typescript
// 添加Redis缓存示例
import Redis from 'ioredis';

const redis = new Redis();

static async getMerchantById(req: any, res: Response): Promise<void> {
  const { id } = req.params;
  const cacheKey = `merchant:${id}`;

  // 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // 从数据库查询
  const merchant = await MerchantModel.findById(parseInt(id));

  // 存入缓存（1小时过期）
  await redis.setex(cacheKey, 3600, JSON.stringify(merchant));

  res.json({ success: true, data: merchant });
}
```

### 2. 数据库索引
确保以下索引存在:
```sql
-- 优化商家查询
CREATE INDEX idx_merchants_is_active ON merchants(is_active);

-- 优化商家名称搜索
CREATE INDEX idx_merchants_name ON merchants(name);
```

---

## 故障排查

### 问题1: API返回404
**可能原因**:
- 商家ID不存在
- 商家is_active=false

**解决方案**:
```sql
-- 检查商家是否存在且活跃
SELECT id, name, is_active FROM merchants WHERE id = 1;
```

### 问题2: 客服二维码返回404
**可能原因**:
- 商家未设置customer_service_qr_url
- 字段值为NULL

**解决方案**:
```sql
-- 检查客服二维码字段
SELECT id, name, customer_service_qr_url
FROM merchants
WHERE id = 1;
```

### 问题3: 速率限制错误
**可能原因**:
- 请求频率超过限制

**解决方案**:
- 添加重试逻辑
- 增加速率限制阈值
- 使用API密钥绕过限制

---

## 下一步

**已完成** ✅:
- 获取商家详情API
- 获取客服二维码API
- 路由配置和错误处理

**待实施** 📝:
- 添加Redis缓存
- 添加API文档（Swagger）
- 添加单元测试
- 性能监控

---

**实施人员**: Claude Code
**审查状态**: 待审查
**部署状态**: 待测试
