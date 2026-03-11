# 产品数据集成设计文档

**项目**: 好评宝 (Haopingbao)
**日期**: 2026-02-15
**版本**: v1.0
**作者**: Claude

---

## 概述

本文档描述如何打通商家网页端和用户小程序端的数据，实现商家可以管理小程序的产品类型、产品名称以及对应的评价标签和图片。

### 核心需求

1. **多级分类树** - 支持层级分类（如：服装 → 女装 → 夏季 → 连衣裙）
2. **图片和标签关联** - 仅叶子节点产品可关联图片和评价标签
3. **数据同步** - 小程序启动时主动从后端拉取
4. **商家隔离** - 每个商家有独立的产品库

### 技术方案

采用**邻接表 + 单表增强**方案：
- 使用 `parent_id` 实现层级关系
- 使用 `path` 字段优化子树查询
- 符合关系型数据库范式
- 平衡查询性能和实现复杂度

---

## 1. 数据模型设计

### 1.1 数据库表结构

#### product_categories 表（分类树）

```sql
CREATE TABLE product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,                    -- 商家ID，实现数据隔离
  name VARCHAR(255) NOT NULL,                  -- 分类名称
  parent_id INT DEFAULT NULL,                  -- 父分类ID，NULL表示根节点
  level INT NOT NULL DEFAULT 0,                -- 层级深度（0为根节点）
  path VARCHAR(500) NOT NULL DEFAULT '/',      -- 路径（如 /1/3/5/）
  order_index INT DEFAULT 0,                   -- 同级排序
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE CASCADE,
  INDEX idx_merchant_parent (merchant_id, parent_id),
  INDEX idx_path (path(255))
);
```

#### product_items 表（产品项）

```sql
CREATE TABLE product_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,                    -- 商家ID
  category_id INT NOT NULL,                    -- 所属分类（必须是叶子节点）
  name VARCHAR(255) NOT NULL,                  -- 产品名称
  tags JSON,                                   -- 评价标签（如 ["舒适","透气"]）
  is_active BOOLEAN DEFAULT TRUE,              -- 是否启用
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE,
  INDEX idx_merchant_category (merchant_id, category_id)
);
```

#### product_images 表（产品图片）

```sql
CREATE TABLE product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,                     -- 关联的产品项ID
  image_url VARCHAR(500) NOT NULL,             -- 图片URL（OSS地址）
  oss_file_id VARCHAR(500),                    -- OSS文件ID
  order_index INT DEFAULT 0,                   -- 显示顺序
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES product_items(id) ON DELETE CASCADE,
  INDEX idx_product_order (product_id, order_index)
);
```

### 1.2 数据关系示例

```
merchant_id = 1 (商家A)
├── path = /1/        (根分类: 服装)
│   ├── path = /1/2/    (二级: 女装)
│   │   ├── path = /1/2/4/  (三级: 夏季)
│   │   │   └── product_item: 连衣裙
│   │   │       ├── tags: ["舒适", "透气", "时尚"]
│   │   │       └── images: [url1, url2, url3]
│   │   └── path = /1/2/5/  (三级: 冬季)
│   │       └── product_item: 羽绒服
│   └── path = /1/3/    (二级: 男装)
```

---

## 2. API 接口设计

### 2.1 商家端 API（产品管理）

#### 分类管理

```typescript
// 获取商家的分类树
GET /api/merchant/categories
Response: {
  categories: Array<{
    id: number,
    name: string,
    parentId: number | null,
    level: number,
    path: string,
    orderIndex: number,
    children?: Array  // 树形结构
  }>
}

// 创建分类
POST /api/merchant/categories
Body: {
  name: string,
  parentId?: number  // 可选，不传则创建根分类
}
Response: { category }

// 更新分类
PUT /api/merchant/categories/:id
Body: {
  name?: string,
  parentId?: number,
  orderIndex?: number
}

// 删除分类
DELETE /api/merchant/categories/:id
// 只能删除没有子分类且没有关联产品的分类
```

#### 产品管理

```typescript
// 获取分类下的产品列表
GET /api/merchant/products?categoryId=:id
Response: {
  products: Array<{
    id: number,
    name: string,
    categoryId: number,
    tags: string[],
    imageCount: number,
    isActive: boolean,
    createdAt: string
  }>
}

// 创建产品
POST /api/merchant/products
Body: {
  categoryId: number,  // 必须是叶子节点分类
  name: string,
  tags: string[]
}

// 更新产品
PUT /api/merchant/products/:id
Body: {
  name?: string,
  tags?: string[],
  isActive?: boolean
}

// 删除产品
DELETE /api/merchant/products/:id
```

#### 图片管理

