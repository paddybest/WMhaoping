# 多租户系统架构设计文档

**创建日期**: 2026-02-16
**版本**: 1.0
**作者**: Claude Code
**状态**: 设计阶段

## 📋 目录

- [1. 项目背景](#1-项目背景)
- [2. 系统架构](#2-系统架构)
- [3. 数据库设计](#3-数据库设计)
- [4. API设计](#4-api设计)
- [5. 小程序端改造](#5-小程序端改造)
- [6. 商家端改造](#6-商家端改造)
- [7. 用户交互流程](#7-用户交互流程)
- [8. 测试方案](#8-测试方案)
- [9. 部署注意事项](#9-部署注意事项)
- [10. 实施计划](#10-实施计划)

---

## 1. 项目背景

### 1.1 需求概述

好评宝系统需要改造为**多租户架构**，实现以下目标：

- 一个小程序实例服务多个商家
- 每个商家拥有独立的数据（商品、奖品、客服二维码等）
- 用户扫描不同商家的二维码，看到对应商家的专属内容
- 商家可管理自己的二维码并分发给用户

### 1.2 核心定制内容

每个商家可定制的内容包括：
- ✅ 商家名称和描述
- ✅ 商品及商品对应的标签、图片
- ✅ 奖品池（独立管理）
- ✅ 客服二维码（独立配置）
- ✅ 评价数据（独立统计）

### 1.3 技术方案

**二维码方案**: 普通二维码 + URL Scheme
- URL格式: `pages/index/index?merchant_id=123`
- 二维码自动生成：商家注册时系统自动生成

**架构类型**: 数据隔离型多租户
- 小程序界面统一
- 数据按商家完全隔离

---

## 2. 系统架构

### 2.1 三层架构

```
┌─────────────────────────────────────────────────────────┐
│                     小程序端 (用户)                       │
│  - 统一UI框架                                            │
│  - 动态加载商家数据                                      │
│  - merchant_id上下文管理                                 │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP API
┌─────────────────────────────────────────────────────────┐
│                   后端服务 (Node.js)                     │
│  - merchant_id自动过滤                                   │
│  - 权限验证 (JWT + merchant_id)                          │
│  - 二维码生成服务                                        │
└─────────────────────────────────────────────────────────┘
                          ↓ SQL Query
┌─────────────────────────────────────────────────────────┐
│                   数据库 (MySQL)                         │
│  - 所有业务表添加 merchant_id 字段                       │
│  - 数据完全隔离                                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 核心技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 二维码生成 | qrcode | 生成包含merchant_id的二维码图片 |
| 图片存储 | 阿里云 OSS | 二维码图片、客服二维码存储 |
| URL Scheme | 微信小程序 | pages/index/index?merchant_id=123 |
| 数据隔离 | MySQL外键 | merchant_id + 外键约束 |
| 权限控制 | JWT + 中间件 | 双重验证确保数据安全 |

---

## 3. 数据库设计

### 3.1 merchants表扩展

**新增字段**:

```sql
ALTER TABLE merchants ADD COLUMN name VARCHAR(255) COMMENT '商家显示名称';
ALTER TABLE merchants ADD COLUMN description TEXT COMMENT '商家描述';
ALTER TABLE merchants ADD COLUMN customer_service_qr_url VARCHAR(500) COMMENT '客服二维码URL';
ALTER TABLE merchants ADD COLUMN qr_code_url VARCHAR(500) COMMENT '商家专属二维码URL';

-- 添加索引
ALTER TABLE merchants ADD INDEX idx_name (name);
ALTER TABLE merchants ADD INDEX idx_is_active (is_active);
```

**完整表结构**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| username | VARCHAR(100) | 登录用户名（唯一） |
| password | VARCHAR(255) | 加密密码 |
| shop_name | VARCHAR(255) | 店铺名称 |
| name | VARCHAR(255) | **新增** 商家显示名称 |
| description | TEXT | **新增** 商家描述 |
| customer_service_qr_url | VARCHAR(500) | **新增** 客服二维码URL |
| qr_code_url | VARCHAR(500) | **新增** 商家二维码URL |
| is_active | BOOLEAN | 是否营业 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### 3.2 prizes表添加merchant_id

```sql
ALTER TABLE prizes ADD COLUMN merchant_id INT NOT NULL;
ALTER TABLE prizes ADD FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;
ALTER TABLE prizes ADD INDEX idx_merchant_id (merchant_id);
```

**改造后表结构**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| merchant_id | INT | **新增** 关联商家 |
| name | VARCHAR(255) | 奖品名称 |
| description | TEXT | 奖品描述 |
| probability | DECIMAL | 中奖概率 |
| stock | INT | 库存数量 |
| image_url | VARCHAR(500) | 奖品图片 |
| created_at | TIMESTAMP | 创建时间 |

### 3.3 lottery_codes表添加merchant_id

```sql
ALTER TABLE lottery_codes ADD COLUMN merchant_id INT NOT NULL;
ALTER TABLE lottery_codes ADD FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;
ALTER TABLE lottery_codes ADD INDEX idx_merchant_id (merchant_id);
```

**改造后表结构**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 |
| code | VARCHAR(50) | 抽奖码 |
| merchant_id | INT | **新增** 关联商家 |
| prize_id | INT | 关联奖品 |
| status | INT | 状态 (0-未使用, 1-已使用) |
| user_id | INT | 用户ID |
| created_at | TIMESTAMP | 创建时间 |
| claimed_at | TIMESTAMP | 核销时间 |

### 3.4 其他表改造

**product_categories** - ✅ 已有merchant_id
**product_items** - ✅ 已有merchant_id
**product_images** - ✅ 通过product_items关联

**reviews表** (如存在):

```sql
ALTER TABLE reviews ADD COLUMN merchant_id INT NOT NULL;
ALTER TABLE reviews ADD FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD INDEX idx_merchant_id (merchant_id);
```

### 3.5 数据迁移策略

**迁移脚本**: `backend/src/database/migrations/002-add-multi-tenant-support.ts`

```typescript
export async function up() {
  // 1. 添加所有merchant_id字段
  // 2. 为现有数据补充merchant_id（默认值或根据业务逻辑分配）
  // 3. 添加外键约束
  // 4. 创建索引
}

export async function down() {
  // 回滚：删除外键、删除字段
}
```

---

## 4. API设计

### 4.1 商家管理API（扩展）

#### 获取商家详情

```http
GET /api/miniprogram/merchant/:id
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "优质水果店",
    "description": "新鲜水果，当日配送",
    "customerServiceQrUrl": "https://oss.example.com/cs-qr/1.png",
    "qrCodeUrl": "https://oss.example.com/merchant-qr/1.png",
    "isActive": true
  }
}
```

#### 生成商家二维码

```http
POST /api/merchant/generate-qrcode
Authorization: Bearer {token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://oss.example.com/merchant-qr/1.png",
    "merchantId": 1
  }
}
```

### 4.2 小程序API（新增）

#### 获取商家奖品列表

```http
GET /api/miniprogram/prizes?merchantId=:id
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchantId": 1,
      "name": "满100减20券",
      "description": "全场通用",
      "probability": 0.1,
      "stock": 50,
      "imageUrl": "https://oss.example.com/prize1.png"
    }
  ]
}
```

#### 获取商家客服二维码

```http
GET /api/miniprogram/customer-service/:merchantId
```

**响应**:
```json
{
  "success": true,
  "data": {
    "qrCodeUrl": "https://oss.example.com/cs-qr/1.png"
  }
}
```

### 4.3 现有API改造

所有小程序API已支持 `merchantId` 查询参数：

- ✅ `/api/miniprogram/categories?merchantId=:id`
- ✅ `/api/miniprogram/products?merchantId=:id&categoryIds=:ids`
- ✅ `/api/miniprogram/products/batch?merchantId=:id&ids=:ids`

### 4.4 中间件增强

**新建**: `backend/src/middleware/merchantContext.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * 验证商家访问权限
 * 防止跨商家数据访问
 */
export function validateMerchantAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const merchantId = (req as any).merchant?.id; // 从JWT获取
  const targetMerchantId = req.query.merchantId || req.body.merchantId;

  // 如果是商家端请求，验证权限
  if (merchantId && targetMerchantId && merchantId !== targetMerchantId) {
    return res.status(403).json({
      success: false,
      error: '无权访问其他商家数据'
    });
  }

  next();
}
```

**使用示例**:

```typescript
import { validateMerchantAccess } from './middleware/merchantContext';

// 应用到需要权限验证的路由
router.patch('/products/:id',
  authenticateMerchant,
  validateMerchantAccess,
  updateProduct
);
```

---

## 5. 小程序端改造

### 5.1 启动流程改造

**文件**: `yonghuduan/miniprogram/app.js`

```javascript
// app.js
App({
  globalData: {
    selectedMerchantId: null,
    merchantInfo: null,
    // ... 其他全局数据
  },

  onLaunch(options) {
    console.log('小程序启动，参数:', options)

    // 1. 从URL参数或扫码场景获取merchant_id
    let merchantId = null

    // 方式1: URL Scheme参数
    if (options.query && options.query.merchant_id) {
      merchantId = parseInt(options.query.merchant_id)
    }
    // 方式2: 扫码场景
    else if (options.scene && options.scene.merchant_id) {
      merchantId = parseInt(options.scene.merchant_id)
    }
    // 方式3: 从缓存恢复（用户之前扫过码）
    else {
      merchantId = wx.getStorageSync('selectedMerchantId')
    }

    // 2. 验证merchant_id
    if (merchantId) {
      this.globalData.selectedMerchantId = merchantId
      wx.setStorageSync('selectedMerchantId', merchantId)

      // 加载商家信息
      this.loadMerchantInfo(merchantId)
    } else {
      // 无merchant_id，跳转到错误页面
      wx.redirectTo({
        url: '/pages/error/error?code=INVALID_QR'
      })
    }
  },

  // 加载商家信息
  async loadMerchantInfo(merchantId) {
    const { get } = require('./utils/api')

    try {
      const res = await get(`/miniprogram/merchant/${merchantId}`)

      if (res.success && res.data) {
        this.globalData.merchantInfo = res.data

        // 验证商家是否营业
        if (!res.data.isActive) {
          wx.redirectTo({
            url: '/pages/error/error?code=MERCHANT_CLOSED'
          })
        }
      } else {
        throw new Error('商家不存在')
      }
    } catch (error) {
      console.error('加载商家信息失败:', error)
      wx.redirectTo({
        url: '/pages/error/error?code=MERCHANT_NOT_FOUND'
      })
    }
  }
})
```

### 5.2 API请求封装改造

**文件**: `yonghuduan/miniprogram/utils/api.js`

```javascript
// utils/api.js
const app = getApp()

// 基础URL配置
const BASE_URL = 'http://localhost:5000/api'

/**
 * 构建URL，自动添加merchantId参数
 */
function buildUrl(path, params = {}) {
  const merchantId = app.globalData.selectedMerchantId

  // 自动添加merchantId（如果尚未提供）
  if (merchantId && !params.merchantId) {
    params.merchantId = merchantId
  }

  // 构建查询字符串
  const query = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&')

  return `${BASE_URL}${path}${query ? '?' + query : ''}`
}

/**
 * GET请求
 */
function get(path, params = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path, params),
      method: 'GET',
      success: res => resolve(res.data),
      fail: reject
    })
  })
}

