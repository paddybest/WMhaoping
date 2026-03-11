# Task 15: 快速测试启动指南

## 🚀 一键启动（在三个独立终端中运行）

### 终端 1: 启动后端
```bash
cd backend
npm run dev
```
✅ 看到 `Server running on port 5000` 表示成功

### 终端 2: 启动商家端
```bash
cd shangjiaduan
npm run dev
```
✅ 看到 `Local: http://localhost:3000` 表示成功

### 终端 3: 准备测试（可选）
```bash
# 查看 MySQL 状态
mysql -u root -p -e "SELECT 1"
```

---

## 🧪 5分钟快速测试流程

### 1️⃣ 访问商家端 (30秒)
- 打开浏览器: http://localhost:3000
- 登录商家账户

### 2️⃣ 创建分类 (1分钟)
- 访问: http://localhost:3000/products/categories
- 创建根分类: `服装`
- 创建子分类: `女装` → `夏季`
- ✅ 验证树形结构显示正确

### 3️⃣ 创建产品 (1分钟)
- 访问: http://localhost:3000/products/manager
- 选择"夏季"分类
- 点击"添加产品"
- 名称: `连衣裙`
- 标签: 舒适、透气、时尚
- ✅ 验证产品创建成功

### 4️⃣ 测试搜索 (30秒)
- 搜索框输入: `连衣裙`
- ✅ 验证搜索结果正确

### 5️⃣ 数据库验证 (1分钟)
```bash
mysql -u root -p haopingbao
```
```sql
-- 查看分类
SELECT id, name, parent_id, level, path FROM product_categories;

-- 查看产品
SELECT id, name, category_id, tags FROM product_items;

-- 查看外键约束
SELECT * FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_NAME = 'product_items';
```

### 6️⃣ 小程序验证 (1分钟)
- 打开微信开发者工具
- 导入 `yonghuduan` 目录
- 修改 `app.js` 中的 `apiBaseUrl` 为 `http://localhost:5000/api`
- 编译运行
- ✅ 查看控制台，确认分类数据加载

---

## ✅ 关键验证点

### 后端验证
```bash
# 测试分类 API
curl "http://localhost:5000/api/miniprogram/categories?merchantId=1"

# 测试产品 API (需要替换实际的 categoryId)
curl "http://localhost:5000/api/miniprogram/products?categoryId=1&merchantId=1"
```

### 前端验证
- [ ] 商家端登录成功
- [ ] 分类管理页面加载
- [ ] 产品管理页面加载
- [ ] 能创建分类树
- [ ] 能创建产品
- [ ] 搜索功能正常

### 小程序验证
- [ ] 小程序启动成功
- [ ] 控制台显示 "App launched"
- [ ] 下拉刷新触发
- [ ] 分类数据加载（从缓存或网络）

---

## 🐛 常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 后端启动失败 | 检查 MySQL 服务: `sudo systemctl status mysql` |
| CORS 错误 | 检查 `backend/src/app.ts` 中的 CORS 配置 |
| 数据库连接失败 | 检查 `backend/.env` 文件配置 |
| 小程序无法请求数据 | 开发工具中关闭"域名校验" |
| 图片上传失败 | 需要配置 OSS，或跳过此测试 |

---

## 📝 测试完成后

```bash
# 提交测试文档
git add docs/task-15-e2e-test-guide.md docs/task-15-quick-start.md
git commit -m "test: add e2e test guide and quick start reference"
```

---

## 📊 快速检查清单

```
□ 后端启动成功 (端口 5000)
□ 商家端启动成功 (端口 3000)
□ 创建根分类
□ 创建二级分类
□ 创建三级分类
□ 创建产品
□ 添加标签
□ 搜索产品
□ 数据库验证
□ 小程序加载
□ 下拉刷新
```

---

**预计测试时间**: 5-10 分钟
**测试状态**: ___________
**测试人员**: ___________
