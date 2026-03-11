# 环境配置指南

**版本**: 1.0
**创建日期**: 2026-02-16
**维护者**: Haopingbao Team

---

## 📖 概述

好评宝后端服务使用环境变量进行配置。本文档详细说明所有环境变量的用途、配置方法和最佳实践。

### 配置方式

好评宝支持以下配置方式：
1. **单一 .env 文件**（推荐）- 所有环境使用同一模板，通过环境变量区分
2. **环境变量注入** - 生产环境通过系统环境变量注入配置

### 为什么使用 .env

- ✅ 敏感信息不会提交到版本控制
- ✅ 不同环境使用不同的配置值
- ✅ 配置集中管理，易于维护
- ✅ 符合 12-Factor App 安全最佳实践

---

## 🚀 快速开始

### 步骤 1: 复制环境变量模板

```bash
cd backend

# 复制模板文件
cp .env.example .env
```

### 步骤 2: 编辑配置文件

```bash
# 使用你喜欢的编辑器编辑
nano .env
# 或
vim .env
# 或
code .env
```

### 步骤 3: 填入必需的配置

编辑 `.env` 文件，至少配置以下**必需**变量：

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_strong_password
DB_NAME=haopingbao

# JWT配置
JWT_SECRET=your-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# 二维码配置（Multi-Tenant）
QR_CODE_SECRET=your-qr-code-signing-secret-key-minimum-32-chars
QR_CODE_BASE_URL=https://yourdomain.com
```

### 步骤 4: 启动服务

```bash
# 开发环境
npm run dev

# 生产环境
npm run start
```

### 步骤 5: 验证配置

```bash
# 检查健康检查
curl http://localhost:5000/health

# 预期响应：
{
  "status": "OK",
  "timestamp": "2026-02-16T10:00:00Z",
  "version": "1.0.0",
  "environment": "development"
}
```

---

## 🔒 必需配置

以下配置项必须在 `.env` 中配置，否则服务无法启动：

### 数据库配置

| 变量名 | 说明 | 示例值 | 必需 |
|---------|------|---------|------|
| `DB_HOST` | 数据库主机地址 | `localhost` | ✅ 是 |
| `DB_PORT` | 数据库端口 | `3306` | ✅ 是 |
| `DB_USER` | 数据库用户名 | `root` | ✅ 是 |
| `DB_PASSWORD` | 数据库密码 | `your_strong_password` | ✅ 是 |
| `DB_NAME` | 数据库名称 | `haopingbao` | ✅ 是 |

**配置示例**:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_strong_password
DB_NAME=haopingbao
```

**生产环境建议**:
- 使用强密码（至少16个字符）
- 限制数据库用户权限（避免使用root）
- 使用SSL连接（添加 `DB_SSL=true`）
- 数据库主机使用内网地址

### JWT 认证配置

| 变量名 | 说明 | 示例值 | 必需 |
|---------|------|---------|------|
| `JWT_SECRET` | JWT签名密钥 | `random-32-characters` | ✅ 是 |
| `JWT_EXPIRES_IN` | Token过期时间 | `7d`, `24h`, `60m` | ✅ 是 |

**配置示例**:
```bash
# JWT签名密钥（必须至少32个字符）
# ⚠️ 安全级别：关键 - 必须保密，不可提交到版本控制
JWT_SECRET=your-jwt-secret-key-minimum-32-characters-long

# Token过期时间（格式：数字+单位）
# 可用单位：s（秒）、m（分钟）、h（小时）、d（天）
JWT_EXPIRES_IN=7d
```

**安全建议**:
- 使用随机生成的强密钥（见"密钥生成"章节）
- 不要在代码中硬编码
- 定期轮换密钥（建议每3-6个月）
- 根据安全要求调整过期时间（通常7天-30天）

### 二维码配置（Multi-Tenant）⭐ 新增

**重要**: 这是多租户架构新增的关键配置，必须正确设置！

| 变量名 | 说明 | 示例值 | 必需 |
|---------|------|---------|------|
| `QR_CODE_SECRET` | 二维码签名密钥 | `random-32-characters` | ✅ 是 |
| `QR_CODE_BASE_URL` | 二维码URL的基础域名 | `https://yourdomain.com` | ✅ 是 |
| `QR_CODE_SIZE` | 二维码图片尺寸（像素） | `300` | 否 |
| `QR_CODE_ERROR_CORRECTION_LEVEL` | 纠错级别 | `M` | 否 |