/**
 * POST请求
 */
function post(path, data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(path),
      method: 'POST',
      data: data,
      header: {
        'content-type': 'application/json'
      },
      success: res => resolve(res.data),
      fail: reject
    })
  })
}

module.exports = {
  get,
  post
}
```

### 5.3 错误页面（新增）

**文件**: `yonghuduan/miniprogram/pages/error/error.wxml`

```xml
<view class="error-page">
  <image src="/images/error-icon.png" class="error-icon"></image>

  <view class="error-message" wx:if="{{code === 'INVALID_QR'}}">
    二维码无效
  </view>
  <view class="error-desc" wx:if="{{code === 'INVALID_QR'}}">
    请联系商家获取正确的二维码
  </view>

  <view class="error-message" wx:if="{{code === 'MERCHANT_NOT_FOUND'}}">
    商家不存在
  </view>
  <view class="error-desc" wx:if="{{code === 'MERCHANT_NOT_FOUND'}}">
    请确认二维码是否正确，或联系商家
  </view>

  <view class="error-message" wx:if="{{code === 'MERCHANT_CLOSED'}}">
    该商家暂时歇业
  </view>
  <view class="error-desc" wx:if="{{code === 'MERCHANT_CLOSED'}}">
    请稍后再试，或联系商家了解营业时间
  </view>

  <view class="error-message" wx:if="{{code === 'NETWORK_ERROR'}}">
    网络连接失败
  </view>
  <view class="error-desc" wx:if="{{code === 'NETWORK_ERROR'}}">
    请检查网络设置后重试
  </view>

  <button class="retry-btn" bindtap="onRetry" wx:if="{{canRetry}}">
    重新加载
  </button>
