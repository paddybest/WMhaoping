# 分类、产品、标签逻辑关系实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现分类-产品-标签的正确逻辑关系：标签属于分类（每个分类最多6个标签），产品在添加/编辑时可选择所在分类的标签

**Architecture:** 标签存储在独立的 product_tag_labels 表，通过 category_id 关联到 product_categories 表。产品编辑时根据选中的分类动态加载该分类的标签

**Tech Stack:** React, TypeScript, MySQL, Express

---

### Task 1: 修复标签管理页面（Tags.tsx）

**Files:**
- Modify: `shangjiaduan/pages/Tags.tsx`

**Step 1: 更新接口定义**

将 TagWithStats 类型更新为新的标签格式（包含 category_id）：

```tsx
// types.ts 中添加或更新
export interface Tag {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  product_count?: number;
}
```

**Step 2: 更新 Tags.tsx 使用新接口**

修改第 7 行：
```tsx
const [tags, setTags] = useState<Tag[]>([]);
```

**Step 3: 验证标签页面能正确显示**

测试：
1. 打开标签管理页面
2. 应该能看到已有的标签及其所属分类

**Step 4: 提交**
```bash
git add shangjiaduan/pages/Tags.tsx shangjiaduan/types.ts
git commit -m "fix: update Tags page to use new tag interface"
```

---

### Task 2: 验证后端 API

**Files:**
- Test: `GET /api/merchant/tags/by-category/:categoryId`

**Step 1: 测试获取分类标签 API**

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/merchant/tags/by-category/1
```

预期返回该分类下的标签数组

**Step 2: 测试创建标签 API**

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"舒适", "categoryId":1}' \
  http://localhost:8080/api/merchant/tags
```

预期：创建成功，返回新标签

**Step 3: 测试标签数量限制**

尝试为同一分类创建超过 6 个标签，验证返回错误信息"每个分类最多6个标签已达上限"

**Step 4: 提交**
```bash
git commit --allow-empty -m "test: verify tag APIs work correctly"
```

---

### Task 3: 验证产品编辑时标签加载

**Files:**
- Test: `shangjiaduan/pages/ProductManagement.tsx`

**Step 1: 在分类下创建测试标签**

1. 打开标签管理页面
2. 为某个分类（如"男装"）创建 3-6 个标签

**Step 2: 在商品管理页面测试**

1. 选择该分类
2. 点击"添加产品"
3. 验证 Modal 中显示的是该分类的标签（而非预设标签）
4. 验证可以选择多个标签

**Step 3: 测试编辑已有产品**

1. 选择有产品的分类
2. 编辑某个产品
3. 验证标签显示正确且可修改

**Step 4: 提交**
```bash
git commit --allow-empty -m "test: verify product tag selection works"
```

---

### Task 4: 完善产品列表显示

**Files:**
- Modify: `shangjiaduan/pages/ProductManagement.tsx`

**Step 1: 更新产品卡片显示**

产品卡片已显示 tags，需要确保格式正确。检查第 328-333 行：
```tsx
{product.tags.slice(0, 3).map(tag => (
  <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">{tag}</span>
))}
```

**Step 2: 提交**
```bash
git add shangjiaduan/pages/ProductManagement.tsx
git commit -m "fix: ensure product tags display correctly"
```

---

### Task 5: 清理和优化（可选）

**Files:**
- Cleanup: `shangjiaduan/components/ProductEditModal.tsx`

**Step 1: 检查是否移除预设标签逻辑**

确认当 tags 为空时不再使用预设标签（因为每个分类都应该有标签）

**Step 2: 验证构建**

```bash
cd shangjiaduan && npm run build
```

**Step 3: 提交**
```bash
git commit --allow-empty -m "refactor: clean up tag logic"
```

---

## 测试检查清单

- [ ] 标签管理页面能正确显示所有标签及其所属分类
- [ ] 能为分类创建新标签（最多6个）
- [ ] 超过6个标签时显示错误提示
- [ ] 商品管理页面选择分类后，添加产品时显示该分类的标签
- [ ] 编辑产品时能正确显示和修改标签
- [ ] 产品列表中正确显示已选标签

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-19-tag-category-product-relation.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
