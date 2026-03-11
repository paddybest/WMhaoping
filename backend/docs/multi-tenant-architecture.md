# 多租户架构详细文档

## 目录

1. [架构设计](#架构设计)
2. [数据库设计](#数据库设计)
3. [API设计](#api设计)
4. [权限控制](#权限控制)
5. [二维码机制](#二维码机制)
6. [扫码统计](#扫码统计)
7. [部署指南](#部署指南)
8. [故障排查](#故障排查)

---

## 架构设计

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                     小程序端 (用户)                       │
│  - 统一UI框架                                            │
│  - 动态加载商家数据                                      │
│  - merchant_id上下文管理                                 │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP API (merchant_id + signature)
┌─────────────────────────────────────────────────────────┐
│                   后端服务 (Node.js)                     │
│  - merchant_id自动过滤                                   │
│  - 权限验证 (JWT + merchant_id + 签名验证)                │
│  - 二维码生成服务                                        │
│  - 扫码统计服务                                          │
└─────────────────────────────────────────────────────────┘
                          ↓ SQL Query (WHERE merchant_id = ?)
┌─────────────────────────────────────────────────────────┐
│                   数据库 (MySQL)                         │
│  - 所有业务表添加 merchant_id 字段                       │
│  - 外键约束确保数据完整性                                │
│  - 索引优化查询性能                                      │
└─────────────────────────────────────────────────────────┘
```

### 数据流

#### 正常扫码流程

```
1. 用户扫描商家二维码
   ↓
2. 小程序获取URL参数 (merchant_id, signature)
   ↓
3. 小程序调用API验证二维码
   GET /api/miniprogram/merchant/:id?signature=xxx
   ↓
4. 后端验证签名有效性
   ↓
5. 返回商家信息
   ↓
6. 小程序加载商家专属内容 (商品、奖品等)
```

#### 商家管理流程

```
1. 商家注册/登录
   POST /api/merchant/auth/register
   ↓
2. 后端自动生成二维码
   ↓
3. 商家下载二维码并分发
   ↓
4. 用户扫码，自动关联到该商家
```

---

## 数据库设计

### merchants表

```sql
CREATE TABLE merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255) NOT NULL,
  name VARCHAR(255) COMMENT '商家显示名称',
  description TEXT COMMENT '商家描述',
  customer_service_qr_url VARCHAR(500) COMMENT '客服二维码URL',
  qr_code_url VARCHAR(500) COMMENT '商家专属二维码URL',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_name (name),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### prizes表（含merchant_id）

```sql
CREATE TABLE prizes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  probability DECIMAL(5,4) NOT NULL,
  stock INT DEFAULT 0,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  INDEX idx_merchant_id (merchant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### qr_code_scans表

```sql
CREATE TABLE qr_code_scans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  user_openid VARCHAR(100) NOT NULL,
  qr_code_url VARCHAR(500) NOT NULL,
  scan_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),

  INDEX idx_merchant_scan_time (merchant_id, scan_time),
  INDEX idx_user_openid (user_openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 数据完整性规则

1. **外键约束**: 所有业务表的merchant_id必须引用merchants(id)
2. **级联删除**: 删除merchant时，所有相关数据自动删除
3. **NOT NULL约束**: merchant_id不能为NULL
4. **索引优化**: 所有merchant_id字段都建立索引

---

## API设计

### 商家端API（需要JWT认证）

#### 获取商家二维码

**请求**:
```http
GET /api/merchant/qrcode
Authorization: Bearer {jwt_token}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "merchant_id": 2,
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=2&signature=abc123",
    "generated_at": "2026-02-16T10:00:00Z"
  }
}
```

#### 重新生成二维码

**请求**:
```http
POST /api/merchant/qrcode/generate
Authorization: Bearer {jwt_token}
```

**响应**:
```json
{
  "success": true,
  "message": "QR code regenerated successfully",
  "data": {
    "qr_code_url": "https://cdn.example.com/qr/merchant_2_new.png",
    "qr_url": "https://example.com/pages/index/index?merchant_id=2&signature=xyz789"
  }
}
```

#### 获取扫码统计

**请求**:
```http
GET /api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28
Authorization: Bearer {jwt_token}
```

**响应**:
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

### 小程序端API（公开，需merchant_id）

#### 获取商家信息

**请求**:
```http
GET /api/miniprogram/merchant/:id?signature={signature}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 2,
    "name": "好品优选",
    "description": "优质商品，优惠多多",
    "qr_code_url": "https://cdn.example.com/qr/merchant_2.png",
    "is_active": true
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Merchant not found",
  "code": "MERCHANT_NOT_FOUND"
}
```

#### 获取商家奖品列表

**请求**:
```http
GET /api/miniprogram/prizes?merchantId=2
```

**响应**:
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
      "image_url": "https://cdn.example.com/prize1.jpg"
    }
  ]
}
```

#### 记录扫码事件

**请求**:
```http
POST /api/miniprogram/scan
Content-Type: application/json

{
  "merchant_id": 2,
  "user_openid": "oxxxxxxxx",
  "qr_code_url": "https://example.com/pages/index/index?merchant_id=2&signature=abc123",
  "ip_address": "192.168.1.1"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Scan recorded successfully"
}
```

---

## 权限控制

### 权限验证流程

```
请求 → JWT认证 → merchant_id验证 → 资源所有权验证 → 业务逻辑
            ↓              ↓                  ↓
         无效token    缺少merchant_id   跨商家访问
            ↓              ↓                  ↓
          401 Unauthorized 400 Bad Request 403 Forbidden
```

### 中间件说明

#### authenticateMerchant

**用途**: JWT认证中间件

**应用**: 所有商家端API

**逻辑**:
```typescript
export function authenticateMerchant(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.merchant = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
```

#### validateMerchantAccess

**用途**: 验证商家对资源的访问权限

**应用**: 商品、奖品、二维码管理API

**逻辑**:
```typescript
export function validateMerchantAccess(req: AuthRequest, res: Response, next: NextFunction) {
  const resourceMerchantId = parseInt(req.params.id || req.body.merchant_id);
  const currentMerchantId = req.merchant.id;

  if (resourceMerchantId !== currentMerchantId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
}
```

#### injectMerchantId

**用途**: 自动注入merchant_id

**应用**: 创建/更新操作

**逻辑**:
```typescript
export function injectMerchantId(req: AuthRequest, res: Response, next: NextFunction) {
  req.body.merchant_id = req.merchant.id;
  next();
}
```

#### requireMerchantId

**用途**: 验证小程序API的merchant_id参数

**应用**: 所有小程序公开API

**逻辑**:
```typescript
export function requireMerchantId(req: Request, res: Response, next: NextFunction) {
  const merchantId = req.query.merchantId || req.body.merchant_id;

  if (!merchantId) {
    return res.status(400).json({
      success: false,
      error: 'merchantId is required'
    });
  }

  req.merchantId = parseInt(merchantId);
  next();
}
```

#### optionalValidateQRCodeSignature

**用途**: 可选的二维码签名验证

**应用**: 小程序公开API

**逻辑**:
```typescript
export function optionalValidateQRCodeSignature(req: Request, res: Response, next: NextFunction) {
  const signature = req.query.signature;

  if (signature) {
    const merchantId = req.params.id || req.query.merchantId;
    const isValid = verifyQRCodeSignature(merchantId, signature);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'Invalid QR code signature',
        code: 'INVALID_QR'
      });
    }
  }

  next();
}
```

---

## 二维码机制

### 签名生成算法

```typescript
function generateQRCodeSignature(merchantId: string): string {
  const secret = process.env.QR_CODE_SECRET;
  const timestamp = Date.now();
  const data = `${merchantId}:${timestamp}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return `${signature}:${timestamp}`;
}
```

### 签名验证算法

```typescript
function verifyQRCodeSignature(merchantId: string, signature: string): boolean {
  const secret = process.env.QR_CODE_SECRET;
  const [sig, timestamp] = signature.split(':');

  // 检查签名是否过期（24小时）
  if (Date.now() - parseInt(timestamp) > 24 * 60 * 60 * 1000) {
    return false;
  }

  // 重新生成签名并比较
  const data = `${merchantId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');

  return sig === expectedSignature;
}
```

### 二维码URL格式

```
https://yourdomain.com/pages/index/index?merchant_id=2&signature=abc123def456:1676543210
```

参数说明:
- `merchant_id`: 商家ID
- `signature`: 签名（格式: `HMAC_SHA256:时间戳`）

---

## 扫码统计

### 数据模型

#### qr_code_scans表（原始扫码记录）

```typescript
interface QRCodeScan {
  id: number;
  merchant_id: number;
  user_openid: string;
  qr_code_url: string;
  scan_time: Date;
  ip_address: string;
}
```

#### qr_scan_statistics表（每日汇总统计）

```typescript
interface QRScanStatistics {
  id: number;
  merchant_id: number;
  date: Date;
  total_scans: number;
  unique_users: number;
}
```

### 统计API

#### 获取总统计

```http
GET /api/merchant/scan
Authorization: Bearer {jwt_token}
```

响应:
```json
{
  "success": true,
  "data": {
    "total_scans": 1523,
    "unique_users": 845,
    "today_scans": 67
  }
}
```

#### 获取时间范围统计

```http
GET /api/merchant/scan?startDate=2026-02-01&endDate=2026-02-28
```

#### 获取每日统计

```http
GET /api/merchant/scan/daily?limit=30
```

---

## 部署指南

### 环境要求

- Node.js 18+
- MySQL 8.0+
- Redis 7.0+（可选）
- 阿里云OSS账号

### 环境变量配置

```bash
# 多租户相关配置
QR_CODE_SECRET=your-secret-key-for-signing
QR_CODE_BASE_URL=https://yourdomain.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# OSS配置（用于存储二维码图片）
OSS_ACCESS_KEY_ID=your_oss_access_key_id
OSS_ACCESS_KEY_SECRET=your_oss_access_key_secret
OSS_BUCKET=haopingbao-qrcodes
OSS_REGION=oss-cn-hangzhou
```

### 部署步骤

1. **执行数据库迁移**
   ```bash
   npm run migrate
   ```

2. **验证迁移**
   ```sql
   DESC prizes;
   SHOW INDEX FROM prizes;
   ```

3. **创建默认商家**
   ```bash
   curl -X POST http://localhost:5000/api/merchant/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "default",
       "password": "strong_password",
       "shop_name": "默认商家"
     }'
   ```

4. **启动服务**
   ```bash
   npm run start
   ```

5. **验证部署**
   ```bash
   curl http://localhost:5000/health
   ```

### 微信小程序配置

1. 登录微信公众平台
2. 找到"扫普通链接二维码打开小程序"
3. 配置规则:
   - 二维码规则: `https://yourdomain.com/*`
   - 小程序功能页面: `pages/index/index`
4. 测试链接: `https://yourdomain.com/pages/index/index?merchant_id=2&signature=xxx`

---

## 故障排查

### 常见问题

#### 问题1: 迁移失败 - "Default merchant (id=1) does not exist"

**原因**: 迁移脚本要求存在id=1的merchant

**解决方案**:
```sql
INSERT INTO merchants (id, username, password, shop_name, is_active)
VALUES (1, 'default', 'hashed_password', 'Default Merchant', 1);
```

#### 问题2: 外键约束失败

**原因**: 数据完整性问题

**解决方案**:
```sql
-- 查找孤立记录
SELECT * FROM prizes WHERE merchant_id NOT IN (SELECT id FROM merchants);

-- 修复孤立记录
UPDATE prizes SET merchant_id = 1 WHERE merchant_id NOT IN (SELECT id FROM merchants);
```

#### 问题3: 签名验证失败

**原因**: 签名配置错误或签名过期

**解决方案**:
1. 检查`QR_CODE_SECRET`环境变量是否配置
2. 检查签名是否过期（24小时有效期）
3. 查看后端日志获取详细错误信息

#### 问题4: 跨商家访问未被阻止

**原因**: 中间件未正确应用

**解决方案**:
1. 检查路由配置，确认`validateMerchantAccess`中间件已应用
2. 检查中间件顺序，确保`authenticateMerchant`在`validateMerchantAccess`之前
3. 查看日志确认中间件执行

### 日志查询

```bash
# 查看认证错误
tail -f logs/combined.log | grep "Authentication failed"

# 查看跨商家访问尝试
tail -f logs/combined.log | grep "Cross-merchant access attempt"

# 查看签名验证失败
tail -f logs/combined.log | grep "Invalid QR code signature"
```

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
**维护者**: Haopingbao Team