</view>
```

### 5.4 首页改造

**文件**: `yonghuduan/miniprogram/pages/index/index.js`

```javascript
// pages/index/index.js
const app = getApp()

Page({
  data: {
    merchantName: '',
    merchantDescription: '',
    // ... 其他数据
  },

  onLoad(options) {
    // 显示商家信息
    const merchantInfo = app.globalData.merchantInfo

    if (merchantInfo) {
      this.setData({
        merchantName: merchantInfo.name,
        merchantDescription: merchantInfo.description
      })
    }

    // 加载其他数据（分类、产品等）
    this.loadData()
  },

  async loadData() {
    const { get } = require('../../utils/api')

    try {
      // 加载分类（自动携带merchantId）
      const categories = await get('/miniprogram/categories')
      console.log('分类数据:', categories)

      // 加载奖品
      const prizes = await get('/miniprogram/prizes')
      console.log('奖品数据:', prizes)

    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }
})
```

### 5.5 客服页面改造

**文件**: `yonghuduan/miniprogram/pages/customer-service/index.js`

```javascript
// pages/customer-service/index.js
Page({
  data: {
    rewardCode: '',
    customerServiceQR: '',
    loading: false,
    error: ''
  },

  onLoad(options) {
    if (options.rewardCode) {
      this.setData({
        rewardCode: decodeURIComponent(options.rewardCode)
      })
    }

    // 获取客服二维码（使用当前商家的）
    this.getCustomerServiceQR()
  },

  async getCustomerServiceQR() {
    const app = getApp()
    const merchantId = app.globalData.selectedMerchantId
    const { get } = require('../../utils/api')

    if (!merchantId) {
      this.setData({
        error: '商家信息错误，请重新扫码',
        loading: false
      })
      return
    }

    try {
      // 调用API获取当前商家的客服二维码
      const res = await get(`/miniprogram/customer-service/${merchantId}`)

      if (res.success && res.data && res.data.qrCodeUrl) {
        this.setData({
          customerServiceQR: res.data.qrCodeUrl,
          loading: false
        })
      } else {
        throw new Error('客服二维码获取失败')
      }
    } catch (error) {
      console.error('获取客服二维码失败:', error)
      this.setData({
        error: '加载失败，请稍后再试',
        loading: false
      })
    }
  },

  // ... 其他方法保持不变
})
```

---

## 6. 商家端改造

### 6.1 商家注册流程改造

**文件**: `shangjiaduan/src/pages/Register.tsx`

```tsx
// 新增注册表单字段
interface RegisterFormData {
  username: string
  password: string
  shopName: string
  name: string              // 新增：商家显示名称
  description: string       // 新增：商家描述
  customerServiceQR: File   // 新增：客服二维码图片
}

// 注册成功后的处理
const handleRegisterSuccess = async (merchantId: number) => {
  // 1. 上传客服二维码
  if (formData.customerServiceQR) {
    await uploadCustomerServiceQR(merchantId, formData.customerServiceQR)
  }

  // 2. 自动生成商家二维码
  const qrResponse = await generateMerchantQRCode(merchantId)

  // 3. 显示成功页面
  showSuccessPage({
    merchantId,
    qrCodeUrl: qrResponse.data.qrCodeUrl,
    message: '注册成功！您的专属二维码已生成，请下载并张贴'
  })
}
```

### 6.2 二维码管理页面（新增）

**文件**: `shangjiaduan/src/pages/QRCodeManager.tsx`

```tsx
// QRCodeManager.tsx
import { useState, useEffect } from 'react'
import { downloadQRCode, regenerateQRCode } from '../services/qrcode'

export default function QRCodeManager() {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)

  // 下载二维码
  const handleDownload = async () => {
    setLoading(true)
    try {
      await downloadQRCode(qrCodeUrl)
      // 触发浏览器下载
    } finally {
      setLoading(false)
    }
  }

  // 重新生成二维码
  const handleRegenerate = async () => {
    if (!confirm('确定要重新生成二维码吗？旧二维码将失效。')) {
      return
    }

    setLoading(true)
    try {
      const response = await regenerateQRCode()
      setQrCodeUrl(response.data.qrCodeUrl)
      alert('二维码已重新生成')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="qrcode-manager">
      <h2>商家专属二维码</h2>

      <div className="qrcode-preview">
        <img src={qrCodeUrl} alt="商家二维码" />
      </div>

      <div className="qrcode-actions">
        <button onClick={handleDownload} disabled={loading}>
          下载二维码
        </button>
        <button onClick={handleRegenerate} disabled={loading}>
          重新生成
        </button>
      </div>

      <div className="qrcode-tips">
        <h3>使用说明</h3>
        <ul>
          <li>将此二维码打印张贴在店铺显眼位置</li>
          <li>用户扫码即可进入您的小程序店铺</li>
          <li>二维码永久有效，请妥善保管</li>
        </ul>
      </div>
    </div>
  )
}
```

### 6.3 客服信息管理

**文件**: `shangjiaduan/src/pages/CustomerServiceSettings.tsx`

```tsx
// CustomerServiceSettings.tsx
export default function CustomerServiceSettings() {
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  // 上传客服二维码
  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('qrCode', file)

      const response = await uploadCustomerServiceQR(formData)
      setQrCodeUrl(response.data.qrCodeUrl)
      alert('客服二维码上传成功')
    } catch (error) {
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="customer-service-settings">
      <h2>客服信息设置</h2>

      <div className="current-qr">
        <h3>当前客服二维码</h3>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="客服二维码" />
        ) : (
          <p>未设置</p>
        )}
      </div>

      <div className="upload-section">
        <h3>更换客服二维码</h3>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleUpload(e.target.files[0])}
          disabled={uploading}
        />
      </div>
    </div>
  )
}
```

### 6.4 奖品管理增强

**文件**: `shangjiaduan/src/pages/PrizeManager.tsx`

```tsx
// 在现有奖品管理页面添加提示
<div className="merchant-notice">
  <p>ℹ️ 您管理的奖品仅对本店用户可见</p>
  <p>ℹ️ 用户只能通过扫描您店铺的二维码参与抽奖</p>
