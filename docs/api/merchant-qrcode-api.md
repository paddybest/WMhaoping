# 商家二维码API文档

**API版本**: v1.0
**更新日期**: 2026-02-16
**功能**: 商家专属二维码的生成、获取和管理

---

## 📋 目录

- [1. 概述](#1-概述)
- [2. API端点](#2-api端点)
- [3. 请求/响应格式](#3-请求响应格式)
- [4. 错误码](#4-错误码)
- [5. 使用示例](#5-使用示例)

---

## 1. 概述

### 功能说明

商家二维码API提供以下功能：

- ✅ **自动生成二维码**: 商家注册时自动生成专属二维码
- ✅ **重新生成二维码**: 商家可以重新生成新的二维码（旧二维码失效）
- ✅ **获取二维码信息**: 查询当前二维码的URL和生成时间
- ✅ **上传自定义二维码**: 允许商家使用自定义的二维码图片

### 技术栈

- **二维码生成**: `qrcode` npm包
- **图片存储**: 阿里云OSS
- **存储路径**: `merchant-qrcode/{merchantId}/{timestamp}-{uuid}.png`
- **二维码内容**: `pages/index/index?merchant_id={merchantId}`（小程序页面路径）

### 认证要求

所有端点都需要商家JWT认证：

```http
Authorization: Bearer {token}
```

---

## 2. API端点

### 2.1 生成商家二维码

**端点**: `POST /api/merchant/qrcode/generate`
**认证**: ✅ 需要
**描述**: 重新生成商家专属二维码（删除旧的，生成新的）

#### 请求示例

```bash
curl -X POST http://localhost:8080/api/merchant/qrcode/generate \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

#### 响应示例（成功）

```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "qrCodeUrl": "https://haopingbao-qrcodes.oss-cn-hangzhou.aliyuncs.com/merchant-qrcode/1/1739707200000-abc123def456.png",
    "message": "QR code regenerated successfully"
  }
}
```

#### 响应示例（失败）

```json
{
  "success": false,
  "error": "Failed to generate QR code"
}
```

#### 响应状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 二维码生成成功 |
| 401 | 未认证（无效或缺失JWT token） |
| 500 | 服务器错误（OSS上传失败等） |

---

### 2.2 获取二维码信息

**端点**: `GET /api/merchant/qrcode`
**认证**: ✅ 需要
**描述**: 获取当前商家的二维码信息

#### 请求示例

```bash
curl -X GET http://localhost:8080/api/merchant/qrcode \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 响应示例（成功）

```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "qrCodeUrl": "https://haopingbao-qrcodes.oss-cn-hangzhou.aliyuncs.com/merchant-qrcode/1/1739707200000-abc123def456.png",
    "name": "优质水果店",
    "shopName": "Quality Fruit Shop",
    "generatedAt": "2026-02-16T06:00:00.000Z"
  }
}
```

#### 响应示例（未生成）

```json
{
  "success": false,
  "error": "QR code not found. Please generate one first."
}
```

#### 响应状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 获取成功 |
| 401 | 未认证 |
| 404 | 二维码未生成 |
| 500 | 服务器错误 |

---

### 2.3 上传自定义二维码

**端点**: `POST /api/merchant/qrcode/upload`
**认证**: ✅ 需要
**描述**: 上传自定义二维码URL（可选功能）

#### 请求示例

```bash
curl -X POST http://localhost:8080/api/merchant/qrcode/upload \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "qrCodeUrl": "https://example.com/custom-qr.png"
  }'
```

#### 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|-------|------|
| qrCodeUrl | string | ✅ | 自定义二维码的URL（http://或https://） |

#### 响应示例（成功）

```json
{
  "success": true,
  "data": {
    "merchantId": 1,
    "qrCodeUrl": "https://example.com/custom-qr.png",
    "message": "QR code URL updated successfully"
  }
}
```

#### 响应示例（失败）

```json
{
  "success": false,
  "error": "Invalid qrCodeUrl format"
}
```

#### 响应状态码

| 状态码 | 说明 |
|-------|------|
| 200 | 上传成功 |
| 400 | URL格式无效 |
| 401 | 未认证 |
| 404 | 商家不存在 |
| 500 | 服务器错误 |

---

## 3. 请求/响应格式

### 3.1 请求头

```http
Content-Type: application/json
Authorization: Bearer {token}
```

### 3.2 响应格式

#### 成功响应

```json
{
  "success": true,
  "data": {
    // 数据内容（根据端点不同）
  }
}
```

#### 失败响应

```json
{
  "success": false,
  "error": "错误描述信息"
}
```

---

## 4. 错误码

### HTTP状态码

| 状态码 | 错误类型 | 说明 |
|-------|----------|------|
| 200 | 成功 | 请求成功处理 |
| 400 | 客户端错误 | 请求参数错误 |
| 401 | 未认证 | 缺少或无效的JWT token |
| 404 | 未找到 | 商家或二维码不存在 |
| 500 | 服务器错误 | 服务器内部错误 |

### 常见错误信息

| 错误信息 | 场景 | 解决方法 |
|---------|------|---------|
| Unauthorized: merchant not authenticated | 未提供JWT token | 在请求头中添加Authorization |
| QR code not found. Please generate one first. | 商家未生成二维码 | 调用生成接口先创建二维码 |
| Invalid qrCodeUrl format | URL格式无效 | 确保使用http://或https://开头 |
| Failed to generate QR code | 生成或上传失败 | 检查OSS配置或网络连接 |

---

## 5. 使用示例

### 5.1 完整商家注册流程

```javascript
// 1. 商家注册
const registerResponse = await fetch('http://localhost:8080/api/merchant/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'fruitshop',
    password: 'password123',
    shopName: '新鲜水果店'
  })
});

const { token } = await registerResponse.json();
console.log('注册成功，二维码将自动生成');

// 2. 等待二维码生成（异步，通常1-2秒）
setTimeout(async () => {
  // 3. 获取生成的二维码
  const qrResponse = await fetch('http://localhost:8080/api/merchant/qrcode', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { data } = await qrResponse.json();
  console.log('二维码URL:', data.qrCodeUrl);
}, 2000);
```

### 5.2 商家重新生成二维码

```javascript
const token = 'your-jwt-token';

// 重新生成二维码
const response = await fetch('http://localhost:8080/api/merchant/qrcode/generate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const { success, data } = await response.json();

if (success) {
  console.log('二维码重新生成成功！');
  console.log('新URL:', data.qrCodeUrl);
}
```

### 5.3 小程序扫描二维码

```javascript
// 小程序扫描二维码后，会自动跳转到：
// pages/index/index?merchant_id=1

// 在页面的onLoad中获取merchant_id
Page({
  onLoad(options) {
    const merchantId = options.merchant_id;
    console.log('当前商家ID:', merchantId);

    // 加载商家信息
    this.loadMerchantData(merchantId);
  },

  async loadMerchantData(merchantId) {
    const merchant = await get(`/miniprogram/merchant/${merchantId}`);
    this.setData({
      merchantName: merchant.data.name,
      merchantDesc: merchant.data.description
    });
  }
});
```

### 5.4 下载二维码图片

```javascript
// 前端下载二维码
const downloadQRCode = async () => {
  const response = await fetch('http://localhost:8080/api/merchant/qrcode', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const { data } = await response.json();

  // 创建下载链接
  const link = document.createElement('a');
  link.href = data.qrCodeUrl;
  link.download = `merchant-qrcode-${data.merchantId}.png`;
  link.click();
};
```

---

## 6. 二维码配置

### 6.1 默认配置

```typescript
{
  width: 300,        // 二维码尺寸（像素）
  margin: 2,         // 边距（空白像素）
  color: {
    dark: '#000000',  // 前景色（黑色）
    light: '#FFFFFF'   // 背景色（白色）
  }
}
```

### 6.2 二维码内容格式

```
pages/index/index?merchant_id={merchantId}
```

这是微信小程序的页面路径，用户扫码后会直接跳转到对应商家的首页。

### 6.3 OSS存储配置

```typescript
{
  region: 'oss-cn-hangzhou',
  bucket: 'haopingbao-qrcodes',
  path: 'merchant-qrcode/{merchantId}/{timestamp}-{uuid}.png'
}
```

---

## 7. 安全考虑

### 7.1 认证

- ✅ 所有端点需要JWT token认证
- ✅ Token在注册/登录时生成
- ✅ Token包含商家ID，防止跨商家访问

### 7.2 输入验证

- ✅ URL格式验证（http/https协议）
- ✅ 商家ID验证
- ✅ JWT token验证

### 7.3 OSS安全

- ✅ 使用UUID生成唯一文件名，防止路径遍历
- ✅ 每个商家有独立的目录
- ✅ 删除旧二维码时验证所有权

---

## 8. 性能优化

### 8.1 缓存策略

**建议添加的优化**：
- Redis缓存商家二维码URL（TTL: 1小时）
- 减少重复查询数据库

### 8.2 异步处理

**当前实现**：
- ✅ 注册时二维码生成是异步的，不阻塞注册流程
- ✅ 使用`catch`捕获错误，不影响注册结果

### 8.3 CDN加速

**建议**：
- 为OSS Bucket配置CDN加速
- 提高二维码下载速度

---

## 9. 故障排查

### 问题1: 二维码生成失败

**症状**: 返回`500 Failed to generate QR code`

**可能原因**:
1. OSS配置错误（ACCESS_KEY或REGION不正确）
2. 网络连接问题
3. OSS Bucket不存在或无权限

**解决方法**:
```bash
# 检查环境变量
echo $OSS_ACCESS_KEY_ID
echo $OSS_ACCESS_KEY_SECRET
echo $OSS_REGION
echo $OSS_QR_BUCKET

# 测试OSS连接
# 使用OSS管理工具或SDK测试
```

### 问题2: 二维码无法扫描

**症状**: 扫码后无反应或跳转错误

**可能原因**:
1. 二维码内容格式错误
2. 商家ID不存在
3. 商家被禁用（is_active=false）

**解决方法**:
```bash
# 检查商家状态
mysql -u root -p haopingbao
SELECT id, is_active FROM merchants WHERE id = 1;

# 验证二维码内容
# 使用在线工具解码二维码
```

### 问题3: 旧二维码仍有效

**症状**: 重新生成后，旧二维码仍能扫描

**可能原因**:
- OSS删除失败（旧文件未删除）

**解决方法**:
```javascript
// 手动调用重新生成接口，会自动删除旧二维码
POST /api/merchant/qrcode/generate
```

---

## 10. 更新日志

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-02-16 | 初始版本，支持基础二维码功能 |
| - | - | 添加批量生成接口（计划中） |
| - | - | 添加二维码统计功能（计划中） |

---

**文档维护者**: Claude Code
**最后更新**: 2026-02-16
**文档状态**: ✅ 完成
