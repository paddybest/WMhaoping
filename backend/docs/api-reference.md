# API 参考文档

## 目录

1. [基础信息](#基础信息)
2. [认证相关](#认证相关)
3. [商家二维码管理](#商家二维码管理)
4. [小程序商家API](#小程序商家api)
5. [产品管理](#产品管理)
6. [奖品管理](#奖品管理)
7. [错误码说明](#错误码说明)
8. [请求示例](#请求示例)

---

## 基础信息

### Base URL
```
开发环境: http://localhost:5000/api
生产环境: https://yourdomain.com/api
```

### 认证方式
- **商家端API**: Bearer Token (JWT)
- **小程序API**: 公开API，但需要 `merchantId` 参数

### Content-Type
```
application/json
```

### 字符编码
```
UTF-8
```

### 响应格式

#### 成功响应
```json
{
  "success": true,
  "data": {
    // 业务数据
  }
}
```

#### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE",
  "message": "详细错误信息（仅开发环境）"
}
```

---

## 认证相关

### 商家注册

**端点**: `POST /merchant/auth/register`

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "merchant1",
  "password": "SecurePass123!",
  "shop_name": "好品优选"
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "注册成功",
  "data": {
    "id": 2,
    "username": "merchant1",
    "shop_name": "好品优选",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "用户名已存在"
}
```

### 商家登录

**端点**: `POST /merchant/auth/login`

**请求体**:
```json
{
  "username": "merchant1",
  "password": "SecurePass123!"
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "merchant1",
    "shop_name": "好品优选",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**使用Token**:
在后续请求的请求头中包含:
```
Authorization: Bearer {token}
```

---

## 商家二维码管理

### 获取商家二维码

**端点**: `GET /merchant/qrcode`

**认证**: 需要商家JWT token

**请求头**:
```
Authorization: Bearer {jwt_token}
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "merchant_id": 2,
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "qr_url": "https://yourdomain.com/pages/index/index?merchant_id=2&signature=abc123def456:1676543210",
    "generated_at": "2026-02-16T10:00:00Z"
  }
}
```

### 重新生成二维码

**端点**: `POST /merchant/qrcode/generate`

**认证**: 需要商家JWT token

**请求头**:
```
Authorization: Bearer {jwt_token}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "二维码重新生成成功",
  "data": {
    "qr_code_url": "https://cdn.example.com/qr/merchant_2_new.png",
    "qr_url": "https://yourdomain.com/pages/index/index?merchant_id=2&signature=xyz789:1676543321"
  }
}
```

### 获取扫码统计

**端点**: `GET /merchant/scan`

**认证**: 需要商家JWT token

**查询参数**:
- `startDate` (可选): 开始日期，格式 YYYY-MM-DD
- `endDate` (可选): 结束日期，格式 YYYY-MM-DD

**请求头**:
```
Authorization: Bearer {jwt_token}
```

**示例请求**:
```
GET /api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "total_scans": 1523,
    "unique_users": 845,
    "today_scans": 67,
    "scans_by_date": [
      {
        "date": "2026-02-16",
        "total_scans": 67,
        "unique_users": 45
      },
      {
        "date": "2026-02-15",
        "total_scans": 89,
        "unique_users": 52
      }
    ]
  }
}
```

---

## 小程序商家API

### 获取商家信息

**端点**: `GET /miniprogram/merchant/:id`

**查询参数**:
- `signature` (可选): 二维码签名，用于验证

**示例请求**:
```
GET /api/miniprogram/merchant/2?signature=abc123def456:1676543210
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "好品优选",
    "description": "优质商品，优惠多多",
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "is_active": true,
    "created_at": "2026-02-01T00:00:00Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "商家不存在",
  "code": "MERCHANT_NOT_FOUND"
}
```

### 获取商家奖品列表

**端点**: `GET /miniprogram/prizes`

**查询参数**:
- `merchantId` (必需): 商家ID

**示例请求**:
```
GET /api/miniprogram/prizes?merchantId=2
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 2,
      "name": "一等奖",
      "description": "iPhone 15 Pro",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://cdn.example.com/prize1.jpg",
      "created_at": "2026-02-16T10:00:00Z"
    },
    {
      "id": 2,
      "merchant_id": 2,
      "name": "二等奖",
      "description": "iPad Air",
      "probability": 0.05,
      "stock": 5,
      "image_url": "https://cdn.example.com/prize2.jpg",
      "created_at": "2026-02-16T10:00:00Z"
    }
  ]
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "商家无相关数据",
  "code": "NO_DATA"
}
```

### 获取客服二维码

**端点**: `GET /miniprogram/customer-service/:merchantId`

**路径参数**:
- `merchantId` (必需): 商家ID

**示例请求**:
```
GET /api/miniprogram/customer-service/2
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": {
    "merchant_id": 2,
    "customer_service_qr_url": "https://cdn.example.com/cs/merchant_2.png"
  }
}
```

### 记录扫码事件

**端点**: `POST /miniprogram/scan`

**请求体**:
```json
{
  "merchant_id": 2,
  "user_openid": "oxxxxxxxx",
  "qr_code_url": "https://yourdomain.com/pages/index/index?merchant_id=2&signature=abc123",
  "ip_address": "192.168.1.1"
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "扫码记录成功"
}
```

---

## 产品管理

### 获取产品分类列表

**端点**: `GET /merchant/categories`

**认证**: 需要商家JWT token

**请求头**:
```
Authorization: Bearer {jwt_token}
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 2,
      "name": "电子产品",
      "parent_id": null,
      "level": 1,
      "path": "/1",
      "children": [
        {
          "id": 3,
          "name": "手机",
          "parent_id": 1,
          "level": 2,
          "path": "/1/3"
        }
      ]
    }
  ]
}
```

### 创建产品分类

**端点**: `POST /merchant/categories`

**认证**: 需要商家JWT token

**请求体**:
```json
{
  "name": "手机",
  "parent_id": 1
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "分类创建成功",
  "data": {
    "id": 3,
    "merchant_id": 2,
    "name": "手机",
    "parent_id": 1,
    "level": 2,
    "path": "/1/3"
  }
}
```

### 更新产品分类

**端点**: `PUT /merchant/categories/:id`

**认证**: 需要商家JWT token

**路径参数**:
- `id`: 分类ID

**请求体**:
```json
{
  "name": "智能手机"
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "分类更新成功",
  "data": {
    "id": 3,
    "name": "智能手机"
  }
}
```

### 删除产品分类

**端点**: `DELETE /merchant/categories/:id`

**认证**: 需要商家JWT token

**路径参数**:
- `id`: 分类ID

**响应** (200 OK):
```json
{
  "success": true,
  "message": "分类删除成功"
}
```

### 获取产品列表

**端点**: `GET /merchant/products`

**认证**: 需要商家JWT token

**查询参数**:
- `categoryId` (可选): 分类ID
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认10

**示例请求**:
```
GET /api/merchant/products?categoryId=1&page=1&limit=10
```

**响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 2,
      "category_id": 1,
      "name": "iPhone 15 Pro",
      "description": "最新款苹果手机",
      "price": 7999,
      "stock": 50,
      "is_active": true,
      "images": [
        {
          "id": 1,
          "product_id": 1,
          "image_url": "https://cdn.example.com/product1.jpg",
          "is_primary": true
        }
      ]
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```