```typescript
// 上传产品图片
POST /api/merchant/products/:id/images
Body: multipart/form-data (file)
Response: {
  image: {
    id: number,
    imageUrl: string,
    ossFileId: string,
    orderIndex: number
  }
}

// 获取产品图片列表
GET /api/merchant/products/:id/images

// 删除图片
DELETE /api/merchant/products/:productId/images/:imageId

// 调整图片顺序
PUT /api/merchant/products/:id/images/order
Body: {
  imageIds: number[]  // 按新顺序排列的图片ID
}
```

### 2.2 小程序端 API（数据拉取）

```typescript
// 获取产品分类树（只读）
GET /api/miniprogram/categories
Response: {
  categories: Array<{
    id: number,
    name: string,
    level: number,
    path: string,
    hasProducts: boolean,  // 是否有产品
    children?: Array
  }>
}

// 根据分类获取产品列表
GET /api/miniprogram/products?categoryId=:id&merchantId=:merchantId
Response: {
  products: Array<{
    id: number,
    name: string,
    tags: string[],
    images: string[],  // 图片URL数组
    categoryId: number
  }>
}

// 批量获取多个产品（用于缓存预加载）
GET /api/miniprogram/products/batch?ids=:id1,id2,id3
```

---

## 3. 商家端界面设计

### 3.1 分类管理页面

**页面布局：**
- 左侧：分类树形列表
  - 显示层级缩进
  - 支持拖拽排序
  - 支持折叠/展开
  - 右键菜单：添加子分类、编辑、删除
- 右侧：选中分类的详情
  - 分类名称编辑
  - 查看该分类下的产品数量

**操作流程：**
1. 商家点击"添加分类" → 弹出对话框
2. 输入分类名称、选择父分类（可选）
3. 提交 → 后端验证 → 更新分类树
4. 前端自动刷新树形列表

### 3.2 产品管理页面

**页面组件：**
```tsx
<ProductManager>
  {/* 顶部：筛选和搜索 */}
  <FilterBar>
    <CategorySelect />  {/* 分类下拉选择 */}
    <SearchInput />     {/* 产品名称搜索 */}
    <AddProductButton />
  </FilterBar>

  {/* 中部：产品列表 */}
  <ProductList>
    {products.map(product => (
      <ProductCard
        name={product.name}
        categoryPath={product.categoryPath}
        tags={product.tags}
        thumbnail={product.images[0]}
        imageCount={product.images.length}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    ))}
  </ProductList>

  {/* 编辑弹窗 */}
  <ProductEditModal>
    <TextInput label="产品名称" />
    <CategorySelector />  {/* 选择分类（仅叶子节点） */}
    <TagSelector />        {/* 多选评价标签 */}
    <ImageUploader />      {/* 图片上传和管理 */}
  </ProductEditModal>
</ProductManager>
```

**图片管理功能：**
- 支持多图上传（最多9张）
- 拖拽排序
- 点击预览
- 单张删除
- OSS 直传，减轻服务器压力

### 3.3 标签管理

**标签选择器：**
- 预设常用标签库
- 支持自定义输入新标签
- 标签颜色分类（可选）
- 拖拽排序

**预设标签示例：**
```
服装类：舒适、透气、时尚、百搭、显瘦、修身...
数码类：高性能、轻薄、长续航、拍照好...
美妆类：保湿、美白、抗衰老、敏感肌友好...
```

---

## 4. 数据流和同步机制

### 4.1 商家端数据流程

```
1. 创建/编辑分类
   商家操作 → 前端验证 → API请求 → 后端验证 → 数据库更新
                                           ↓
                                    重新计算path字段
                                           ↓
                                    返回完整分类树

2. 创建/编辑产品
   商家操作 → 选择分类（叶子节点） → 添加标签和图片
                                           ↓
                         前端：图片直传OSS → 获取URL
                                           ↓
                         API请求（含图片URL） → 数据库事务
                                           ↓
                                    插入product_items
                                           ↓
                                    批量插入product_images
                                           ↓
                                    返回成功

3. 删除操作
   分类删除：检查是否有子分类或产品 → 有则拒绝 → 无则删除
   产品删除：数据库级联删除关联图片 → 删除OSS文件（异步）
```

### 4.2 小程序端数据拉取流程

```
启动流程：
  App.onLaunch()
     ↓
  检查本地缓存（wx.getStorageSync）
     ↓
  判断缓存是否过期（如：超过1小时）
     ↓
  [无缓存或过期] → 调用API拉取最新数据
     ↓
  并发请求：
     ├─ GET /api/miniprogram/categories
     └─ GET /api/miniprogram/merchants  // 获取可用商家列表
     ↓
  数据存储到本地缓存
     ↓
  渲染页面


用户选择流程：
  1. 选择商家 → 显示该商家的分类树
  2. 选择分类 → 显示该分类的产品列表
  3. 选择产品 → 显示产品详情（图片、标签）
  4. 选择标签 → 调用AI生成评价


缓存策略：
  - 分类树：缓存1小时
  - 产品列表：缓存30分钟
  - 商家列表：缓存24小时
  - 提供下拉刷新手动更新
```