**配置示例**:
```bash
# ============================================
# QR Code Configuration (Multi-Tenant)
# ============================================

# 二维码签名密钥（必需，用于防伪造）
# ⚠️ 安全级别：关键 - 必须保密，否则二维码可被伪造
QR_CODE_SECRET=your-qr-code-signing-secret-key-minimum-32-chars

# 二维码URL的基础域名
# 用于生成微信小程序URL Scheme
QR_CODE_BASE_URL=https://yourdomain.com

# 二维码图片尺寸（像素）
# 常见尺寸：200, 250, 300, 350, 400
QR_CODE_SIZE=300

# 纠错级别（L=7%, M=15%, Q=25%, H=30%）
# M是推荐值，平衡了二维码密度和尺寸
QR_CODE_ERROR_CORRECTION_LEVEL=M
```

**二维码签名机制说明**:
1. 商家注册时，系统自动生成专属二维码
2. 二维码URL格式: `pages/index/index?merchant_id={id}&signature={sig}`
3. 签名基于 `QR_CODE_SECRET` 和时间戳生成
4. 用户扫描时，后端验证签名有效性
5. 签名验证失败则拒绝访问

**安全重要性**:
- 🔴 `QR_CODE_SECRET` 是二维码防伪造的关键
- 🔴 如果泄露，攻击者可以伪造任意商家的二维码
- 🔴 必须与 `JWT_SECRET` 不同的随机密钥

---

## 🔧 可选配置

以下配置项有默认值，可根据需要调整：

### Redis 配置

**用途**: 缓存和会话管理，提升系统性能

| 变量名 | 说明 | 示例值 | 默认值 |
|---------|------|---------|--------|
| `REDIS_HOST` | Redis主机地址 | `localhost` | `localhost` |
| `REDIS_PORT` | Redis端口 | `6379` | `6379` |
| `REDIS_PASSWORD` | Redis密码（可选） | `''` | 无 |

**配置示例**:
```bash
# ============================================
# Redis Configuration (Optional)
# ============================================
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

**说明**: Redis是可选的，如果不使用Redis，系统会使用内存缓存。建议生产环境使用Redis以提高性能。

### AI 服务配置

**用途**: AI评价生成功能（如不使用AI功能，可不配置）

| 变量名 | 说明 | 示例值 |
|---------|------|---------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | `sk-xxx` |

**配置示例**:
```bash
# ============================================
# AI Service Configuration
# ============================================
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

**说明**: 如果不使用AI评价功能，此配置可以留空或删除。

### 微信小程序配置

**用途**: 微信小程序接入相关功能

| 变量名 | 说明 | 示例值 |
|---------|------|---------|
| `WECHAT_APP_ID` | 微信小程序AppID | `wx1234567890abcdef` |
| `WECHAT_APP_SECRET` | 微信小程序AppSecret | `xxxxxxxxxxxxxxxxx` |

**配置示例**:
```bash
# ============================================
# WeChat Configuration
# ============================================
WECHAT_APP_ID=your-wechat-app-id
WECHAT_APP_SECRET=your-wechat-app-secret  # ⚠️ 敏感信息，必须保密
```

**获取方式**: 在微信公众平台（mp.weixin.qq.com）获取AppID和AppSecret。

### 日志配置 ⭐ 新增

**用途**: 控制日志记录的详细程度和存储位置

| 变量名 | 说明 | 可选值 | 默认值 |
|---------|------|---------|--------|
| `LOG_LEVEL` | 日志级别 | `error`, `warn`, `info`, `debug` | `info` |
| `LOG_FILE` | 日志文件路径 | 任意有效路径 | `logs/combined.log` |
| `ERROR_LOG_FILE` | 错误日志文件路径 | 任意有效路径 | `logs/error.log` |

**配置示例**:
```bash
# ============================================
# Logging Configuration
# ============================================

# 日志级别（可选值: error, warn, info, debug）
# - error: 只记录错误
# - warn: 记录警告和错误
# - info: 记录信息、警告和错误（推荐）
# - debug: 记录所有调试信息（仅开发环境）
LOG_LEVEL=info

# 日志文件路径
LOG_FILE=logs/combined.log

# 错误日志文件路径
ERROR_LOG_FILE=logs/error.log
```

