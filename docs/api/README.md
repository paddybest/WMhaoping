# 项目 API 接口文档

## 接口概览

| 客户端 | 前缀 | 说明 |
|--------|------|------|
| 小程序端 | `/api/miniprogram/*` | 公开接口，面向用户 |
| 商家端 | `/api/merchant/*` | 需要商家认证 |
| 公共接口 | `/api/*` | 公开或用户认证接口 |

---

## 一、小程序端接口 (Mini Program API)

### 1. 商户相关 `/api/miniprogram/merchants/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/miniprogram/merchants/validate` | 验证二维码签名 |
| GET | `/api/miniprogram/merchants` | 获取所有活跃商户列表 |
| GET | `/api/miniprogram/merchants/:id` | 根据ID获取商户信息 |
| GET | `/api/miniprogram/merchants/customer-service/:merchantId` | 获取商户客服二维码 |

### 2. 产品相关 `/api/miniprogram/products/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/miniprogram/products/categories` | 获取产品分类列表 |
| GET | `/api/miniprogram/products` | 获取产品列表 |
| GET | `/api/miniprogram/products/batch` | 批量获取产品 |

> **说明**: 产品接口返回数据中包含 `tags` 字段（标签数组），无需单独查询标签接口

### 3. 奖品相关 `/api/miniprogram/prizes/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/miniprogram/prizes` | 获取奖品列表 |
| GET | `/api/miniprogram/prizes/:id` | 获取指定奖品 |

### 4. 客服相关 `/api/miniprogram/customer-service/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/miniprogram/customer-service/:merchantId` | 获取商户客服二维码 |

> **注意**: 客服二维码也可通过 `/api/miniprogram/merchants/customer-service/:merchantId` 获取（功能相同）

### 5. 抽奖相关 `/api/lottery/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/lottery/test` | 抽奖服务健康检查 |
| GET | `/api/lottery/prizes` | 获取奖品列表(用户) |
| GET | `/api/lottery/records` | 获取抽奖记录(商家) |
| POST | `/api/lottery/draw` | 执行抽奖 |
| POST | `/api/lottery/generate-code` | 生成奖励码(替代云函数) |

### 6. 评价相关 `/api/reviews/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/reviews/generate` | 生成评价(用户) |
| GET | `/api/reviews/my-reviews` | 获取我的评价(用户) |
| GET | `/api/reviews/merchant/all` | 获取商家所有评价(商家) |

### 7. 登录认证 `/api/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/wechat-login` | 微信登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |

---

## 二、商家端接口 (Merchant API)

### 1. 商家认证 `/api/merchant/auth/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/merchant/auth/login` | 商家登录 |
| POST | `/api/merchant/auth/register` | 商家注册 |
| GET | `/api/merchant/auth/me` | 获取当前商家信息 |
| GET | `/api/merchant/auth/profile` | 获取商家资料 |
| PUT | `/api/merchant/auth/profile` | 更新商家资料 |

### 2. 产品分类 `/api/merchant/categories` (productCategory)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/categories` | 获取分类树 |
| POST | `/api/merchant/categories` | 创建分类 |
| PUT | `/api/merchant/categories/:id` | 更新分类 |
| DELETE | `/api/merchant/categories/:id` | 删除分类 |

### 3. 产品管理 `/api/merchant/products/*` (productItem)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/products` | 按分类获取产品列表 |
| GET | `/api/merchant/products/:id` | 获取产品详情 |
| POST | `/api/merchant/products` | 创建产品 |
| POST | `/api/merchant/products/batch` | 批量创建产品 |
| PUT | `/api/merchant/products/:id` | 更新产品 |
| DELETE | `/api/merchant/products/:id` | 删除产品 |

### 4. 产品图片 `/api/merchant/products/:id/images/*` (productImage)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/merchant/products/:id/images` | 上传产品图片 |
| GET | `/api/merchant/products/:id/images` | 获取产品图片列表 |
| DELETE | `/api/merchant/products/:id/images/:imageId` | 删除产品图片 |
| PUT | `/api/merchant/products/:id/images/order` | 更新图片顺序 |

