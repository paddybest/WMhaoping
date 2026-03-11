# 小程序API - 客服二维码接口文档

**任务**: Task #9 - 小程序API客服二维码接口
**状态**: ✅ 实施完成
**日期**: 2026-02-16

---

## 概述

为小程序提供独立的客服二维码查询API，支持根据商家ID获取客服二维码信息。此API遵循RESTful设计规范，是公开接口，无需JWT认证，但实现了速率限制保护。

---

## API端点

### 获取商家客服二维码

**端点**: `GET /api/miniprogram/customer-service/:merchantId`

**描述**: 根据商家ID获取客服二维码URL

**路径参数**:
- `merchantId` (必填): 商家ID

**请求示例**:
```bash
GET /api/miniprogram/customer-service/1
```

**成功响应** (200):
```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "merchantName": "优质水果店",
    "shopName": "Quality Fruit Shop",
    "qrCodeUrl": "https://oss.example.com/cs-qr/1.png"
  }
}
```

**响应字段说明**:
- `merchantId`: 商家ID
- `merchantName`: 商家显示名称
- `shopName`: 商家店铺名称
- `qrCodeUrl`: 客服二维码图片URL

---

## 错误响应

### 400 Bad Request (无效的ID)
```json
{
  "success": false,
  "error": "Invalid Merchant ID"
}
```

**触发条件**:
- merchantId参数不是有效整数

### 404 Not Found (商家不存在)
```json
{
  "success": false,
  "error": "Merchant not found"
}
```

**触发条件**:
- 商家ID不存在于数据库

### 404 Not Found (商家未激活)
```json
{
  "success": false,
  "error": "Merchant is not active"
}
```

**触发条件**:
- 商家存在但`is_active=false`

### 404 Not Found (未设置客服二维码)
```json
{
  "success": false,
  "error": "Customer service QR code not available"
}
```