**日志级别说明**:
- `error`: 只记录错误日志
- `warn`: 记录警告和错误日志
- `info`: 记录所有重要信息、警告和错误
- `debug`: 记录所有调试信息（包括SQL查询）

**环境建议**:
- 开发环境: `debug` 或 `info`
- 测试环境: `info`
- 生产环境: `warn` 或 `error`

### 安全配置 ⭐ 新增

**用途**: 防止API滥用和配置跨域访问

| 变量名 | 说明 | 可选值 | 默认值 |
|---------|------|---------|--------|
| `RATE_LIMIT_WINDOW_MS` | 限流时间窗口 | 毫秒数 | `900000` (15分钟) |
| `RATE_LIMIT_MAX_REQUESTS` | 时间窗口内最大请求数 | 数字 | `100` |
| `CORS_ENABLED` | 是否启用CORS | `true`, `false` | `true` |
| `CORS_ORIGIN` | 允许的CORS来源 | URL | `http://localhost:3000` |

**配置示例**:
```bash
# ============================================
# Security Configuration
# ============================================

# 限流时间窗口（毫秒，默认15分钟=900000ms）
# 推荐值：900000 (15分钟), 3600000 (1小时)
RATE_LIMIT_WINDOW_MS=900000

# 时间窗口内最大请求数
# 超过此限制将返回 429 Too Many Requests
RATE_LIMIT_MAX_REQUESTS=100

# 是否启用CORS（true/false）
CORS_ENABLED=true

# 允许的CORS来源
# 多个来源用逗号分隔，或用 * 允许所有
CORS_ORIGIN=http://localhost:3000
```

**限流配置说明**:
- 限流防止API滥用和DDoS攻击
- 超过限制返回 `429 Too Many Requests`
- 时间窗口重置后，请求计数重新开始

**CORS配置说明**:
- CORS允许前端跨域访问后端API
- `CORS_ORIGIN` 应配置为前端URL
- 生产环境使用实际域名，不要用 `*`

---

## 🌍 不同环境配置

### 开发环境

```bash
# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# ============================================
# Database Configuration
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=dev_password_not_for_production
DB_NAME=haopingbao_dev

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=dev-jwt-secret-key-not-for-production
JWT_EXPIRES_IN=7d

# ============================================
# QR Code Configuration (Multi-Tenant)
# ============================================
QR_CODE_SECRET=dev-qr-secret-not-for-production
QR_CODE_BASE_URL=http://localhost:5000
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=debug
LOG_FILE=logs/combined.log
ERROR_LOG_FILE=logs/error.log

# ============================================
# Security Configuration
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ENABLED=true
CORS_ORIGIN=http://localhost:3000
```

**开发环境特点**:
- 使用 `localhost` 或开发服务器地址
- 使用测试密钥（不是生产密钥）
- 日志级别设置为 `debug`
- 允许更多请求，便于测试

---

### 测试环境

```bash
# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=test
FRONTEND_URL=http://test.haopingbao.com

# ============================================
# Database Configuration
# ============================================
DB_HOST=test-db.haopingbao.com
DB_PORT=3306
DB_USER=haopingbao_test
DB_PASSWORD=test_password_random_and_strong
DB_NAME=haopingbao_test

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=test-jwt-secret-key
JWT_EXPIRES_IN=24h

# ============================================
# QR Code Configuration (Multi-Tenant)
# ============================================
QR_CODE_SECRET=test-qr-secret-key
QR_CODE_BASE_URL=https://test.haopingbao.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=info
LOG_FILE=logs/combined.log
ERROR_LOG_FILE=logs/error.log

# ============================================
# Security Configuration
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ENABLED=true
CORS_ORIGIN=http://test.haopingbao.com
```

**测试环境特点**:
- 使用独立的测试数据库
- 使用测试专用的密钥
- 日志级别设置为 `info`
- 使用测试域名

---

### 生产环境