### 5. 商家小程序二维码 `/api/merchant/qrcode/*` (merchantQRCode)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/qrcode` | 获取商家二维码信息 |
| POST | `/api/merchant/qrcode/generate` | 生成商家小程序二维码 |
| POST | `/api/merchant/qrcode/upload` | 上传自定义二维码 |

### 6. 标签管理 `/api/merchant/tags/*` (tags)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/tags` | 获取所有标签 |
| GET | `/api/merchant/tags/by-category/:categoryId` | 按分类获取标签 |
| GET | `/api/merchant/tags/stats` | 获取标签统计 |
| POST | `/api/merchant/tags` | 创建标签 |
| POST | `/api/merchant/tags/rename` | 重命名标签 |
| DELETE | `/api/merchant/tags` | 删除标签 |

### 7. 奖品管理 `/api/merchant/prizes/*` (merchantPrize)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/prizes` | 获取奖品列表 |
| GET | `/api/merchant/prizes/:id` | 获取奖品详情 |
| POST | `/api/merchant/prizes` | 创建奖品 |
| PATCH | `/api/merchant/prizes/:id` | 更新奖品 |
| DELETE | `/api/merchant/prizes/:id` | 删除奖品 |
| POST | `/api/merchant/prizes/:id/increment` | 增加奖品库存 |

### 8. 扫码统计 `/api/merchant/scan/*` (qrCodeScan)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/merchant/scan/record` | 记录扫码事件 |
| GET | `/api/merchant/scan/statistics` | 获取扫码统计 |
| GET | `/api/merchant/scan/trends` | 获取扫码趋势 |
| GET | `/api/merchant/scan/hot-hours` | 获取热门时段 |
| GET | `/api/merchant/scan/history` | 获取扫码历史 |
| GET | `/api/merchant/scan/export` | 导出扫码数据(CSV) |
| DELETE | `/api/merchant/scan/cleanup` | 清理旧扫码数据 |

### 9. 数据统计 `/api/merchant/stats/*` (stats)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchant/stats/overview` | 获取商家概览统计数据 |
| GET | `/api/merchant/stats/trends` | 获取评价趋势数据 |

---

## 三、公共接口

### 产品 `/api/products/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/products` | 获取所有产品(公开) |
| GET | `/api/products/:id` | 获取产品详情(公开) |
| POST | `/api/products` | 创建产品(商家) |
| PUT | `/api/products/:id` | 更新产品(商家) |
| DELETE | `/api/products/:id` | 删除产品(商家) |

---

## 四、认证方式

### 商家端认证
- 使用 JWT Token
- 请求头: `Authorization: Bearer <token>`

### 小程序端认证
- 微信登录获取 openid
- 使用 session 或 JWT

---

## 五、数据流

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   小程序端      │────▶│   后端 API      │────▶│    MySQL        │
│ (用户访问)      │     │   (8080)       │     │   (Docker)      │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                │ API
                                ▼
┌─────────────────┐     ┌────────┴────────┐
│   商家端        │────▶│   后端 API      │
│  (Vite 3001)   │     │   (8080)       │
└─────────────────┘     └─────────────────┘
```

---

## 六、商家端与小程序端接口对应关系

### 数据对应表

| 功能模块 | 商家端(创建/管理) | 小程序端(读取) | 数据表 | 备注 |
|----------|-------------------|----------------|--------|------|
| **产品分类** | `POST /merchant/categories` | `GET /miniprogram/products/categories` | product_categories | |
| **产品** | `POST /merchant/products` | `GET /miniprogram/products` | product_items | 含tags字段 |
| **产品图片** | `POST /merchant/products/:id/images` | `GET /miniprogram/products` | product_images | 随产品返回 |
| **标签** | `POST /merchant/tags` | (通过产品接口返回) | product_tag_labels | 无单独接口 |
| **奖品** | `POST /merchant/prizes` | `GET /miniprogram/prizes` | prizes | |
| **客服二维码** | `PUT /merchant/auth/profile` | `GET /miniprogram/customer-service/:id` | merchants | |
| **商户信息** | - | `GET /miniprogram/merchants/:id` | merchants | |
| **商家小程序二维码** | `POST /merchant/qrcode/generate` | - | merchants | |
