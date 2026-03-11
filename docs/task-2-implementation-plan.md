# 好评宝 - 任务2实施计划：多租户SaaS系统

<div align="center">

## 📋 项目概述

**任务目标：** 实现一个超级管理员网页端 + 50个不同商家的多租户SaaS系统

**当前状态：**
- ✅ 后端服务运行（http://localhost:8080）
- ✅ MySQL + Redis 运行中（Docker）
- ✅ 商家端运行（http://localhost:3000）
- ✅ 小程序端已配置云开发环境

---

## 🎯 核心需求分析

### 业务流程

```
┌─────────────────────────────────────┐
│                                │
│  50个商家 ───────┐       │
│ (各自管理后台)        │        │
│                        │        │
│ http://localhost:3000-50  │        │
│                      │        │
│                      │        │ 1个小程序
│                      │        │
│  用户扫码识别商家 │◄────────┤
│       ↓              │        │
│   加载该商家的   │        │
│      数据/内容      │        │
│                      │        │
└─────────────────────────┘        └──────┘
```

### 关键技术点

1. **商家识别** - 通过二维码或URL参数区分
2. **数据隔离** - 50个商家数据完全分离
3. **内容定制** - 不同商家可配置不同商品、评价模板
4. **数据同步** - 商家端和小程序端数据打通

---

## 📊 数据库设计

### 需要修改的表结构

#### 1. merchants 表（新增）
```sql
CREATE TABLE IF NOT EXISTS merchants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL COMMENT '商家名称',
  appid VARCHAR(255) COMMENT '小程序AppID',
  business_hours VARCHAR(255) COMMENT '营业时间',
  address VARCHAR(500) COMMENT '店铺地址',
  phone VARCHAR(50) COMMENT '联系电话',
  wechat_id VARCHAR(255) COMMENT '微信号',
  payment_info JSON COMMENT '支付配置',
  logo_url VARCHAR(500) COMMENT '店铺Logo',
  business_license VARCHAR(500) COMMENT '营业执照',
  status TINYINT DEFAULT 1 COMMENT '状态：1-启用 0-禁用',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status)
);
```

#### 2. products 表（修改）
```sql
-- 添加 merchant_id 字段
ALTER TABLE products ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;

-- 添加索引
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
```

#### 3. lottery_codes 表（修改）
```sql
-- 添加 merchant_id 字段
ALTER TABLE lottery_codes ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;

-- 添加索引
CREATE INDEX idx_lottery_codes_merchant_id ON lottery_codes(merchant_id);
```

#### 4. 其他表
- `users` - 添加 merchant_id 字段
- `evaluations` - 添加 merchant_id 字段
- `lottery_records` - 添加 merchant_id 字段

---

## 🔧 后端API设计

### 需要新增的接口

#### 1. 商家管理相关

```typescript
// backend/src/controllers/merchant.ts

// 商家列表
GET /api/merchants
  Response: { success: true, data: Merchant[] }

// 商家详情
GET /api/merchants/:id
  Response: { success: true, data: Merchant }

// 创建商家
POST /api/merchants
  Body: { name, appid, business_hours, ... }
  Response: { success: true, data: { id, ... } }

// 更新商家
PUT /api/merchants/:id
  Body: { name, phone, ... }
  Response: { success: true, data: {...} }

// 删除商家
DELETE /api/merchants/:id
  Response: { success: true, message: 'Deleted' }

// 商家登录
POST /api/merchants/:id/login
  Body: { password, ... }
  Response: { success: true, token, merchant: {...} }
```

#### 2. 商家ID中间件

```typescript
// backend/src/middleware/merchant.ts

export const merchantAuth = async (req, res, next) => {
  // 从查询参数或Header获取merchant_id
  const merchantId = req.query.merchant_id ||
                     req.headers['x-merchant-id'];

  if (!merchantId) {
    return res.status(400).json({
      success: false,
      message: '商家ID不能为空'
    });
  }

  // 查询商家是否存在且启用
  const merchant = await db.query(
    'SELECT id FROM merchants WHERE id = ? AND status = 1',
    [merchantId]
  );

  if (!merchant.length) {
    return res.status(404).json({
      success: false,
      message: '商家不存在或已禁用'
    });
  }

  // 将商家信息挂载到req对象
  req.merchant = merchant[0];
  next();
};
```

#### 3. 现有接口改造