```bash
# ============================================
# Server Configuration
# ============================================
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://haopingbao.com

# ============================================
# Database Configuration
# ============================================
DB_HOST=prod-db.haopingbao.internal  # 内网地址
DB_PORT=3306
DB_USER=haopingbao_prod           # 专用用户
DB_PASSWORD=<random-strong-password>  # 从密钥管理服务获取
DB_NAME=haopingbao

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET=<random-strong-secret>  # 从密钥管理服务获取
JWT_EXPIRES_IN=7d

# ============================================
# QR Code Configuration (Multi-Tenant)
# ============================================
QR_CODE_SECRET=<random-strong-secret>  # 从密钥管理服务获取
QR_CODE_BASE_URL=https://haopingbao.com
QR_CODE_SIZE=300
QR_CODE_ERROR_CORRECTION_LEVEL=M

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=warn                 # 生产环境只记录警告和错误
LOG_FILE=/var/log/haopingbao/combined.log
ERROR_LOG_FILE=/var/log/haopingbao/error.log

# ============================================
# Security Configuration
# ============================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ENABLED=true
CORS_ORIGIN=https://haopingbao.com  # 只允许生产域名
```

**生产环境安全检查清单**:
- [ ] 所有密钥都是随机生成的强密钥（至少32个字符）
- [ ] 密钥从密钥管理服务获取，不硬编码
- [ ] 数据库使用内网地址
- [ ] 使用HTTPS域名
- [ ] 日志级别设置为 `warn` 或 `error`
- [ ] CORS_ORIGIN 设置为生产域名
- [ ] 数据库用户权限最小化
- [ ] 数据库使用SSL连接

---

## 🔐 安全最佳实践

### 密钥管理

1. **永远不要将 .env 文件提交到版本控制**
   ```bash
   # .gitignore 应该包含：
   .env
   .env.local
   .env.*.local
   ```

2. **使用强随机密钥**
   - 最小长度：32个字符（base64编码）
   - 使用随机生成器，不要使用简单密码
   - 每个环境使用不同的密钥

3. **定期轮换密钥**
   - 建议频率：每3-6个月
   - 轮换步骤：
     1. 生成新密钥
     2. 更新 `.env` 文件
     3. 重启服务
     4. 撤销旧密钥

4. **使用密钥管理服务**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - 或简单的环境变量注入

### 环境隔离

1. **不同环境使用不同密钥**
   ```bash
   开发: dev-secret-123
   测试: test-secret-456
   生产: prod-secret-789（强随机密钥）
   ```

2. **不要在开发环境使用生产密钥**
   - 避免意外污染生产数据
   - 防止开发人员获取生产权限

3. **最小权限原则**
   - 数据库用户只授予必需权限
   - OSS使用只读或只写权限
   - API权限按功能分离

### 访问控制

1. **限制 .env 文件权限**
   ```bash
   # 只允许所有者读写
   chmod 600 .env
   ```

2. **使用环境变量注入**（生产推荐）
   ```bash
   # Docker Compose 示例
   environment:
     - DB_PASSWORD=${DB_PASSWORD}
     - JWT_SECRET=${JWT_SECRET}
   ```

3. **审计访问日志**
   - 定期检查服务器日志
   - 监控异常访问模式
   - 设置告警通知

### 生产环境安全检查清单

- [ ] 所有敏感密钥都是随机生成的（至少32个字符）
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 数据库使用强密码和SSL连接
- [ ] JWT_SECRET 和 QR_CODE_SECRET 不同
- [ ] 日志级别设置为 `warn` 或 `error`
- [ ] CORS_ORIGIN 限制为生产域名
- [ ] 限流已启用且配置合理
- [ ] 数据库用户权限最小化
- [ ] 使用HTTPS域名
- [ ] 定期备份密钥配置
- [ ] 设置密钥轮换提醒

---

## 🔑 密钥生成

### 方法 1: OpenSSL 命令行（推荐）

**安装 OpenSSL**:
- Linux/macOS: 通常已预装
- Windows: 使用 Git Bash 或安装 OpenSSL

**生成密钥**:
```bash
# JWT Secret
openssl rand -base64 32

# QR Code Secret
openssl rand -base64 32

# OSS Secret
openssl rand -base64 32

# 输出示例：
# aB3xK9mN2qP7rT4jV8sW6yX1zL9mN2qP7rT4jV8sW6yX1z
```