**触发条件**:
- 商家未设置客服二维码（`customer_service_qr_url`为NULL）

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to get customer service QR code"
}
```

---

## 使用场景

### 场景1: 小程序客服页面

**前端代码示例** (微信小程序):
```javascript
Page({
  data: {
    customerServiceQR: '',
    merchantName: ''
  },

  onLoad(options) {
    const merchantId = options.merchantId || 1;
    this.loadCustomerServiceQR(merchantId);
  },

  async loadCustomerServiceQR(id) {
    wx.showLoading({ title: '加载中...' });

    wx.request({
      url: `http://localhost:5000/api/miniprogram/customer-service/${id}`,
      method: 'GET',
      success: (res) => {
        wx.hideLoading();

        if (res.data.success) {
          this.setData({
            customerServiceQR: res.data.data.qrCodeUrl,
            merchantName: res.data.data.merchantName
          });
        } else {
          // 如果未设置客服二维码，显示提示
          if (res.data.error === 'Customer service QR code not available') {
            wx.showModal({
              title: '提示',
              content: '该商家暂未设置客服二维码',
              showCancel: false
            });
          } else {
            wx.showToast({
              title: res.data.error || '加载失败',
              icon: 'none'
            });
          }
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('加载客服二维码失败:', error);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  }
});
```

### 场景2: 客服页面WXML

```xml
<!-- miniprogram/pages/customer-service/index.wxml -->
<view class="customer-service-page">
  <view class="merchant-info">
    <text class="merchant-name">{{merchantName}}</text>
  </view>

  <view class="qr-code-container" wx:if="{{customerServiceQR}}">
    <image
      src="{{customerServiceQR}}"
      class="qr-code"
      mode="widthFix"
      show-menu-by-longpress="{{true}}"
    />
    <text class="tip">长按保存二维码图片</text>
  </view>

  <view class="no-qr-code" wx:else>
    <image src="/images/no-qrcode.png" class="placeholder" />
    <text class="placeholder-text">暂无客服二维码</text>
  </view>

  <view class="instructions">
    <text class="instruction-title">如何联系客服：</text>
    <text class="instruction-step">1. 截图或保存上方二维码</text>
    <text class="instruction-step">2. 打开微信扫一扫</text>
    <text class="instruction-step">3. 从相册选择二维码</text>
  </view>
</view>
```

### 场景3: 客服页面样式

```css
/* miniprogram/pages/customer-service/index.wxss */
.customer-service-page {
  padding: 40rpx;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.merchant-info {
  text-align: center;
  margin-bottom: 60rpx;
}

.merchant-name {
  font-size: 48rpx;
  font-weight: bold;
  color: #fff;
}

.qr-code-container {
  background: #fff;
  border-radius: 20rpx;
  padding: 60rpx;
  text-align: center;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.1);
}

.qr-code {
  width: 500rpx;
  height: 500rpx;
  margin-bottom: 40rpx;
}

.tip {
  font-size: 28rpx;
  color: #999;
}

.no-qr-code {
  text-align: center;
  padding: 120rpx 0;
}

.placeholder {
  width: 400rpx;
  height: 400rpx;
  margin-bottom: 40rpx;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 32rpx;
  color: #fff;
}

.instructions {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-top: 60rpx;
}

.instruction-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  margin-bottom: 30rpx;
}

.instruction-step {
  display: block;
  font-size: 28rpx;
  color: #fff;
  line-height: 1.8;
  margin-bottom: 10rpx;
}
```

---

## 测试指南

### 手动测试 (使用curl)

#### 测试1: 获取客服二维码（正常情况）
```bash
curl -X GET http://localhost:5000/api/miniprogram/customer-service/1
```

**预期响应**:
```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "merchantName": "优质水果店",
    "shopName": "Quality Fruit Shop",
    "qrCodeUrl": "https://oss.example.com/cs-qr/1.png"
  }
}
```

#### 测试2: 无效商家ID格式
```bash
curl -X GET http://localhost:5000/api/miniprogram/customer-service/invalid
```

**预期响应** (400):
```json
{
  "success": false,
  "error": "Invalid Merchant ID"
}
```

#### 测试3: 商家不存在
```bash
curl -X GET http://localhost:5000/api/miniprogram/customer-service/999999
```

**预期响应** (404):
```json
{
  "success": false,
  "error": "Merchant not found"
}
```

#### 测试4: 商家未设置客服二维码
```bash
# 假设ID=2的商家没有设置customer_service_qr_url
curl -X GET http://localhost:5000/api/miniprogram/customer-service/2
```

**预期响应** (404):
```json
{
  "success": false,
  "error": "Customer service QR code not available"
}
```

### 自动化测试 (使用Jest)

创建测试文件 `backend/src/tests/miniprogramCustomerService.test.ts`:

```typescript
import request from 'supertest';
import express, { Express } from 'express';
import miniprogramCustomerServiceRouter from '../../routes/miniprogramCustomerService';

describe('Miniprogram Customer Service API', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/miniprogram/customer-service', miniprogramCustomerServiceRouter);
  });

  describe('GET /api/miniprogram/customer-service/:merchantId', () => {
    it('should return customer service QR code for valid merchant', async () => {
      const response = await request(app)
        .get('/api/miniprogram/customer-service/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('merchantId');
      expect(response.body.data).toHaveProperty('merchantName');
      expect(response.body.data).toHaveProperty('shopName');
      expect(response.body.data).toHaveProperty('qrCodeUrl');
      expect(response.body.data.qrCodeUrl).toMatch(/^https?:\/\//);
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app)
        .get('/api/miniprogram/customer-service/999999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Merchant not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/miniprogram/customer-service/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid Merchant ID');
    });

    it('should return 404 when QR code not available', async () => {
      // 假设ID=2的商家没有设置客服二维码
      const response = await request(app)
        .get('/api/miniprogram/customer-service/2')
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
npm test -- miniprogramCustomerService.test.ts
```

---

## 数据库要求

此API依赖于merchants表的以下字段（已在Task #2中实现）:

```sql
ALTER TABLE merchants
ADD COLUMN customer_service_qr_url VARCHAR(500) COMMENT '客服二维码URL',
ADD COLUMN name VARCHAR(255) COMMENT '商家显示名称',
ADD COLUMN is_active TINYINT(1) DEFAULT 1 COMMENT '是否营业';
```

**关键字段**:
- `customer_service_qr_url`: 客服二维码URL（可为空）
- `name`: 商家显示名称
- `shop_name`: 商家店铺名称
- `is_active`: 商家是否处于活跃状态

---

## 性能优化

### 1. 添加Redis缓存（可选）

```typescript
import Redis from 'ioredis';

const redis = new Redis();

static async getCustomerServiceQR(req: any, res: Response): Promise<void> {
  const { merchantId } = req.params;
  const id = parseInt(merchantId);
  const cacheKey = `customer-service:${id}`;

  // 尝试从缓存获取
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // 从数据库查询
  const merchant = await MerchantModel.findById(id);

  // ... 验证逻辑 ...

  const responseData = {
    success: true,
    data: {
      merchantId: merchant.id,
      merchantName: merchant.name,
      shopName: merchant.shopName,
      qrCodeUrl: merchant.customerServiceQrUrl
    }
  };

  // 存入缓存（1小时过期）
  await redis.setex(cacheKey, 3600, JSON.stringify(responseData));

  res.json(responseData);
}
```

### 2. 数据库索引优化

```sql
-- 优化商家查询
CREATE INDEX idx_merchants_is_active ON merchants(is_active);
CREATE INDEX idx_merchants_id ON merchants(id);
```

---

## 与其他API的对比

### 方案对比

**方案A**: 独立路由（当前实施）
```typescript
GET /api/miniprogram/customer-service/:merchantId
```

**优点**:
- ✅ 路径清晰，符合RESTful规范
- ✅ 独立于merchant路由，便于管理
- ✅ 符合设计文档要求

**缺点**:
- ⚠️ 需要额外的路由文件

**方案B**: 嵌套路由（任务5实施）
```typescript
GET /api/miniprogram/merchant/customer-service/:merchantId
```

**优点**:
- ✅ 路由结构更集中

**缺点**:
- ⚠️ 路径较长
- ⚠️ 与设计文档不一致

### 建议

**推荐使用方案A**（当前实施），原因：
1. 符合设计文档规范
2. 路由更简洁
3. 便于未来扩展（可能需要其他客服相关接口）

---

## 故障排查

### 问题1: API返回404

**可能原因**:
- 商家ID不存在
- 商家未激活
- 未设置客服二维码

**排查步骤**:
```sql
-- 1. 检查商家是否存在
SELECT id, name, is_active, customer_service_qr_url
FROM merchants
WHERE id = 1;

-- 2. 检查商家是否活跃
SELECT is_active FROM merchants WHERE id = 1;

-- 3. 检查客服二维码是否设置
SELECT customer_service_qr_url FROM merchants WHERE id = 1;
```

### 问题2: 返回的QR码URL无法访问

**可能原因**:
- OSS URL配置错误
- 图片未上传到OSS
- OSS权限配置问题

**解决方案**:
```javascript
// 验证URL是否可访问
const validateQRUrl = async (url) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};

// 在返回前验证
if (merchant.customerServiceQrUrl) {
  const isValid = await validateQRUrl(merchant.customerServiceQrUrl);
  if (!isValid) {
    console.warn(`QR code URL invalid: ${merchant.customerServiceQrUrl}`);
  }
}
```

---

## 安全性评估

### ✅ 已实现的安全措施

1. **速率限制**
   - 应用`miniprogramRateLimit`中间件
   - 防止API滥用

2. **输入验证**
   - 所有ID参数类型检查
   - 防止SQL注入

3. **业务逻辑验证**
   - 商家存在性验证
   - 商家活跃状态验证
   - 客服二维码存在性验证

4. **错误处理**
   - 统一的错误响应格式
   - 不暴露内部实现细节

---

## 后续扩展建议

### 1. 客服二维码上传接口

**端点**: `POST /api/merchant/customer-service/upload`

**功能**: 允许商家上传自己的客服二维码

**实施**:
```typescript
static async uploadCustomerServiceQR(req: any, res: Response): Promise<void> {
  const merchantId = (req as any).merchant.id; // 从JWT获取

  // 处理文件上传
  // 上传到OSS
  // 更新merchants表的customer_service_qr_url字段
}
```

### 2. 客服二维码管理接口

**端点**: `PUT /api/merchant/customer-service`

**功能**: 更新客服二维码URL

### 3. 客服在线状态

**端点**: `GET /api/miniprogram/customer-service/:merchantId/status`

**功能**: 查询客服是否在线（需配合WebSocket）

---

## 相关文档

- ✅ [多租户架构设计文档](../plans/2026-02-16-multi-tenant-architecture-design.md)
- ✅ [Task #5实施总结](../tasks/task5-miniprogram-merchant-api-implementation.md)
- ✅ [Merchant模型](../../backend/src/database/models/Merchant.ts)
- ✅ [Task #2: Merchants表扩展](../migrations/006-task2-merchants-extension-summary.md)

---

## 总结

**任务9状态**: ✅ 代码实施完成 | ⏳ 待测试

**完成内容**:
1. ✅ 创建独立的客服控制器
2. ✅ 创建独立的客服路由
3. ✅ 注册路由到主应用
4. ✅ 完整的API文档

**文件清单**:
- ✅ `backend/src/controllers/miniprogramCustomerService.ts`
- ✅ `backend/src/routes/miniprogramCustomerService.ts`
- ✅ `backend/src/app.ts` (已更新路由注册)
- ✅ `docs/api/miniprogram-customer-service-api.md`

**建议**: 在部署到生产环境前，完成测试验证，考虑添加缓存机制优化性能。

---

**实施人员**: Claude Code
**实施日期**: 2026-02-16
**审查状态**: 待审查
**部署状态**: 待测试