</div>
```

---

## 7. 用户交互流程

### 7.1 正常流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 用户扫描商家二维码                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. 小程序启动，app.js读取merchant_id参数                     │
│    - 从URL参数获取: options.query.merchant_id               │
│    - 从扫码场景获取: options.scene.merchant_id              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. 验证merchant_id                                          │
│    - 有效 → 存储到globalData，进入首页                       │
│    - 无效 → 跳转错误页面                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. 首页加载商家数据                                          │
│    - GET /api/miniprogram/merchant/:id                      │
│    - 显示商家名称、Logo、描述                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. 加载业务数据                                              │
│    - GET /api/miniprogram/categories?merchantId=:id         │
│    - GET /api/miniprogram/products?merchantId=:id           │
│    - GET /api/miniprogram/prizes?merchantId=:id             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. 用户操作                                                  │
│    - 浏览商品、生成评价                                      │
│    - 参与抽奖、获取奖品                                      │
│    - 联系客服                                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. 点击"联系客服"                                            │
│    - GET /api/miniprogram/customer-service/:merchantId      │
│    - 显示对应商家的客服二维码                                 │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 错误处理场景

| 场景 | 错误码 | 显示内容 | 操作 |
|------|--------|----------|------|
| 无merchant_id | `INVALID_QR` | 二维码无效<br/>请联系商家获取正确的二维码 | 无按钮 |
| merchant_id不存在 | `MERCHANT_NOT_FOUND` | 商家不存在<br/>请确认二维码是否正确，或联系商家 | 无按钮 |
| 商家已打烊 | `MERCHANT_CLOSED` | 该商家暂时歇业<br/>请稍后再试，或联系商家了解营业时间 | 无按钮 |
| 网络错误 | `NETWORK_ERROR` | 网络连接失败<br/>请检查网络设置后重试 | "重新加载"按钮 |
| 无数据 | `NO_DATA` | 该商家暂未上架商品 | 返回按钮 |

### 7.3 边界情况处理

**情况1: 用户直接打开小程序（未扫码）**
- 处理：跳转到错误页面（INVALID_QR）
- 提示：请联系商家获取正确的二维码

**情况2: 二维码被篡改（merchant_id被修改）**
- 处理：后端API返回404
- 前端：显示"商家不存在"错误页

**情况3: 商家删除后用户仍使用旧二维码**
- 处理：后端API返回404
- 前端：显示"商家不存在"错误页

**情况4: 用户更换手机（无缓存）**
- 处理：重新扫码即可，merchant_id从URL参数获取

---

## 8. 测试方案

### 8.1 单元测试

**测试文件**: `backend/src/tests/multi-tenant.test.ts`

```typescript
describe('Multi-Tenant System', () => {
  describe('MerchantModel', () => {
    it('should create merchant with QR code URL', async () => {
      const merchant = await MerchantModel.create({
        username: 'test_merchant',
        password: 'password123',
        shopName: 'Test Shop',
        name: 'Test Merchant',
        description: 'Test Description'
      })
      expect(merchant.qrCodeUrl).toBeDefined()
    })
  })

  describe('QRCodeService', () => {
    it('should generate QR code with merchant_id', async () => {
      const qrUrl = await generateMerchantQRCode(123)
      expect(qrUrl).toContain('merchant_id=123')
    })
  })

  describe('MerchantContextMiddleware', () => {
    it('should block cross-merchant access', async () => {
      const req = {
        merchant: { id: 1 },
        query: { merchantId: 2 }
      }
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      }
      await validateMerchantAccess(req, res, jest.fn())
      expect(res.status).toHaveBeenCalledWith(403)
    })
  })
})
```

### 8.2 集成测试

```typescript
describe('Multi-Tenant API Integration', () => {
  it('should only return merchant A products when querying with merchant A ID', async () => {
    // 创建商家A和B
    const merchantA = await createMerchant({ name: 'Merchant A' })
    const merchantB = await createMerchant({ name: 'Merchant B' })

    // 为商家A创建产品
    await createProduct({ merchantId: merchantA.id, name: 'Product A' })
    // 为商家B创建产品
    await createProduct({ merchantId: merchantB.id, name: 'Product B' })

    // 查询商家A的产品
    const response = await request(app)
      .get('/api/miniprogram/products')
      .query({ merchantId: merchantA.id })

    expect(response.body.data).toHaveLength(1)
    expect(response.body.data[0].name).toBe('Product A')
  })
})
```

### 8.3 端到端测试流程

**测试环境**: 微信开发者工具

**测试用例1: 正常扫码流程**
```
步骤1: 创建测试商家A（ID=1）
步骤2: 上传商品、奖品、客服二维码
步骤3: 生成商家A二维码
步骤4: 模拟扫码（URL: pages/index/index?merchant_id=1）
步骤5: 验证小程序显示商家A的数据
步骤6: 验证客服二维码是商家A的
```

**测试用例2: 数据隔离验证**
```
步骤1: 创建测试商家A和商家B
步骤2: 为两个商家上传不同的商品
步骤3: 扫码进入商家A
步骤4: 验证只能看到商家A的商品
步骤5: 切换到商家B二维码
步骤6: 验证显示商家B的商品
```

**测试用例3: 错误场景测试**
```
场景1: 无merchant_id → 验证显示"二维码无效"
场景2: 不存在的merchant_id → 验证显示"商家不存在"
场景3: 已打烊商家 → 验证显示"该商家暂时歇业"
场景4: 商家无商品 → 验证显示"该商家暂未上架商品"
```

**测试用例4: 网络异常测试**
```
步骤1: 断开网络连接
步骤2: 扫码进入小程序
步骤3: 验证显示"网络连接失败"
步骤4: 恢复网络
步骤5: 点击"重新加载"
步骤6: 验证数据加载成功
```

---

## 9. 部署注意事项

### 9.1 数据库迁移

**步骤清单**:

1. ✅ 备份生产数据库
   ```bash
   mysqldump -u root -p haopingbao > backup_$(date +%Y%m%d).sql
   ```

2. ✅ 在测试环境执行迁移
   ```bash
   cd backend
   npm run migrate:test
   ```

3. ✅ 验证迁移结果
   ```sql
   -- 检查新字段是否存在
   DESC prizes;
   DESC lottery_codes;
   DESC merchants;

   -- 检查外键约束
   SELECT * FROM information_schema.KEY_COLUMN_USAGE
   WHERE TABLE_NAME = 'prizes' AND CONSTRAINT_NAME LIKE '%merchant%';
   ```

4. ✅ 为现有数据补充merchant_id
   ```sql
   -- 根据业务逻辑分配默认值
   UPDATE prizes SET merchant_id = 1 WHERE merchant_id IS NULL;
   UPDATE lottery_codes SET merchant_id = 1 WHERE merchant_id IS NULL;
   ```

5. ✅ 生产环境迁移
   ```bash
   # 选择低峰时段（如凌晨2-4点）
   npm run migrate:production
   ```

6. ✅ 验证生产数据
   ```sql
   -- 检查数据完整性
   SELECT COUNT(*) FROM prizes WHERE merchant_id IS NULL;
   -- 应该返回0
   ```

### 9.2 URL Scheme配置

**微信公众平台配置**:

1. 登录微信公众平台
2. 进入"开发" → "开发管理" → "开发设置"
3. 找到"扫普通链接二维码打开小程序"
4. 点击"添加"
5. 配置规则：
   - 二维码规则: `https://yourdomain.com/*`
   - 小程序功能页面: `pages/index/index`
   - 测试链接: `https://yourdomain.com/pages/index/index?merchant_id=123`
   - 点击"提交"