### 创建产品

**端点**: `POST /merchant/products`

**认证**: 需要商家JWT token

**请求体**:
```json
{
  "category_id": 1,
  "name": "iPhone 15 Pro",
  "description": "最新款苹果手机",
  "price": 7999,
  "stock": 50,
  "is_active": true
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "产品创建成功",
  "data": {
    "id": 1,
    "merchant_id": 2,
    "category_id": 1,
    "name": "iPhone 15 Pro",
    "description": "最新款苹果手机",
    "price": 7999,
    "stock": 50,
    "is_active": true
  }
}
```

### 上传产品图片

**端点**: `POST /merchant/products/:id/images`

**认证**: 需要商家JWT token

**请求类型**: `multipart/form-data`

**表单数据**:
- `image`: 图片文件
- `is_primary` (可选): 是否为主图，默认false

**响应** (200 OK):
```json
{
  "success": true,
  "message": "图片上传成功",
  "data": {
    "id": 1,
    "product_id": 1,
    "image_url": "https://cdn.example.com/product1.jpg",
    "is_primary": true
  }
}
```

---

## 奖品管理

### 获取奖品列表

**端点**: `GET /merchant/prizes`

**认证**: 需要商家JWT token

**查询参数**:
- `page` (可选): 页码，默认1
- `limit` (可选): 每页数量，默认10

