# 标签管理系统重构设计文档

**日期**: 2026-02-18
**设计者**: Claude
**状态**: 已批准

---

## 1. 需求概述

将标签从"与类目并列关系"重构为"归属于类目关系"，使标签成为类目的子节点。

### 核心需求

1. **数据关系**: 标签归属于类目（一对多）
2. **展示方式**: 按类目分组显示标签，每个类目一行，标签名称用逗号分隔
3. **数量限制**: 每个类目最多 6 个标签
4. **功能支持**: 创建标签、编辑标签、删除标签、批量添加标签

### 用户场景

```
男装（类目）
├── 好看（标签）
├── 挺拔（标签）
└── 材质好（标签）

水果（类目）
├── 新鲜（标签）
└── 甜美（标签）
```

---

## 2. 数据模型设计

### 数据库结构（复用 product_categories 表）

```sql
-- 类目（根级节点）
id: 1, name: "男装", parent_id: NULL, level: 0, path: "/1/"
id: 2, name: "水果", parent_id: NULL, level: 0, path: "/2/"

-- 标签（归属于类目）
id: 3, name: "好看", parent_id: 1, level: 1, path: "/1/3/" (归属于"男装")
id: 4, name: "挺拔", parent_id: 1, level: 1, path: "/1/4/" (归属于"男装")
id: 5, name: "新鲜", parent_id: 2, level: 1, path: "/2/5/" (归属于"水果")
```

### 定义规则

- **类目**: `parent_id IS NULL` 的根节点（`level = 0`）
- **标签**: `parent_id IS NOT NULL` 的子节点（`level = 1`）

### 数据约束

1. 每个类目最多 6 个标签（应用层验证）
2. 标签名称在同一类目下唯一
3. 删除类目时级联删除其下所有标签（CASCADE）

---

## 3. API 设计

### GET /api/merchant/tags
获取按类目分组的标签列表

**请求**: 无

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "男装",
      "tags": [
        { "id": 3, "name": "好看", "order_index": 0 },
        { "id": 4, "name": "挺拔", "order_index": 1 }
      ],
      "tag_count": 2
    },
    {
      "id": 2,
      "name": "水果",
      "tags": [
        { "id": 5, "name": "新鲜", "order_index": 0 }
      ],
      "tag_count": 1
    }
  ]
}
```

### POST /api/merchant/tags
创建单个标签

**请求**:
```json
{
  "name": "材质好",
  "categoryId": 1
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": 6,
    "name": "材质好",
    "category_id": 1
  },
  "message": "标签已创建"
}
```

### POST /api/merchant/tags/batch
批量添加标签

**请求**:
```json
{
  "categoryId": 1,
  "tags": ["好看", "挺拔", "材质好"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "created": 3,
    "tags": [
      { "id": 3, "name": "好看" },
      { "id": 4, "name": "挺拔" },
      { "id": 6, "name": "材质好" }
    ]
  },
  "message": "成功创建 3 个标签"
}
```

### POST /api/merchant/tags/rename
重命名标签

**请求**:
```json
{
  "tagId": 3,
  "newName": "非常好看"
}
```

**响应**:
```json
{
  "success": true,
  "message": "标签已重命名"
}
```

### DELETE /api/merchant/tags/:tagId
删除标签

**响应**:
```json
{
  "success": true,
  "message": "标签已删除"
}
```

### GET /api/merchant/categories
获取所有类目（用于下拉选择）

**响应**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "男装", "tag_count": 2 },
    { "id": 2, "name": "水果", "tag_count": 1 }
  ]
}
```

---

## 4. 前端界面设计

### 标签管理页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  标签管理                                      [添加标签] [批量添加]  │
├─────────────────────────────────────────────────────────────┤
│  ┌───┬──────┬──────────────────┬─────────┐                 │
│  │ID │ 类目  │    标签名称      │  操作    │                 │
│  ├───┼──────┼──────────────────┼─────────┤                 │
│  │ 1 │男装  │好看，挺拔，材质好  │[编辑][删除]│                 │
│  │ 2 │水果  │新鲜，甜美        │[编辑][删除]│                 │
│  └───┴──────┴──────────────────┴─────────┘                 │
│  总计：2 个类目，5 个标签                                    │
└─────────────────────────────────────────────────────────────┘
```

### 添加标签模态框

```
┌──────────────────────────────────────┐
│  新建标签                            │
├──────────────────────────────────────┤
│  类目: [▼选择类目] 男装/水果        │
│  标签名称: [_____________]           │
│  ──────────                         │
│              [取消] [保存]          │
└──────────────────────────────────────┘
```

### 批量添加标签模态框

```
┌──────────────────────────────────────┐
│  批量添加标签                         │
├──────────────────────────────────────┤
│  类目: [▼选择类目]                   │
│                                     │
│  标签列表（每行一个，最多6个）：       │
│  ┌────────────────────────────────┐│
│  │好看                           ││
│  │挺拔                           ││
│  │材质好                         ││
│  │                               ││
│  │                               ││
│  │                               ││
│  └────────────────────────────────┘│
│  当前已有：2/6                     │
│                                     │
│              [取消] [添加]          │
└──────────────────────────────────────┘
```

---

## 5. 数据流程设计

### 标签创建流程

```
用户点击"添加标签"
  → 打开模态框，显示类目下拉列表（GET /api/merchant/categories）
  → 用户选择类目、输入标签名称
  → 前端验证：标签名称非空、类目已选择
  → POST /api/merchant/tags { name, categoryId }
  → 后端验证：
     - 类目标签数量 < 6
     - 标签名称在类目内唯一
  → 插入 product_categories (parent_id = categoryId, level = 1)
  → 返回成功
  → 前端刷新标签列表