6. 等待审核通过（通常1-3个工作日）

### 9.3 OSS配置

**存储路径规范**:

```
oss-bucket/
├── qrcodes/
│   └── merchants/
│       └── {merchant_id}.png          # 商家专属二维码
├── customer-service/
│   └── {merchant_id}.png              # 商家客服二维码
├── products/
│   └── {product_id}/
│       └── {image_id}.jpg             # 商品图片
└── ...
```

**权限配置**:

```javascript
// backend/src/config/oss.ts
const ossConfig = {
  region: 'oss-cn-hangzhou',
  bucket: 'haopingbao',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  // 二维码图片公开读（用户扫码后需要显示）
  qrCodeBucket: 'haopingbao-qrcodes',
  // 客服二维码公开读
  customerServiceBucket: 'haopingbao-cs'
}
```

### 9.4 环境变量配置

**新增环境变量**: `backend/.env`

```env
# 二维码生成配置
QR_CODE_BASE_URL=https://yourdomain.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# OSS配置
OSS_ACCESS_KEY_ID=your_access_key
OSS_ACCESS_KEY_SECRET=your_secret_key
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=haopingbao

# 微信小程序配置
MINIPROGRAM_APP_ID=your_appid
MINIPROGRAM_APP_SECRET=your_appsecret
```