**生成不同长度的密钥**:
```bash
# 16字节（约22个字符）- 不推荐
openssl rand -base64 16

# 32字节（约43个字符）- 推荐 ✅
openssl rand -base64 32

# 64字节（约86个字符）- 更安全
openssl rand -base64 64
```

---

### 方法 2: Node.js 脚本

**创建脚本文件** `generate-secrets.js`:
```javascript
const crypto = require('crypto');

function generateSecret(description) {
  const secret = crypto.randomBytes(32).toString('base64');
  console.log(`${description}:`);
  console.log(secret);
  console.log('');
}

console.log('生成的强密钥（请保存到 .env 文件）：\n');

generateSecret('JWT_SECRET');
generateSecret('QR_CODE_SECRET');
generateSecret('DB_PASSWORD (如果需要)');
```

**运行脚本**:
```bash
node generate-secrets.js
```

**输出示例**:
```
生成的强密钥（请保存到 .env 文件）：

JWT_SECRET:
aB3xK9mN2qP7rT4jV8sW6yX1zL9mN2qP7rT4jV8sW6yX1z

QR_CODE_SECRET:
xY5cL1nM8rR9tV6kW2sZ4yX2lM8rR9tV6kW2sZ4yX2l

DB_PASSWORD (如果需要):
zD7eN3oM9sS8uV7lY3sA5kM1oN9sS8uV7lY3sA5k
```

---

### 方法 3: Python 脚本（如果可用）

```python
import secrets
import base64

def generate_secret():
    # 生成32字节随机数据
    random_bytes = secrets.token_bytes(32)
    # 转换为base64
    secret = base64.b64encode(random_bytes).decode('utf-8')
    return secret

print(f"JWT_SECRET={generate_secret()}")
print(f"QR_CODE_SECRET={generate_secret()}")
```

**运行**:
```bash
python3 generate-secrets.py
```

---

## 🐳 Docker 配置

### Docker Compose 示例

创建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "5000:5000"
    environment:
      # ============================================
      # Server Configuration
      # ============================================
      - NODE_ENV=production
      - PORT=5000
      - FRONTEND_URL=https://haopingbao.com

      # ============================================
      # Database Configuration
      # ============================================
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_USER=haopingbao
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=haopingbao

      # ============================================
      # JWT Configuration
      # ============================================
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=7d

      # ============================================
      # QR Code Configuration (Multi-Tenant)
      # ============================================
      - QR_CODE_SECRET=${QR_CODE_SECRET}
      - QR_CODE_BASE_URL=https://haopingbao.com
      - QR_CODE_SIZE=300
      - QR_CODE_ERROR_CORRECTION_LEVEL=M

      # ============================================
      # AI Service Configuration
      # ============================================
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}

      # ============================================
      # File Storage Configuration (Alibaba Cloud OSS)
      # ============================================
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - OSS_BUCKET=haopingbao-images
      - OSS_REGION=oss-cn-hangzhou

      # ============================================
      # WeChat Configuration
      # ============================================
      - WECHAT_APP_ID=${WECHAT_APP_ID}
      - WECHAT_APP_SECRET=${WECHAT_APP_SECRET}

      # ============================================
      # Logging Configuration
      # ============================================
      - LOG_LEVEL=warn
      - LOG_FILE=/var/log/haopingbao/combined.log
      - ERROR_LOG_FILE=/var/log/haopingbao/error.log

      # ============================================
      # Security Configuration
      # ============================================
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - CORS_ENABLED=true
      - CORS_ORIGIN=https://haopingbao.com
    depends_on:
      - mysql
    volumes:
      - ./logs:/var/log/haopingbao

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=haopingbao
    volumes:
      - mysql-data:/var/lib/mysql
    ports:
      - "3306:3306"

volumes:
  mysql-data:
```

### Docker Secrets 配置（更安全）

**使用 Docker Secrets** 避免在 docker-compose.yml 中暴露密钥：

```yaml
version: '3.8'

services:
  backend:
    build: .
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password
      - JWT_SECRET_FILE=/run/secrets/jwt_secret
      - QR_CODE_SECRET_FILE=/run/secrets/qr_code_secret
    secrets:
      - db_password
      - jwt_secret
      - qr_code_secret
    depends_on:
      - mysql