### 4.3 数据一致性保证

**后端层面：**
1. **事务处理** - 产品创建使用事务保证原子性
2. **外键约束** - 数据库级联删除保证数据一致性
3. **乐观锁** - 使用 `updated_at` 字段防止并发冲突

**前端层面：**
1. **版本标识** - API返回数据版本号（如 `categories-v-{timestamp}`）
2. **增量更新** - 小程序对比版本号，只拉取变更数据（未来优化）
3. **错误重试** - 请求失败自动重试3次，指数退避

---

## 5. 错误处理、测试和安全性

### 5.1 错误处理

#### 商家端错误处理

**分类验证：**
- 删除分类时：
  - ✗ "该分类下有子分类，无法删除"
  - ✗ "该分类下有产品，无法删除"
  - ✗ "分类不存在或无权访问"

**产品验证：**
- 创建产品时：
  - ✗ "所选分类不是叶子节点"
  - ✗ "产品名称不能为空"
  - ✗ "至少添加一个标签"

**图片上传：**
- 文件验证：
  - ✗ "图片大小不能超过5MB"
  - ✗ "仅支持 JPG、PNG 格式"
  - ✗ "每个产品最多上传9张图片"

**OSS 上传失败：**
- 回滚数据库记录
- 提示用户重试

#### 小程序端错误处理

- **网络错误** → 显示"网络异常，请检查网络连接" + 提供重试按钮
- **数据为空** → 显示"暂无产品数据" + 提供刷新按钮
- **缓存读取失败** → 降级到API直接请求 + 记录错误日志

### 5.2 测试策略

#### 后端测试

```typescript
// 单元测试
- CategoryService: 测试path计算、层级验证
- ProductService: 测试CRUD、关联操作
- ImageService: 测试OSS上传、删除

// 集成测试
- 完整的产品创建流程（含图片）
- 分类树查询性能
- 商家数据隔离验证
- 并发操作测试
```

#### 前端测试

```typescript
// 组件测试
- CategoryTree: 渲染、选择、拖拽
- ProductCard: 显示、编辑、删除
- ImageUploader: 上传、排序、删除

// E2E测试
- 商家登录 → 创建分类 → 创建产品 → 上传图片
- 小程序启动 → 选择分类 → 查看产品
```

### 5.3 安全性措施

#### 商家端

1. **认证授权**
   - JWT token验证
   - 仅登录商家可访问
   - 验证商家只能操作自己的数据（merchant_id验证）

2. **输入验证**
   - 分类名称：1-50字符，防止XSS
   - 标签：每个标签1-20字符，最多20个
   - 文件上传：验证MIME类型、文件大小

3. **SQL注入防护**
   - 使用参数化查询（TypeORM/MySQL2）
   - 不拼接SQL语句

#### 小程序端

1. **只读接口**
   - 所有API为GET请求，无写操作
   - 商家ID通过参数传递，验证有效性

2. **内容安全**
   - 微信内容安全审核（已集成）
   - 过滤敏感词汇

---

## 6. 实施计划

### Phase 1: 数据库和后端 API
- 创建数据库表和迁移脚本
- 实现分类管理 API
- 实现产品管理 API
- 实现图片上传和管理 API
- 实现小程序端查询 API

### Phase 2: 商家端界面
- 分类管理页面
- 产品管理页面
- 图片上传组件
- 标签选择组件

### Phase 3: 小程序端集成
- 数据拉取逻辑
- 本地缓存机制
- 分类和产品展示
- 下拉刷新功能

### Phase 4: 测试和优化
- 单元测试和集成测试
- 性能优化
- 错误处理完善
- 文档更新

---

## 附录

### A. Path 字段计算逻辑

```typescript
// 创建分类时计算 path
function calculatePath(parentId: number | null): string {
  if (!parentId) {
    return `/${newId}/`;
  }

  const parent = await getCategory(parentId);
  return `${parent.path}${newId}/`;
}

// 查询某个分类的所有子孙
function getDescendants(categoryId: number) {
  const category = await getCategory(categoryId);
  return db.query(`
    SELECT * FROM product_categories
    WHERE path LIKE ?
    ORDER BY path
  `, [`${category.path}%`]);
}
```

### B. 数据迁移脚本

需要从现有的 `products` 表迁移数据到新的表结构。

---

**文档结束**