### 9.5 兼容性处理

**旧版本小程序降级方案**:

```javascript
// app.js
onLaunch(options) {
  const merchantId = options.query?.merchant_id

  if (!merchantId) {
    // 检查小程序版本
    const version = wx.getSystemInfoSync().SDKVersion

    if (compareVersion(version, '2.0.0') < 0) {
      // 旧版本，跳转到更新页面
      wx.redirectTo({
        url: '/pages/update/update'
      })
    } else {
      // 新版本，显示错误页
      wx.redirectTo({
        url: '/pages/error/error?code=INVALID_QR'
      })
    }
  }
}
```

### 9.6 回滚方案

**如果迁移失败**:

```bash
# 1. 立即停止服务
docker-compose down

# 2. 恢复数据库备份
mysql -u root -p haopingbao < backup_20260216.sql

# 3. 回滚代码版本
git revert <migration_commit_hash>

# 4. 重新启动服务
docker-compose up -d

# 5. 验证服务
curl http://localhost:5000/health
```

---

## 10. 实施计划

### 10.1 任务优先级

#### P0 - 核心功能（必须完成）

| 任务 | 文件 | 预估时间 | 依赖 |
|------|------|----------|------|
| 数据库迁移脚本 | `backend/src/database/migrations/002-add-multi-tenant-support.ts` | 1-2h | - |
| merchants表扩展 | Migration SQL | 0.5h | - |
| prizes表添加merchant_id | Migration SQL | 0.5h | - |
| lottery_codes表添加merchant_id | Migration SQL | 0.5h | - |
| 小程序启动流程改造 | `yonghuduan/miniprogram/app.js` | 1-2h | - |
| API自动携带merchant_id | `yonghuduan/miniprogram/utils/api.js` | 1h | - |
| 小程序API - 商家信息 | `backend/src/controllers/miniprogramMerchant.ts` | 1h | - |
| 小程序API - 奖品列表 | `backend/src/controllers/miniprogramPrize.ts` | 1h | - |
| 小程序API - 客服二维码 | `backend/src/controllers/customerService.ts` | 1h | - |
| 二维码生成服务 | `backend/src/services/qrcode.ts` | 1-2h | - |
| 二维码自动生成 | 商家注册流程 | 1h | 二维码生成服务 |
| 错误页面 | `yonghuduan/miniprogram/pages/error/` | 1h | - |