```

### 批量添加标签流程

```
用户点击"批量添加"
  → 打开模态框，显示类目下拉列表和6行输入框
  → 用户选择类目、输入多个标签名称（每行一个）
  → 前端验证：
     - 非空行数 ≤ 6
     - 类目已选择
  → POST /api/merchant/tags/batch { categoryId, tags: ["好看", "挺拔", ...] }
  → 后端验证：
     - 当前类目标签数 + 新增数 ≤ 6
     - 每个标签名称在类目内唯一
  → 批量插入 product_categories
  → 返回成功和新增的标签列表
  → 前端刷新标签列表
```

### 删除类目流程

```
用户点击"删除"按钮
  → 前端确认弹窗
  → DELETE /api/merchant/categories/:categoryId
  → 后端验证：
     - 检查是否有关联产品
  → 级联删除类目及其下所有标签（CASCADE）
  → 返回成功
  → 前端刷新标签列表
```

---

## 6. 核心组件设计

### 后端服务层（修改 TagService.ts）

```typescript
// 获取按类目分组的标签列表
static async getTagsByCategory(merchantId: number): Promise<CategoryWithTags[]>

// 创建标签：检查数量限制、唯一性
static async createTag(merchantId: number, categoryId: number, name: string): Promise<Tag>

// 批量创建标签：事务处理
static async batchCreateTags(merchantId: number, categoryId: number, tags: string[]): Promise<Tag[]>

// 重命名标签
static async updateTagName(tagId: number, newName: string): Promise<void>

// 删除类目及级联删除标签
static async deleteCategory(categoryId: number): Promise<void>
```

### 前端组件（Tags.tsx）

```typescript
// 状态管理
const [categoriesWithTags, setCategoriesWithTags] = useState<CategoryWithTags[]>([])
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
const [isBatchModalOpen, setIsBatchModalOpen] = useState(false)

// 关键函数
const fetchTags = async () => { /* 获取按类目分组的标签 */ }
const handleCreateTag = async (data) => { /* 创建单个标签 */ }
const handleBatchCreate = async (data) => { /* 批量创建标签 */ }
const handleDeleteCategory = async (categoryId) => { /* 删除类目 */ }
```

### 类型定义

```typescript
interface CategoryWithTags {
  id: number
  name: string
  tags: Tag[]
  tag_count: number
}

interface Tag {
  id: number
  name: string
  category_id: number
  order_index: number
}

interface CreateTagDto {
  name: string
  categoryId: number
  merchantId: number
}

interface BatchCreateTagsDto {
  categoryId: number
  tags: string[]
  merchantId: number
}
```

---

## 7. 技术选型

**方案选择**: 方案 A - 复用 ProductCategory 模型

**原因**:
1. 需求是"标签归属于类目"（一对多），不需要多对多关系
2. `ProductCategoryModel` 已完美支持层级结构
3. 不需要额外的数据库迁移，风险最小
4. 实现成本最低，只需修改 TagService 的查询逻辑

---

## 8. 实施计划

### 阶段 1: 后端实现
- 修改 TagService.ts 查询逻辑（使用 parent_id 区分类目和标签）
- 添加批量创建标签方法
- 更新 TagsController 添加批量接口
- 添加标签数量限制验证

### 阶段 2: 前端实现
- 更新 Tags.tsx 页面布局（按类目分组显示）
- 添加批量添加标签模态框
- 实现类目标签数统计显示

### 阶段 3: 测试验证
- 单元测试：TagService 方法
- 集成测试：API 端点
- 前端测试：用户交互流程

---

## 9. 成功标准

1. ✅ 标签按类目分组显示
2. ✅ 每个类目最多 6 个标签
3. ✅ 标签名称在同一类目内唯一
4. ✅ 批量添加标签功能正常
5. ✅ 删除类目级联删除标签
6. ✅ 前端界面符合设计稿

---

## 10. 风险评估

### 风险 1: 数据迁移问题
**影响**: 现有标签数据可能丢失
**缓解措施**: 备份数据库，测试环境验证迁移

### 风险 2: 性能问题
**影响**: 标签查询可能变慢
**缓解措施**: 添加适当的索引（parent_id, merchant_id）

### 风险 3: 用户理解偏差
**影响**: 用户可能不习惯新的界面
**缓解措施**: 提供清晰的操作提示和帮助文档

---

**文档版本**: v1.0
**最后更新**: 2026-02-18