```typescript
// 所有商品相关接口添加merchant_id过滤

// backend/src/controllers/product.ts
export const getProducts = async (req, res) => {
  const merchantId = req.merchant.id; // 从中间件获取

  const products = await db.query(
    'SELECT * FROM products WHERE merchant_id = ? ORDER BY created_at DESC',
    [merchantId]
  );

  res.json({ success: true, data: products });
};

// 创建商品时添加merchant_id
export const createProduct = async (req, res) => {
  const merchantId = req.merchant.id;
  const { name, tags } = req.body;

  const result = await db.query(
    'INSERT INTO products (name, tags, merchant_id) VALUES (?, ?, ?)',
    [name, JSON.stringify(tags), merchantId]
  );

  res.json({ success: true, data: { id: result.insertId } });
};
```

---

## 📱 小程序端改造

### 需要修改的文件

#### 1. utils/api.js 修改

```javascript
// yonghuduan/miniprogram/utils/api.js

const API_BASE_URL = 'http://localhost:8080/api'; // 改为后端地址

// 移除云函数调用
export async function getProducts(merchantId) {
  // 原来调用云函数
  // 改为调用后端API
  return wx.request({
    url: `${API_BASE_URL}/products?merchant_id=${merchantId}`,
    method: 'GET',
    header: {
      'x-merchant-id': merchantId // 传递商家ID
    }
  });
}

export async function createLotteryCode(merchantId, data) {
  return wx.request({
    url: `${API_BASE_URL}/lottery/create-code`,
    method: 'POST',
    header: { 'x-merchant-id': merchantId },
    data: { ...data, merchant_id: merchantId }
  });
}
```

#### 2. pages/index/index.js 改造

```javascript
// onLoad时获取商家ID
async onLoad(options) {
  // 从URL参数或二维码扫描获取
  const merchantId = options.merchant_id ||
                     wx.getStorageSync('merchant_id');

  if (!merchantId) {
    wx.showModal({
      title: '提示',
      content: '请先扫描商家二维码',
      showCancel: false
    });
    return;
  }

  // 存储商家ID
  wx.setStorageSync('merchant_id', merchantId);

  // 加载该商家的商品数据
  this.loadCategories(merchantId);
}
```

---

## 🖥️ 商家管理后台（需要新增）

### 需要创建的页面

```
shangjiaduan/src/pages/
├── Merchants.tsx         # 商家列表
├── MerchantDetail.tsx    # 商家详情
├── MerchantCreate.tsx      # 创建商家
├── MerchantProducts.tsx   # 商家的商品管理
└── MerchantQRCode.tsx      # 二维码生成器
```

### 路由配置

```typescript
// shangjiaduan/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/merchants" element={<Merchants />} />
      <Route path="/merchants/:id" element={<MerchantDetail />} />
      <Route path="/merchants/create" element={<MerchantCreate />} />
      <Route path="/merchants/:id/products" element={<MerchantProducts />} />
      <Route path="/merchants/:id/qr-code" element={<MerchantQRCode />} />
    </Routes>
  );
}
```

---

## ✅ 实施步骤

### 第一步：数据库改造（1小时）

**任务：**
1. ✅ 创建merchants表
2. ✅ 为products表添加merchant_id字段和索引
3. ✅ 为lottery_codes表添加merchant_id字段和索引
4. ✅ 为users表添加merchant_id字段
5. ✅ 为evaluations表添加merchant_id字段

**SQL脚本：**
```sql
-- backend/src/database/schema.sql

-- 创建商家表
CREATE TABLE IF NOT EXISTS merchants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  appid VARCHAR(255) NOT NULL,
  status TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 为现有表添加merchant_id
ALTER TABLE products ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE users ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE lottery_codes ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE lottery_records ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;
ALTER TABLE evaluations ADD COLUMN merchant_id INT NOT NULL DEFAULT 1 AFTER id;

-- 创建索引
CREATE INDEX idx_products_merchant_id ON products(merchant_id);
CREATE INDEX idx_lottery_codes_merchant_id ON lottery_codes(merchant_id);
CREATE INDEX idx_users_merchant_id ON users(merchant_id);
CREATE INDEX idx_evaluations_merchant_id ON evaluations(merchant_id);
```

### 第二步：后端API开发（3小时）

**任务：**
1. ✅ 创建merchant.ts控制器
2. ✅ 创建merchantAuth中间件
3. ✅ 添加商家管理相关路由
4. ✅ 改造现有接口添加merchant_id过滤
5. ✅ 测试商家相关API