**响应** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "merchant_id": 2,
      "name": "一等奖",
      "description": "iPhone 15 Pro",
      "probability": 0.01,
      "stock": 1,
      "image_url": "https://cdn.example.com/prize1.jpg",
      "created_at": "2026-02-16T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "pages": 1
  }
}
```

### 创建奖品

**端点**: `POST /merchant/prizes`

**认证**: 需要商家JWT token

**请求体**:
```json
{
  "name": "一等奖",
  "description": "iPhone 15 Pro",
  "probability": 0.01,
  "stock": 1,
  "image_url": "https://cdn.example.com/prize1.jpg"
}
```

**验证规则**:
- `probability` 必须在 0 到 1 之间
- `stock` 必须大于等于 0
- `name` 不能为空
- 所有商家的 `probability` 总和不能超过 1

**响应** (200 OK):
```json
{
  "success": true,
  "message": "奖品创建成功",
  "data": {
    "id": 1,
    "merchant_id": 2,
    "name": "一等奖",
    "description": "iPhone 15 Pro",
    "probability": 0.01,
    "stock": 1,
    "image_url": "https://cdn.example.com/prize1.jpg",
    "created_at": "2026-02-16T10:00:00Z"
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "概率总和不能超过1",
  "code": "VALIDATION_ERROR"
}
```

### 更新奖品

**端点**: `PUT /merchant/prizes/:id`

**认证**: 需要商家JWT token

**路径参数**:
- `id`: 奖品ID

**请求体**:
```json
{
  "name": "特等奖",
  "description": "iPhone 15 Pro Max",
  "probability": 0.005,
  "stock": 1
}
```

**响应** (200 OK):
```json
{
  "success": true,
  "message": "奖品更新成功",
  "data": {
    "id": 1,
    "name": "特等奖",
    "description": "iPhone 15 Pro Max",
    "probability": 0.005,
    "stock": 1
  }
}
```

### 删除奖品

**端点**: `DELETE /merchant/prizes/:id`

**认证**: 需要商家JWT token

**路径参数**:
- `id`: 奖品ID

**响应** (200 OK):
```json
{
  "success": true,
  "message": "奖品删除成功"
}
```

---

## 错误码说明

### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（缺少或无效token） |
| 403 | 禁止访问（权限不足） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 业务错误码

| 错误码 | HTTP状态码 | 说明 | 解决方案 |
|--------|-----------|------|----------|
| `INVALID_QR` | 403 | 二维码签名无效或已过期 | 重新生成二维码或检查签名配置 |
| `MERCHANT_NOT_FOUND` | 404 | 商家不存在 | 检查merchant_id是否正确 |
| `MERCHANT_CLOSED` | 400 | 商家未营业 | 联系商家或等待营业 |
| `ACCESS_DENIED` | 403 | 跨商家访问被拒绝 | 检查登录账号是否有权限访问该资源 |
| `NO_DATA` | 404 | 商家无相关数据 | 确认商家是否有数据或参数是否正确 |
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 | 检查请求参数格式和内容 |
| `UNAUTHORIZED` | 401 | 未授权 | 检查token是否存在或是否过期 |
| `NOT_FOUND` | 404 | 资源不存在 | 检查资源ID是否正确 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 | 联系技术支持 |

### 错误响应示例

```json
{
  "success": false,
  "error": "二维码签名无效或已过期",
  "code": "INVALID_QR",
  "message": "Invalid QR code signature or expired"
}
```

---

## 请求示例

### curl 示例

#### 1. 商家登录获取token
```bash
curl -X POST http://localhost:5000/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "merchant1",
    "password": "SecurePass123!"
  }'