**P0总计**: 约11-15小时

#### P1 - 增强功能（建议完成）

| 任务 | 文件 | 预估时间 | 依赖 |
|------|------|----------|------|
| 商家端二维码管理页 | `shangjiaduan/src/pages/QRCodeManager.tsx` | 2-3h | - |
| 客服信息管理界面 | `shangjiaduan/src/pages/CustomerServiceSettings.tsx` | 2h | - |
| 中间件 - 权限验证 | `backend/src/middleware/merchantContext.ts` | 1h | - |
| 错误页面优化 | 样式和交互优化 | 1h | 错误页面 |

**P1总计**: 约6-7小时

#### P2 - 未来优化（可选）

| 任务 | 说明 | 预估时间 |
|------|------|----------|
| 扫码统计数据 | 记录扫码次数、独立用户数 | 3-4h |
| 二维码防伪造 | 加密merchant_id参数 | 2-3h |
| 多场景二维码 | 每个商家创建多个二维码 | 4-5h |

**P2总计**: 约9-12小时

### 10.2 实施时间表

**第1天（5-6小时）**:
- ✅ 数据库迁移脚本开发和测试
- ✅ merchants表扩展
- ✅ prizes、lottery_codes表添加merchant_id
- ✅ 二维码生成服务开发

**第2天（5-6小时）**:
- ✅ 小程序启动流程改造
- ✅ API请求封装改造
- ✅ 小程序API开发（商家信息、奖品、客服）
- ✅ 错误页面开发