**新增接口：**
- GET /api/merchants - 获取商家列表
- GET /api/merchants/:id - 获取商家详情
- POST /api/merchants - 创建商家
- PUT /api/merchants/:id - 更新商家
- DELETE /api/merchants/:id - 删除商家
- POST /api/merchants/:id/login - 商家登录

**测试命令：**
```bash
cd backend
npm test
```

### 第三步：小程序端改造（2小时）

**任务：**
1. ✅ 修改utils/api.js指向后端API
2. ✅ 修改pages/index/index.js添加商家ID处理
3. ✅ 所有API调用添加x-merchant-id header
4. ✅ 测试商家识别功能

**修改文件：**
- `yonghuduan/miniprogram/utils/api.js`
- `yonghuduan/miniprogram/pages/index/index.js`
- `yonghuduan/miniprogram/pages/lottery/index.js`
- `yonghuduan/miniprogram/pages/result/index.js`

### 第四步：商家端页面开发（5小时）

**任务：**
1. ✅ 创建商家列表页面
2. ✅ 创建商家详情页面
3. ✅ 创建商家创建页面
4. ✅ 创建商家商品管理页面
5. ✅ 创建二维码生成器页面
6. ✅ 添加路由配置
7. ✅ 测试完整流程

**新增页面：**
- `src/pages/Merchants/index.tsx`
- `src/pages/MerchantDetail/index.tsx`
- `src/pages/MerchantCreate/index.tsx`
- `src/pages/MerchantProducts/index.tsx`
- `src/pages/MerchantQRCode/index.tsx`

### 第五步：集成测试（2小时）

**任务：**
1. ✅ 启动所有服务（后端+商家端）
2. ✅ 创建测试商家账号
3. ✅ 测试用户扫码进入流程
4. ✅ 测试商家管理商品
5. ✅ 测试数据隔离
6. ✅ 测试完整业务流程

---

## 🧪 测试验证

### 功能测试清单

| 功能 | 测试点 | 预期结果 |
|------|---------|----------|
| 商家注册 | POST /api/merchants | ✅ 返回商家对象 |
| 商家登录 | POST /api/merchants/:id/login | ✅ 返回token |
| 商品列表 | GET /api/products?merchant_id=X | ✅ 返回该商家商品 |
| 创建商品 | POST /api/products | ✅ 包含merchant_id |
| 小程序识别 | URL参数?merchant_id=X | ✅ 正确获取并加载 |
| 数据隔离 | 不同商家数据独立 | ✅ 互不影响 |

### 测试命令

```bash
# 后端测试
cd backend
npm run test

# 商家端测试
cd shangjiaduan
npm run dev

# 小程序测试
# 在微信开发者工具中测试商家识别功能
```

---

## 📝 时间估算

| 任务 | 估时 | 累计 |
|------|------|------|
| 第一步：数据库改造 | 1小时 | 1小时 |
| 第二步：后端API | 3小时 | 4小时 |
| 第三步：小程序改造 | 2小时 | 6小时 |
| 第四步：商家端页面 | 5小时 | 11小时 |
| 第五步：集成测试 | 2小时 | 13小时 |

**总计：** 13小时（约2个工作日）

---

## 🚨 风险评估

| 风险类型 | 描述 | 缓解措施 |
|---------|------|----------|
| 数据迁移 | 修改现有表结构 | 使用事务确保数据一致性 |
| API兼容 | merchant_id字段可能为空 | 添加默认值和验证 |
| 业务逻辑 | 商家隔离逻辑复杂 | 充分测试各种场景 |
| 性能 | 多商家查询优化 | 添加缓存和索引 |
| 安全 | 商家认证和权限 | JWT + 中间件验证 |

---

## 📚 部署建议

### 开发环境

- 数据库：Docker MySQL（已运行）
- 缓存：Docker Redis（已运行）
- 后端：PM2 或 Docker Compose
- 商家端：Vite 开发服务器
- 小程序：微信云开发

### 生产环境

- 后端：云服务器 + 云数据库
- 商家端：Nginx + Docker
- 小程序：微信云开发生产环境
- CDN：云存储CDN加速静态资源
- 监控：Sentry错误追踪

---

## 🎯 成功标准

- [ ] 所有API接口测试通过
- [ ] 商家可以独立管理自己的商品
- [ ] 小程序正确识别商家
- [ ] 数据完全隔离（不同商家互不影响）
- [ ] 完整业务流程测试通过
- [ ] 性能达标（响应时间<500ms）
- [ ] 代码已提交到Git

---

<div align="center">

**文档版本：** v1.0
**创建日期：** 2026-02-15
**最后更新：** @Claude

</div>