secrets:
  db_password:
    file: ./secrets/db_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  qr_code_secret:
    file: ./secrets/qr_code_secret.txt
```

**创建密钥文件**:
```bash
mkdir -p secrets

# 生成密钥文件
openssl rand -base64 32 > secrets/db_password.txt
openssl rand -base64 32 > secrets/jwt_secret.txt
openssl rand -base64 32 > secrets/qr_code_secret.txt

# 设置文件权限
chmod 600 secrets/*.txt
```

**启动 Docker Compose**:
```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f backend

# 停止所有服务
docker-compose down
```

---

## 🔧 故障排除

### 常见问题

#### 问题 1: 服务启动失败 - "Missing required environment variable"

**症状**:
```
Error: Missing required environment variable: QR_CODE_SECRET
```

**原因**: 必需的环境变量未配置

**解决方案**:
1. 检查 `.env` 文件是否存在
2. 确认所有必需变量都已配置：
   ```bash
   cat .env | grep -E "DB_HOST|DB_PORT|DB_NAME|JWT_SECRET|QR_CODE_SECRET"
   ```
3. 参考 [必需配置](#🔒-必需配置) 章节
4. 重启服务

---

#### 问题 2: 数据库连接失败

**症状**:
```
Error: connect ECONNREFUSED 127.0.0.1:3306
Error: Access denied for user 'root'@'localhost'
```

**原因**: 数据库配置错误或连接问题

**解决方案**:
```bash
# 1. 测试数据库连接
mysql -h localhost -u root -p haopingbao

# 2. 检查配置值
echo $DB_HOST
echo $DB_PORT
echo $DB_NAME

# 3. 验证数据库是否运行
# Linux
systemctl status mysql
# 或
docker ps | grep mysql
```

---

#### 问题 3: JWT Token 验证失败

**症状**:
```
Error: Invalid token
Error: jwt malformed
```

**原因**: JWT_SECRET 配置错误或Token已过期

**解决方案**:
1. 检查 `JWT_SECRET` 长度（至少32个字符）
2. 确认 `JWT_EXPIRES_IN` 设置合理
3. 清除浏览器缓存中的旧Token
4. 重新登录获取新Token

---

#### 问题 4: 二维码签名验证失败

**症状**:
```
Error: Invalid QR code signature
Error: QR code expired
```

**原因**: QR_CODE_SECRET 配置错误或签名已过期

**解决方案**:
1. 确认 `QR_CODE_SECRET` 已配置且长度至少32个字符
2. 重新生成商家二维码
3. 检查系统时间是否正确（签名包含时间戳）
4. 验证 `QR_CODE_BASE_URL` 与实际域名匹配

---

#### 问题 5: CORS 错误

**症状**:
```
Error: CORS policy: No 'Access-Control-Allow-Origin' header
```

**原因**: CORS配置不正确

**解决方案**:
1. 检查 `.env` 中的 `CORS_ENABLED` 是否为 `true`
2. 确认 `CORS_ORIGIN` 包含前端URL
3. 如果是开发环境，使用 `http://localhost:3000`
4. 如果是生产环境，使用实际域名（不要用 `*`）

---

#### 问题 6: 日志文件权限错误

**症状**:
```
Error: EACCES: permission denied, open 'logs/combined.log'
```

**原因**: 日志目录不存在或权限不足

**解决方案**:
```bash
# 创建日志目录
mkdir -p logs

# 设置正确的权限
chmod 755 logs

# 或让Node.js自动创建
# 确保LOG_FILE路径存在且可写
```

---

#### 问题 7: 限流导致请求被拒绝

**症状**:
```
Error: 429 Too Many Requests
```

**原因**: API请求频率超过限制

**解决方案**:
1. 检查 `.env` 中的 `RATE_LIMIT_MAX_REQUESTS` 配置
2. 如果测试环境，可以临时提高限制：
   ```bash
   RATE_LIMIT_MAX_REQUESTS=1000
   ```
3. 等待时间窗口重置后重试
4. 生产环境可适当调整限流阈值

---

### 调试模式

#### 启用调试日志

```bash
# 修改 .env
LOG_LEVEL=debug

# 重启服务
npm run dev

# 查看详细日志
tail -f logs/combined.log
```

#### 验证环境变量

```bash
# 方法1: 直接打印（仅开发环境）
node -e "console.log(process.env)"

# 方法2: 检查特定变量
echo $DB_HOST
echo $JWT_SECRET
echo $QR_CODE_SECRET

# 方法3: 启动服务时查看（会打印缺失的必需变量）
npm run dev
```

---

## ❓ 常见问题 FAQ

### Q1: 如何检查当前生效的环境变量？

**A**: 使用以下方法：

```bash
# 方法1: 打印所有环境变量
node -e "console.log(process.env)"

# 方法2: 检查特定变量
echo $QR_CODE_SECRET

# 方法3: 在Node.js应用中查看
# 在代码中添加：console.log(process.env.QR_CODE_SECRET)
```

---

### Q2: 修改 .env 文件后需要重启服务吗？

**A**: 是的，环境变量在应用启动时加载，不会热重载。

```bash
# 1. 编辑 .env
nano .env

# 2. 停止服务
Ctrl+C (如果正在运行)

# 3. 重新启动
npm run dev
```

---

### Q3: 可以在不同的环境使用不同的 .env 文件吗？

**A**: 可以，但推荐使用单一 .env 文件 + 环境变量注入的方法。

**如果使用多文件方法**：
- `.env.development` - 开发环境
- `.env.test` - 测试环境
- `.env.production` - 生产环境

**加载方式**:
```bash
# 安装 dotenv-cli
npm install -g dotenv-cli

# 加载特定环境配置
dotenv -e .env.production -- npm run start
```

---

### Q4: 如何在代码中访问环境变量？

**A**: 使用 `process.env` 对象：

```javascript
// 读取环境变量
const dbHost = process.env.DB_HOST;
const jwtSecret = process.env.JWT_SECRET;
const qrCodeSecret = process.env.QR_CODE_SECRET;

// 提供默认值（可选）
const port = process.env.PORT || 5000;
```

**注意事项**:
- 环境变量名必须与 `.env` 文件中的变量名完全一致
- 如果变量不存在，返回 `undefined`
- 建议提供默认值或验证存在性

---

### Q5: 生产环境如何安全地注入敏感配置？

**A**: 使用以下任一方法：

**方法1: 系统环境变量**
```bash
# Linux/macOS
export DB_PASSWORD='strong_password_here'
export JWT_SECRET='jwt_secret_here'

# Windows
set DB_PASSWORD=strong_password_here
set JWT_SECRET=jwt_secret_here
```

**方法2: Docker Secrets**
见 [Docker配置](#🐳-docker-配置) 章节。

**方法3: 密钥管理服务**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

**方法4: Kubernetes Secrets**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: haopingbao-secrets
type: Opaque
data:
  db-password: <base64-encoded-password>
  jwt-secret: <base64-encoded-secret>
```

---

### Q6: 日志文件太大怎么办？

**A**: 实施日志轮转：

**方案1: 使用 PM2（推荐）**
```json
// ecosystem.config.json
{
  "apps": [{
    "name": "haopingbao-backend",
    "script": "dist/server.js",
    "error_file": "logs/error.log",
    "out_file": "logs/combined.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss",
    "merge_logs": true,
    "log_file": "logs/app.log",
    "log_max_file_size": 10485760,  // 100MB
    "log_rotate": true
  }]
}
```

**方案2: 使用 logrotate（Linux）**
```bash
# 创建 /etc/logrotate.d/haopingbao
/path/to/logs/combined.log {
  daily
  rotate 7
  compress
  delaycompress
  missingok
  notifempty
  create 0640 www-data www-data
}
```

---

## 📚 相关文档

- [后端 README](../README.md) - 项目概述和快速开始指南
- [实施计划](../../docs/implementation-plan-priority-tasks.md) - 多租户架构实施计划
- [多租户架构设计](../../docs/plans/2026-02-16-multi-tenant-architecture-design.md) - 架构设计文档

---

## 📞 获取帮助

如果遇到本文档未涵盖的问题：

1. **查看日志**: `logs/combined.log` 和 `logs/error.log`
2. **搜索已知问题**: 检查 Issues 和 Stack Overflow
3. **联系团队**: 通过团队沟通渠道求助

---

**文档版本**: 1.0
**最后更新**: 2026-02-16
**维护者**: Haopingbao Team