**第3天（4-5小时）**:
- ✅ 商家端二维码管理页面
- ✅ 客服信息管理界面
- ✅ 集成测试

**第4天（2-3小时）**:
- ✅ 端到端测试
- ✅ Bug修复
- ✅ 文档完善

**总计**: 约16-20小时（2-3个工作日）

### 10.3 验收标准

#### 功能验收

- [ ] 商家注册后自动生成专属二维码
- [ ] 用户扫码后进入对应商家的小程序首页
- [ ] 小程序显示正确的商家名称和描述
- [ ] 商品分类和产品按商家正确过滤
- [ ] 奖品列表仅显示当前商家的奖品
- [ ] 客服二维码显示对应商家的二维码
- [ ] 商家可以在管理后台下载二维码
- [ ] 错误场景正确处理并显示友好提示

#### 性能验收

- [ ] API响应时间 < 500ms（95分位）
- [ ] 小程序首屏加载时间 < 2秒
- [ ] 数据库查询使用索引（无全表扫描）

#### 安全验收

- [ ] 商家A无法访问商家B的数据
- [ ] merchant_id参数验证生效
- [ ] SQL注入防护测试通过
- [ ] XSS防护测试通过

#### 兼容性验收

- [ ] 支持微信最新版本
- [ ] 支持iOS和Android
- [ ] 旧版本小程序有降级方案

---

## 附录

### A. 相关文档

- [产品数据集成计划](./2026-02-15-product-data-integration.md)
- [E2E测试指南](../task-15-e2e-test-guide.md)
- [后端API文档](../../backend/README.md)
- [小程序开发文档](../../yonghuduan/README.md)

### B. 参考资源

- [微信小程序URL Scheme文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-scheme.html)
- [qrcode npm包](https://www.npmjs.com/package/qrcode)
- [阿里云OSS文档](https://help.aliyun.com/product/31815.html)

### C. 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-02-16 | 1.0 | 初始版本 | Claude Code |

---

**文档状态**: ✅ 设计完成，待评审
**下一步**: 开始实施P0核心功能
