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
- [API文档](#api-文档)
- [部署指南](#部署指南)
- [开发指南](#开发指南)
- [文档](#文档)
- [贡献指南](#贡献指南)

## 🎯 项目简介

好评宝是一款全栈智能评价生成系统，由**商家端**、**用户端小程序**和**后端服务**三部分组成。系统支持AI智能评价生成、产品数据管理、抽奖营销等完整业务流程。

### 业务流程

```
商家 → 创建产品/分类 → 上传图片 → 设置标签
                      ↓
用户 → 浏览产品 → 选择标签 → 生成AI评价 → 获得抽奖码 → 联系客服
```

### 核心价值

- 🤖 **AI评价生成** - 智能标签系统，一键生成个性化评价
- 📦 **产品管理** - 完整的产品分类和SKU管理
- 🏪 **多商家支持** - 支持多商家入驻和独立管理
- 🎰 **营销工具** - 抽奖码生成和核销，促进私域转化
- 📊 **数据分析** - 实时监控评价数据和用户活跃度

## ✨ 核心功能

### 1. 产品数据管理

#### 商家端功能
- ✅ **多级分类管理** - 支持无限层级分类树（邻接表+path字段）
- ✅ **产品CRUD** - 产品创建、查询、更新、删除
- ✅ **标签系统** - 预设14个标签，支持自定义，最多20个
- ✅ **图片管理** - 每个产品最多9张图片，自动上传到OSS
- ✅ **批量操作** - 批量上传、批量删除
- ✅ **搜索筛选** - 按名称、标签快速搜索

#### 小程序端功能
- ✅ **商家选择** - 优雅的商家选择界面
- ✅ **分类浏览** - 树形展示多级分类
- ✅ **产品查看** - 产品详情、标签、图片展示
- ✅ **智能缓存** - 分类1小时、产品按需缓存
- ✅ **下拉刷新** - 支持手动刷新数据

### 2. AI评价生成

- ✅ **智能标签** - 根据类目动态推荐标签
- ✅ **多选支持** - 支持多标签组合
- ✅ **评分系统** - 1-5星评分
- ✅ **一键生成** - AI自动生成自然流畅的评价
- ✅ **内容安全** - 微信内容安全审核

### 3. 抽奖营销

- ✅ **抽奖码生成** - 商家批量生成
- ✅ **抽奖码核销** - 用户核销使用
- ✅ **状态跟踪** - 实时状态更新
- ✅ **数据统计** - 生成/核销数据统计

### 4. 用户认证

- ✅ **商家认证** - JWT认证，独立登录系统
- ✅ **微信登录** - 小程序一键登录
- ✅ **权限控制** - 基于角色的访问控制

### 5. 安全特性

- ✅ **API限流** - 防止DDoS攻击
- ✅ **输入验证** - Joi数据验证
- ✅ **密码加密** - bcrypt加密存储
- ✅ **CORS控制** - 跨域请求控制
- ✅ **Helmet.js** - HTTP安全头保护

## 🛠 技术栈

### 后端服务

| 类别 | 技术 |
|------|------|
| **框架** | Express 4.18 + TypeScript 5.3 |
| **数据库** | MySQL 8.0 + Redis 7.0 |
| **认证** | JWT (jsonwebtoken) |
| **文件存储** | 阿里云 OSS |
| **实时通信** | Socket.io |
| **AI服务** | DeepSeek API |
| **安全** | Helmet + CORS + Rate Limiting |
| **测试** | Jest + Supertest |
| **部署** | Docker + Docker Compose |

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
| **云函数** | Node.js 18+ (可选) |

## 📁 项目结构

```
haopingbaov4/
├── backend/                      # 后端服务
│   ├── src/
│   │   ├── app.ts                # Express应用配置
│   │   ├── server.ts             # 服务器入口
│   │   ├── config/               # 配置文件
│   │   ├── controllers/          # 控制器
│   │   │   ├── auth.ts           # 认证控制器
│   │   │   ├── productCategory.ts# 分类控制器
│   │   │   ├── productItem.ts    # 产品控制器
│   │   │   ├── productImage.ts   # 图片控制器
│   │   │   ├── miniprogramProduct.ts  # 小程序API
│   │   │   └── miniprogramMerchant.ts # 商家列表API
│   │   ├── database/             # 数据库
│   │   │   ├── connection.ts     # 数据库连接
│   │   │   ├── migrations/       # 迁移文件（带锁机制）
│   │   │   │   └── run.ts        # 迁移运行器
│   │   │   └── models/           # 数据模型
│   │   ├── middleware/           # 中间件
│   │   │   ├── auth.ts           # JWT认证
│   │   │   ├── rateLimit.ts      # 限流
│   │   │   └── responseHandler.ts # 响应处理
│   │   ├── routes/               # 路由
│   │   ├── services/             # 服务层
│   │   └── utils/                # 工具函数
│   │       └── configValidation.ts # 配置验证
│   ├── tests/                    # 测试文件
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── README.md                 # 后端文档
│
├── shangjiaduan/                 # 商家端 (React)
│   ├── src/
│   │   ├── pages/                # 页面组件
│   │   │   ├── ProductCategories.tsx  # 分类管理
│   │   │   └── ProductManager.tsx     # 产品管理
│   │   ├── components/           # 公共组件
│   │   │   ├── CategoryTree.tsx  # 分类树组件
│   │   │   └── ProductEditModal.tsx # 产品编辑
│   │   ├── services/             # API服务
│   │   └── types.ts              # 类型定义
│   ├── .env.example              # 环境变量模板
│   ├── package.json
│   └── README.md                 # 商家端文档
│
├── yonghuduan/                   # 用户端小程序
│   ├── miniprogram/              # 小程序代码
│   │   ├── pages/
│   │   │   ├── index/            # 首页（评价生成）
│   │   │   ├── merchant/         # 商家选择 ⭐新增
│   │   │   ├── result/           # 评价结果
│   │   │   ├── lottery/          # 抽奖
│   │   │   └── customer-service/ # 客服
│   │   ├── utils/
│   │   ├── app.js                # 小程序入口
│   │   └── app.json              # 全局配置
│   ├── cloudfunctions/           # 云函数
│   ├── project.config.json
│   └── README.md                 # 小程序文档
│
├── docs/                         # 文档目录
│   ├── README.md                 # 文档索引 ⭐新增
│   ├── plans/                    # 实现计划
│   │   └── 2026-02-15-product-data-integration.md
│   ├── task-2-implementation-plan.md
│   ├── task-15-e2e-test-guide.md
│   └── task-15-quick-start.md
│
└── README.md                     # 本文件
```

## 🚀 快速开始

### 环境要求

- **Node.js** >= 18.0.0
- **MySQL** >= 8.0
- **Redis** >= 7.0 (可选)
- **Docker** (可选)
- **微信开发者工具** (小程序开发)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/haopingbaov4.git
cd haopingbaov4
```

### 2. 后端服务

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库、JWT、OSS等

# 运行迁移
npm run migrate

# 启动开发服务器
npm run dev
```

后端服务将在 `http://localhost:5000` 启动

**详细文档**: [Backend README](backend/README.md)

### 3. 商家端

```bash
cd shangjiaduan

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，配置API地址等

# 启动开发服务器
npm run dev
```

商家端将在 `http://localhost:3000` 启动

**详细文档**: [商家端 README](shangjiaduan/README.md)

### 4. 小程序端

1. 打开**微信开发者工具**
2. 导入 `yonghuduan/miniprogram` 目录
3. 配置 `project.config.json` 中的 `appid`
4. 修改 `app.js` 中的API地址
5. 点击"编译"运行

**详细文档**: [小程序 README](yonghuduan/README.md)

### 5. 健康检查

```bash
curl http://localhost:5000/health
```

预期响应：
```json
{
  "status": "OK",
  "timestamp": "2026-02-16T...",
  "version": "1.0.0",
  "environment": "development"
}
```

## 🗄️ 数据库配置

### MySQL数据库迁移

```bash
cd backend
npm run migrate
```

**迁移特性**:
- ✅ 版本锁定（防止并发）
- ✅ 事务支持（失败回滚）
- ✅ 锁超时（10分钟自动释放）
- ✅ 幂等性（可重复运行）

### 数据库表结构

#### 核心表
- `merchants` - 商家信息表
- `product_categories` - 产品分类表（多级树）
- `product_items` - 产品表
- `product_images` - 产品图片表
- `migrations` - 迁移记录表
- `migration_locks` - 迁移锁表

#### 分类表结构

```sql
CREATE TABLE product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id INT,
  level INT DEFAULT 0,
  path VARCHAR(500),
  order_index INT DEFAULT 0,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (parent_id) REFERENCES product_categories(id)
);
```

**设计特点**:
- 邻接表 + path字段（支持无限层级）
- 外键约束保证数据完整性
- 索引优化查询性能

**详细文档**: [Backend README - 数据库迁移](backend/README.md#数据库迁移)

## 📚 API文档

### 认证相关

```bash
# 商家登录
POST /api/merchant/auth/login
Body: { username, password }
Response: { token, merchant }

# 商家注册
POST /api/merchant/auth/register
Body: { username, password, shopName }
```

### 产品管理（需商家认证）

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
Body: multipart/form-data
```

### 小程序API（公开，有限流）

```bash
# 获取商家列表
GET /api/merchants

# 获取分类树
GET /api/miniprogram/categories?merchantId=:id

# 获取产品列表
GET /api/miniprogram/products?merchantId=:id&categoryIds=:ids
```

**完整API文档**: [Backend README - API文档](backend/README.md#api-文档)

## 🐳 部署指南

### Docker部署

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境检查清单

#### 后端服务
- [ ] 修改 `JWT_SECRET` 为强密码
- [ ] 配置正确的 `FRONTEND_URL`
- [ ] 设置 `NODE_ENV=production`
- [ ] 配置阿里云OSS
- [ ] 启用 HTTPS
- [ ] 配置数据库备份

#### 商家端
- [ ] 更新 `VITE_API_BASE_URL`
- [ ] 更新 `VITE_SOCKET_URL`
- [ ] 构建生产版本 `npm run build`

#### 小程序端
- [ ] 配置服务器域名白名单
- [ ] 移除所有console.log
- [ ] 测试所有功能
- [ ] 准备审核材料

**详细文档**:
- [Backend部署](backend/README.md#部署)
- [商家端部署](shangjiaduan/README.md#生产环境部署)
- [小程序部署](yonghuduan/README.md#部署)

## 📖 开发指南

### 后端开发

**代码规范**:
- 使用TypeScript，严格类型检查
- 遵循RESTful API设计
- 统一错误处理
- 编写单元测试

**测试**:
```bash
cd backend
npm test                 # 运行测试
npm run test:coverage    # 覆盖率报告
```

**文档**: [Backend README](backend/README.md#开发指南)

### 商家端开发

**技术栈**: React 19 + TypeScript + Vite

**开发规范**:
- 使用函数组件 + Hooks
- 统一状态管理
- 响应式设计

**文档**: [商家端 README](shangjiaduan/README.md)

### 小程序开发

**技术栈**: 微信小程序原生框架

**注意事项**:
- WXML不支持数组方法，需使用WXS
- 使用`!important`确保样式优先级
- 合理使用缓存优化性能

**文档**: [小程序 README](yonghuduan/README.md#开发指南)

## 📚 文档

| 文档 | 描述 | 链接 |
|------|------|------|
| **项目文档索引** | 所有文档的中心索引 | [查看](docs/README.md) |
| **后端服务文档** | 后端API、部署、开发指南 | [查看](backend/README.md) |
| **商家端文档** | React应用文档 | [查看](shangjiaduan/README.md) |
| **小程序端文档** | 小程序开发文档 | [查看](yonghuduan/README.md) |
| **产品数据集成计划** | 产品管理功能实现计划 | [查看](docs/plans/2026-02-15-product-data-integration.md) |
| **E2E测试指南** | 端到端测试完整指南 | [查看](docs/task-15-e2e-test-guide.md) |
| **快速测试指南** | 5分钟快速测试流程 | [查看](docs/task-15-quick-start.md) |

## 🔒 安全建议

1. ✅ 定期更新依赖包
2. ✅ 使用HTTPS传输
3. ✅ 敏感信息使用环境变量
4. ✅ 启用API限流
5. ✅ 定期备份数据
6. ✅ 审查第三方依赖

## 🤝 贡献指南

欢迎贡献代码！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**提交信息规范**:
- `feat:` 新功能
- `fix:` 修复bug
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试相关
- `chore:` 构建/工具

## ❓ 常见问题

### Q: 数据库迁移失败？
A: 检查MySQL连接，确认数据库已创建。使用`npm run migrate`重新运行。

### Q: API请求被限流？
A: 小程序API默认限制100次/分钟，商家端API 200次/分钟。

### Q: 图片上传失败？
A: 检查OSS配置，确认Bucket已创建且有权限。

### Q: 小程序无法请求API？
A: 确认服务器域名已添加到微信小程序后台白名单。

### Q: 分类创建后看不到？
A: 刷新页面，检查浏览器控制台错误信息。

**更多问题**: 请查看各子项目的README文档

## 📝 更新日志

### v2.0.0 (2026-02-16)

**新增功能**:
- ✨ 商家选择UI页面
- ✨ 产品数据管理完整功能
- ✨ 迁移版本锁定机制
- ✨ OSS配置启动验证
- ✨ API地址环境变量配置

**改进**:
- 🔒 修复N+1查询问题
- 🔒 添加API限流保护
- 🔒 改进输入验证
- 🔒 增强错误处理

**文档**:
- 📚 完善各模块README
- 📚 添加文档索引

### v1.0.0
- 🎉 初始版本发布
- ✨ AI评价生成功能
- ✨ 基础产品管理

## 📧 联系方式

- 提交 [Issue](../../issues)
- 发送邮件至：support@haopingbao.com

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

<div align="center">

**好评宝团队** © 2026

Made with ❤️ by [Haopingbao Team]

</div>