```

#### 2. 使用token获取二维码
```bash
curl http://localhost:5000/api/merchant/qrcode \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 3. 创建产品
```bash
curl -X POST http://localhost:5000/api/merchant/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "name": "iPhone 15 Pro",
    "description": "最新款苹果手机",
    "price": 7999,
    "stock": 50
  }'
```

#### 4. 小程序获取商家信息
```bash
curl http://localhost:5000/api/miniprogram/merchant/2?signature=abc123
```

#### 5. 小程序获取奖品列表
```bash
curl "http://localhost:5000/api/miniprogram/prizes?merchantId=2"
```

### JavaScript (fetch) 示例

#### 1. 商家登录获取token
```javascript
const loginResponse = await fetch('http://localhost:5000/api/merchant/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'merchant1',
    password: 'SecurePass123!'
  })
});

const { token } = await loginResponse.json();
console.log('Token:', token);
```

#### 2. 使用token获取二维码
```javascript
const qrResponse = await fetch('http://localhost:5000/api/merchant/qrcode', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const qrData = await qrResponse.json();
console.log('QR Code URL:', qrData.data.qr_code_url);
```

#### 3. 创建产品
```javascript
const productResponse = await fetch('http://localhost:5000/api/merchant/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    category_id: 1,
    name: 'iPhone 15 Pro',
    description: '最新款苹果手机',
    price: 7999,
    stock: 50
  })
});

const product = await productResponse.json();
console.log('Product created:', product.data);
```

#### 4. 小程序获取商家信息
```javascript
const merchantResponse = await fetch(
  'http://localhost:5000/api/miniprogram/merchant/2?signature=abc123'
);

const merchant = await merchantResponse.json();
console.log('Merchant info:', merchant.data);
```

#### 5. 小程序获取奖品列表
```javascript
const prizesResponse = await fetch(
  'http://localhost:5000/api/miniprogram/prizes?merchantId=2'
);

const prizes = await prizesResponse.json();
console.log('Prizes:', prizes.data);
```

### 小程序微信请求示例

#### 使用 wx.request
```javascript
// 获取商家信息
wx.request({
  url: 'https://yourdomain.com/api/miniprogram/merchant/2',
  method: 'GET',
  data: {
    signature: 'abc123def456:1676543210'
  },
  success: (res) => {
    console.log('商家信息:', res.data.data);
  },
  fail: (err) => {
    console.error('请求失败:', err);
  }
});

// 获取奖品列表
wx.request({
  url: 'https://yourdomain.com/api/miniprogram/prizes',
  method: 'GET',
  data: {
    merchantId: 2
  },
  success: (res) => {
    console.log('奖品列表:', res.data.data);
  }
});
```

#### 记录扫码事件
```javascript
wx.request({
  url: 'https://yourdomain.com/api/miniprogram/scan',
  method: 'POST',
  data: {
    merchant_id: 2,
    user_openid: 'oxxxxxxxx',
    qr_code_url: 'https://yourdomain.com/pages/index/index?merchant_id=2&signature=abc123'
  },
  success: (res) => {
    console.log('扫码记录成功');
  }
});
```

---

## 最佳实践

### 1. Token管理
- 将token存储在安全的地方（小程序建议使用wx.setStorage）
- 每次请求都在请求头中携带token
- token过期后自动重新登录

### 2. 错误处理
- 始终检查 `success` 字段
- 根据错误码进行针对性处理
- 对用户友好的错误提示

### 3. 分页处理
- 使用分页参数控制数据量
- 根据响应中的 `pagination` 信息控制加载更多

### 4. 数据验证
- 客户端也要进行基本验证
- 检查必填字段
- 验证数据格式

### 5. 性能优化
- 合理使用缓存
- 避免重复请求
- 使用分页减少数据传输量

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
**维护者**: Haopingbao Team
