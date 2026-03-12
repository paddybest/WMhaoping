# 好评宝 (Haopingbao)

<div align="center">

**AI 智能评价生成 + 产品数据管理系统**

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)

帮助商家快速生成优质商品评价，提升店铺口碑

</div>

## 📋 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [数据库配置](#数据库配置)
- [API文档](#api文档)
- [部署指南](#部署指南)
- [开发指南](#开发指南)
- [文档](#文档)

## 🎯 项目简介

好评宝是一款全栈智能评价生成系统，由**商家端**、**用户端小程序**和**后端服务**三部分组成。系统支持AI智能评价生成、产品数据管理、抽奖营销、评价审核等完整业务流程。

### 业务流程

```
商家 → 创建产品/分类 → 上传图片 → 设置标签
          ↓
用户 → 扫码进入 → 选择标签 → 生成AI评价 → 抽奖 → 上传评价截图审核 → 完成
```

### 核心价值

- 🤖 **AI评价生成** - 智能标签系统，一键生成个性化评价
- 📦 **产品管理** - 完整的产品分类和SKU管理
- 🏪 **多商家支持** - 支持多商家入驻和独立管理
- 🎰 **营销工具** - 抽奖码生成和核销，促进私域转化
- 📊 **数据分析** - 实时监控评价数据和用户活跃度
- 🔒 **评价审核** - 用户上传截图，OCR验证评价真实性

## ✨ 核心功能

### 1. 产品数据管理

#### 商家端功能
- ✅ **多级分类管理** - 支持无限层级分类树
- ✅ **产品CRUD** - 产品创建、查询、更新、删除
- ✅ **标签系统** - 预设标签，支持自定义
- ✅ **图片管理** - 每个产品最多9张图片
- ✅ **批量操作** - 批量上传、批量删除
- ✅ **搜索筛选** - 按名称、标签快速搜索

#### 小程序端功能
- ✅ **商家选择** - 优雅的商家选择界面
- ✅ **分类浏览** - 树形展示多级分类
- ✅ **产品查看** - 产品详情、标签、图片展示
- ✅ **智能缓存** - 分类和产品缓存
- ✅ **下拉刷新** - 支持手动刷新数据

### 2. AI评价生成

- ✅ **智能标签** - 根据类目动态推荐标签
- ✅ **多选支持** - 支持多标签组合
- ✅ **一键生成** - AI自动生成自然流畅的评价
- ✅ **配图生成** - 自动生成配图

### 3. 抽奖营销

- ✅ **抽奖码生成** - 商家批量生成
- ✅ **抽奖码核销** - 用户核销使用
- ✅ **状态跟踪** - 实时状态更新
- ✅ **数据统计** - 生成/核销数据统计

### 4. 评价审核

- ✅ **截图上传** - 用户上传美团/饿了么评价截图
- ✅ **OCR验证** - 自动提取截图文字进行验证
- ✅ **跳转引导** - 一键跳转到对应平台评价页面

### 5. 二维码系统

- ✅ **商家二维码** - 绑定商家信息
- ✅ **商品二维码** - 绑定商家+商品信息
- ✅ **扫码统计** - 记录扫码来源和数量

### 6. 用户认证

- ✅ **商家认证** - JWT认证，独立登录系统
- ✅ **微信登录** - 小程序一键登录
- ✅ **权限控制** - 基于角色的访问控制

### 7. 安全特性

- ✅ **API限流** - 防止DDoS攻击
- ✅ **输入验证** - 数据验证
- ✅ **密码加密** - bcrypt加密存储
- ✅ **CORS控制** - 跨域请求控制
- ✅ **多租户隔离** - 商家数据完全隔离

## 🛠 技术栈

### 后端服务

| 类别 | 技术 |
|------|------|
| **框架** | Express 4.18 + TypeScript 5.3 |
| **数据库** | MySQL 8.0 + Redis 7.0 |
| **认证** | JWT (jsonwebtoken) |
| **文件存储** | 本地存储 / 阿里云 OSS |
| **实时通信** | Socket.io |
| **AI服务** | DeepSeek API / 阿里云万相 |
| **安全** | Helmet + CORS + Rate Limiting |
| **测试** | Jest + Supertest |
| **部署** | Docker + Docker Compose + Nginx |

### 商家端

| 类别 | 技术 |
|------|------|
| **框架** | React 19 + TypeScript |
| **构建** | Vite |
| **路由** | React Router DOM v7 |
| **组件** | Lucide React |
| **HTTP** | Axios |
| **WebSocket** | Socket.io Client |

### 小程序端

| 类别 | 技术 |
|------|------|
| **平台** | 微信小程序原生框架 |
| **语言** | JavaScript (ES6+) |
| **样式** | WXSS |
| **状态管理** | globalData |
| **缓存** | wx.setStorageSync |

## 📁 项目结构

```
haopingbao/
├── backend/                      # 后端服务 (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── app.ts                # Express应用配置
│   │   ├── server.ts             # 服务器入口
│   │   ├── config/               # 配置文件
│   │   ├── controllers/          # 控制器
│   │   ├── database/             # 数据库
│   │   │   ├── migrations/       # 迁移文件
│   │   │   └── models/           # 数据模型
│   │   ├── middleware/           # 中间件
│   │   ├── routes/               # 路由
│   │   ├── services/             # 服务层
│   │   └── utils/                # 工具函数
│   ├── uploads/                  # 上传文件目录
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── README.md
│
├── shangjiaduan/                 # 商家端 (React + Vite)
│   ├── src/
│   │   ├── pages/                # 页面组件
│   │   ├── components/           # 公共组件
│   │   ├── services/             # API服务
│   │   └── types.ts              # 类型定义
│   ├── package.json
│   └── README.md
│
├── yonghuduan/                   # 用户端小程序
│   ├── miniprogram/              # 小程序代码
│   │   ├── pages/
│   │   │   ├── index/            # 首页（产品浏览/标签选择）
│   │   │   ├── merchant/         # 商家选择
│   │   │   ├── result/           # 评价结果（生成评价/配图）
│   │   │   ├── verify/           # 评价审核（上传截图）
│   │   │   ├── lottery/          # 抽奖
│   │   │   ├── guide/            # 操作指南
│   │   │   ├── success/          # 成功页面
│   │   │   └── error/            # 错误页面
│   │   ├── components/           # 组件
│   │   ├── utils/                # 工具函数
│   │   ├── app.js                # 小程序入口
│   │   └── app.json              # 全局配置
│   └── README.md
│
├── nginx/                        # Nginx 配置
│   └── nginx.conf
│
├── docs/                         # 文档目录
│   ├── plans/                    # 实现计划
│   ├── tasks/                    # 任务文档
│   └── api/                      # API文档
│
└── docker-compose.yml             # 容器编排配置
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **MySQL** >= 8.0
- **Redis** >= 7.0 (可选)
- **Docker** >= 20.10
- **微信开发者工具** (小程序开发)

### 1. 克隆项目

```bash
git clone <repository-url>
cd haopingbao
```

### 2. 使用 Docker 启动所有服务

```bash
# 启动 MySQL 数据库
docker run -d --name haopingbao-mysql \
  -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=your_password \
  -e MYSQL_DATABASE=haopingbao \
  mysql:8.0

# 启动 Redis (可选)
docker run -d --name haopingbao-redis \
  -p 6379:6379 \
  redis:7-alpine

# 启动后端服务
cd backend
npm install
cp .env.example .env
# 编辑 .env 文件配置数据库连接
npm run migrate  # 运行数据库迁移
npm run dev     # 启动开发服务器 (端口 8080)
```

### 3. 商家端

```bash
cd shangjiaduan

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

商家端将在 `http://localhost:3000` 启动

### 4. 小程序端

1. 打开**微信开发者工具**
2. 导入 `yonghuduan/miniprogram` 目录
3. 配置 `project.config.json` 中的 `appid`
4. 修改 `utils/api.js` 中的API地址
5. 点击"编译"运行

### 5. Docker 一键部署 (生产环境)

```bash
# 复制环境变量模板并配置
cp .env.example .env
# 编辑 .env 文件，配置数据库密码等

# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

服务启动后:
- 后端 API: http://localhost:8080
- 商家端: http://localhost:3000 (需要先构建)
- Nginx: http://localhost:80

### 6. 健康检查

```bash
curl http://localhost:8080/api/health
```

预期响应：
```json
{
  "status": "OK",
  "timestamp": "2026-03-12T...",
  "version": "1.0.0",
  "environment": "development"
}
```

## 🗄️ 数据库配置

### 数据库迁移

```bash
cd backend
npm run migrate
```

### 核心数据表

| 表名 | 描述 |
|------|------|
| `merchants` | 商家信息表 |
| `product_categories` | 产品分类表（多级树） |
| `product_items` | 产品表 |
| `product_images` | 产品图片表 |
| `product_tag_labels` | 评价标签表 |
| `lottery_codes` | 抽奖码表 |
| `lottery_records` | 抽奖记录表 |
| `qr_code_scans` | 二维码扫码记录表 |
| `reviews` | 评价记录表 |

### 多租户设计

- 每个商家拥有独立的 `merchant_id`
- 所有数据查询都通过 `merchant_id` 隔离
- 二维码签名包含商家ID和商品ID，防止伪造

## 📚 API文档

### 认证相关

```bash
# 商家登录
POST /api/merchant/auth/login
Body: { username, password }

# 商家注册
POST /api/merchant/auth/register
Body: { username, password, shopName }
```

### 产品管理（商家认证）

```bash
# 获取分类树
GET /api/merchant/categories
Headers: { Authorization: Bearer token }

# 创建分类
POST /api/merchant/categories
Body: { name, parentId? }

# 获取产品列表
GET /api/merchant/products?categoryId=:id

# 创建产品
POST /api/merchant/products
Body: { name, categoryId, tags[] }

# 上传产品图片
POST /api/merchant/products/:id/images
```

### 小程序API

```bash
# 获取商家列表
GET /api/merchants

# 获取分类树
GET /api/miniprogram/categories?merchantId=:id

# 获取产品列表
GET /api/miniprogram/products?merchantId=:id&categoryIds=:ids

# 获取评价标签
GET /api/miniprogram/tags?merchantId=:id

# 上传评价截图
POST /api/reviews/upload-screenshot

# 验证截图
POST /api/reviews/verify-screenshot
```

### 抽奖相关

```bash
# 获取抽奖状态
GET /api/lottery/status?userId=:id

# 抽奖
POST /api/lottery/draw

# 我的奖品
GET /api/lottery/my-prizes
```

### 二维码相关

```bash
# 生成商家二维码
POST /api/merchant/qrcode/generate
Body: { merchantId, expiresIn? }

# 生成商品二维码
POST /api/merchant/qrcode/generate-product
Body: { merchantId, productId }

# 批量生成商品二维码
POST /api/merchant/qrcode/batch-product
Body: { merchantId, productIds[] }
```

## 🐳 部署指南

### Docker 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (端口 80)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
       ┌──────▼──────┐          ┌───────▼──────┐
       │   商家端    │          │    后端 API  │
       │ (端口 3000) │          │  (端口 8080)  │
       └─────────────┘          └──────────────┘
                                         │
                               ┌─────────┴─────────┐
                               │                   │
                        ┌──────▼──────┐    ┌──────▼──────┐
                        │    MySQL    │    │    Redis    │
                        │ (端口 3306) │    │ (端口 6379)  │
                        └─────────────┘    └─────────────┘
```

### 生产环境检查清单

#### 后端服务
- [ ] 修改 `JWT_SECRET` 为强密码
- [ ] 配置正确的数据库连接
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置文件存储路径或OSS
- [ ] 启用 HTTPS
- [ ] 配置数据库备份

#### 商家端
- [ ] 更新 API 地址配置
- [ ] 构建生产版本 `npm run build`

#### 小程序端
- [ ] 配置服务器域名白名单
- [ ] 移除所有console.log（生产环境）
- [ ] 测试所有功能流程

## 📖 开发指南

### 后端开发

```bash
cd backend

# 安装依赖
npm install

# 运行测试
npm test

# 类型检查
npm run typecheck
```

### 商家端开发

```bash
cd shangjiaduan

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 小程序开发

- WXML 不支持数组方法，需使用 WXS
- 使用 `!important` 确保样式优先级
- 合理使用缓存优化性能

## � 更新日志

### v2.1.0 (2026-03-12)

**新增功能**:
- ✨ 评价审核功能 - 用户上传截图 OCR 验证
- ✨ 商品二维码 - 绑定商家+商品信息
- ✨ 抽奖页面集成
- ✨ 扫码统计功能

**改进**:
- 🔧 优化页面布局和用户体验
- 🔧 修复各类 Bug

### v2.0.0 (2026-02-16)

**新增功能**:
- ✨ 商家选择 UI 页面
- ✨ 产品数据管理完整功能
- ✨ 迁移版本锁定机制

## 📧 联系方式

- 提交 Issue
- 发送邮件至：support@haopingbao.com

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

<div align="center">

**好评宝团队** © 2026

Made with ❤️ by Haopingbao Team

</div>
