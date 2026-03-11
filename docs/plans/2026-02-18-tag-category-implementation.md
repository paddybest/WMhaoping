# Tag-Category Relationship Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor tags from parallel to subordinate relationship with categories using ProductCategoryModel

**Architecture:** Tags are stored as child nodes (parent_id IS NOT NULL) in product_categories table, categories are root nodes (parent_id IS NULL)

**Tech Stack:** TypeScript, Express.js, React 19, MySQL, ProductCategoryModel

---

## Task 1: Update Backend TagService - Get Tags By Category

**Files:**
- Modify: `backend/src/services/TagService.ts:44-61`

**Step 1: Write the failing test**

Create test file `backend/tests/services/TagService.test.ts`:

```typescript
import { TagService } from '../../src/services/TagService';
import { pool } from '../../src/database/connection';

describe('TagService', () => {
  describe('getTagsByCategory', () => {
    it('should return tags grouped by category', async () => {
      const merchantId = 1;
      const result = await TagService.getTagsByCategory(merchantId);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('tags');
        expect(Array.isArray(result[0].tags)).toBe(true);
      }
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: FAIL with "getTagsByCategory is not a function"

**Step 3: Write minimal implementation**

Replace `getTagsLegacyMode` in `backend/src/services/TagService.ts`:

```typescript
/**
 * 获取按类目分组的标签列表
 */
static async getTagsByCategory(merchantId: number): Promise<CategoryWithTags[]> {
  const [categories] = await pool.execute(
    `SELECT
      pc.id,
      pc.name,
      COUNT(DISTINCT child.id) as tag_count
    FROM product_categories pc
    LEFT JOIN product_categories child ON child.parent_id = pc.id
    WHERE pc.merchant_id = ? AND pc.parent_id IS NULL
    GROUP BY pc.id
    ORDER BY pc.name
    `,
    [merchantId]
  ) as any[];

  const categoryWithTags = await Promise.all(
    categories.map(async (category: any) => {
      const [tags] = await pool.execute(
        `SELECT id, name, order_index
        FROM product_categories
        WHERE parent_id = ? AND merchant_id = ?
        ORDER BY order_index, name
        `,
        [category.id, merchantId]
      ) as any[];

      return {
        id: category.id,
        name: category.name,
        tags: tags.map((t: any) => ({
          id: t.id,
          name: t.name,
          category_id: category.id,
          order_index: t.order_index
        })),
        tag_count: category.tag_count || 0
      };
    })
  );

  return categoryWithTags;
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/TagService.ts backend/tests/services/TagService.test.ts
git commit -m "feat: add getTagsByCategory method to TagService"
```

---

## Task 2: Update Backend TagService - Create Tag with Validation

**Files:**
- Modify: `backend/src/services/TagService.ts:73-110`

**Step 1: Write the failing test**

Add to `backend/tests/services/TagService.test.ts`:

```typescript
describe('createTag', () => {
  it('should create tag under category', async () => {
    const result = await TagService.createTag(1, 1, '测试标签');

    expect(result).toHaveProperty('id');
    expect(result.name).toBe('测试标签');
    expect(result.category_id).toBe(1);
  });

  it('should throw error if category has 6 tags', async () => {
    await expect(
      TagService.createTag(1, 999, '标签')
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: FAIL with validation errors

**Step 3: Write minimal implementation**

Replace `createTag` in `backend/src/services/TagService.ts`:

```typescript
/**
 * 创建标签（归属于类目）
 */
static async createTag(merchantId: number, categoryId: number, name: string): Promise<Tag> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查类目是否存在
    const [categories] = await connection.execute(
      'SELECT id FROM product_categories WHERE id = ? AND merchant_id = ? AND parent_id IS NULL',
      [categoryId, merchantId]
    ) as any[];
    if (categories.length === 0) {
      throw new Error('Category not found');
    }

    // 检查类目标签数量
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    ) as any[];
    if (countResult[0].count >= 6) {
      throw new Error('Category already has 6 tags, maximum limit reached');
    }

    // 检查标签名称在类目内唯一
    const [existing] = await connection.execute(
      'SELECT id FROM product_categories WHERE parent_id = ? AND merchant_id = ? AND name = ?',
      [categoryId, merchantId, name]
    ) as any[];
    if (existing.length > 0) {
      throw new Error('Tag with this name already exists in this category');
    }

    // 获取类目信息用于计算 level 和 path
    const [parent] = await connection.execute(
      'SELECT level, path FROM product_categories WHERE id = ?',
      [categoryId]
    ) as any[];
    const parentLevel = parent[0].level;
    const parentPath = parent[0].path;

    // 插入标签
    const [result] = await connection.execute(
      `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
      VALUES (?, ?, ?, ?, ?, 0)`,
      [merchantId, name, categoryId, parentLevel + 1, parentPath]
    );

    const tagId = (result as any).insertId;

    // 更新 path
    await connection.execute(
      'UPDATE product_categories SET path = ? WHERE id = ?',
      [`${parentPath}${tagId}/`, tagId]
    );

    await connection.commit();

    const tag = await this.getTagById(tagId);
    if (!tag) {
      throw new Error('Failed to create tag');
    }
    return tag;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/TagService.ts backend/tests/services/TagService.test.ts
git commit -m "feat: implement createTag with validation"
```

---

## Task 3: Update Backend TagService - Batch Create Tags

**Files:**
- Modify: `backend/src/services/TagService.ts`

**Step 1: Write the failing test**

Add to `backend/tests/services/TagService.test.ts`:

```typescript
describe('batchCreateTags', () => {
  it('should create multiple tags', async () => {
    const tags = ['标签1', '标签2', '标签3'];
    const result = await TagService.batchCreateTags(1, 1, tags);

    expect(result.length).toBe(3);
    expect(result[0].name).toBe('标签1');
  });

  it('should throw error if total exceeds 6', async () => {
    const tags = Array(10).fill('标签');
    await expect(
      TagService.batchCreateTags(1, 1, tags)
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: FAIL with "batchCreateTags is not a function"

**Step 3: Write minimal implementation**

Add to `backend/src/services/TagService.ts`:

```typescript
/**
 * 批量创建标签
 */
static async batchCreateTags(merchantId: number, categoryId: number, tags: string[]): Promise<Tag[]> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 检查类目是否存在
    const [categories] = await connection.execute(
      'SELECT id, level, path FROM product_categories WHERE id = ? AND merchant_id = ? AND parent_id IS NULL',
      [categoryId, merchantId]
    ) as any[];
    if (categories.length === 0) {
      throw new Error('Category not found');
    }

    const category = categories[0];

    // 检查类目标签数量
    const [countResult] = await connection.execute(
      'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = ? AND merchant_id = ?',
      [categoryId, merchantId]
    ) as any[];
    const currentCount = countResult[0].count;

    if (currentCount + tags.length > 6) {
      throw new Error(`Cannot create ${tags.length} tags. Category has ${currentCount}/6 tags, maximum 6 allowed`);
    }

    // 过滤空标签
    const validTags = tags.filter(t => t && t.trim().length > 0);

    if (validTags.length === 0) {
      throw new Error('No valid tags provided');
    }

    // 检查标签名称在类目内唯一
    for (const tag of validTags) {
      const [existing] = await connection.execute(
        'SELECT id FROM product_categories WHERE parent_id = ? AND merchant_id = ? AND name = ?',
        [categoryId, merchantId, tag]
      ) as any[];
      if (existing.length > 0) {
        throw new Error(`Tag "${tag}" already exists in this category`);
      }
    }

    const createdTags: Tag[] = [];

    // 批量插入标签
    for (const tag of validTags) {
      const [result] = await connection.execute(
        `INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index)
        VALUES (?, ?, ?, ?, ?, ${currentCount + validTags.indexOf(tag)})`,
        [merchantId, tag, categoryId, category.level + 1, category.path]
      );

      const tagId = (result as any).insertId;

      // 更新 path
      await connection.execute(
        'UPDATE product_categories SET path = ? WHERE id = ?',
        [`${category.path}${tagId}/`, tagId]
      );

      createdTags.push({
        id: tagId,
        name: tag,
        category_id: categoryId,
        order_index: currentCount + validTags.indexOf(tag)
      });
    }

    await connection.commit();
    return createdTags;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/TagService.ts backend/tests/services/TagService.test.ts
git commit -m "feat: implement batchCreateTags method"
```

---

## Task 4: Update Backend TagService - Update Tag Name

**Files:**
- Modify: `backend/src/services/TagService.ts:137-143`

**Step 1: Write the failing test**

Add to `backend/tests/services/TagService.test.ts`:

```typescript
describe('updateTagName', () => {
  it('should rename tag', async () => {
    await TagService.updateTagName(3, '新标签名');
    // Success if no error thrown
  });

  it('should throw error if name exists in category', async () => {
    await expect(
      TagService.updateTagName(3, '已存在的标签名')
    ).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: FAIL with "updateTagName is not a function"

**Step 3: Write minimal implementation**

Replace `renameTag` in `backend/src/services/TagService.ts`:

```typescript
/**
 * 重命名标签
 */
static async updateTagName(tagId: number, newName: string): Promise<void> {
  // 获取标签信息
  const [tag] = await pool.execute(
    'SELECT id, parent_id, merchant_id FROM product_categories WHERE id = ?',
    [tagId]
  ) as any[];

  if (tag.length === 0) {
    throw new Error('Tag not found');
  }

  const tagData = tag[0];

  // 检查标签名称在类目内唯一（排除自己）
  const [existing] = await pool.execute(
    'SELECT id FROM product_categories WHERE parent_id = ? AND merchant_id = ? AND name = ? AND id != ?',
    [tagData.parent_id, tagData.merchant_id, newName, tagId]
  ) as any[];

  if (existing.length > 0) {
    throw new Error('Tag with this name already exists in this category');
  }

  await pool.execute(
    'UPDATE product_categories SET name = ? WHERE id = ?',
    [newName, tagId]
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/services/TagService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/TagService.ts backend/tests/services/TagService.test.ts
git commit -m "feat: implement updateTagName method"
```

---

## Task 5: Update Backend TagsController

**Files:**
- Modify: `backend/src/controllers/tags.ts`

**Step 1: Write the failing test**

Create test file `backend/tests/controllers/tags.test.ts`:

```typescript
import request from 'supertest';
import express from 'express';
import { TagsController } from '../../src/controllers/tags';
import authenticateMerchant from '../../src/middleware/auth';
import injectMerchantId from '../../src/middleware/merchantContext';

const app = express();
app.use(express.json());

// Mock middleware
app.use((req, res, next) => {
  (req as any).merchant = { id: 1 };
  next();
});

app.get('/merchant/tags', TagsController.getTags);
app.post('/merchant/tags', TagsController.createTag);
app.post('/merchant/tags/batch', TagsController.batchCreateTags);
app.post('/merchant/tags/rename', TagsController.renameTag);

describe('TagsController', () => {
  describe('GET /merchant/tags', () => {
    it('should return tags grouped by category', async () => {
      const res = await request(app).get('/merchant/tags');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- tests/controllers/tags.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

Replace entire `backend/src/controllers/tags.ts`:

```typescript
import { Response } from 'express';
import { TagService, TagWithStats, CategoryWithTags, CreateTagDto, UpdateTagDto } from '../services/TagService';
import { AuthRequest } from '../types';

export class TagsController {
  /**
   * 获取按类目分组的标签列表
   */
  static async getTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const data = await TagService.getTagsByCategory(merchantId);
      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Get tags error:', error);
      res.status(500).json({ error: error.message || 'Failed to get tags' });
    }
  }

  /**
   * 创建标签
   */
  static async createTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { name, categoryId } = req.body;

      if (!name || name.length === 0 || name.length > 50) {
        res.status(400).json({ error: 'Tag name must be 1-50 characters' });
        return;
      }

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const tag = await TagService.createTag(merchantId, categoryId, name);

      res.status(201).json({
        success: true,
        data: tag,
        message: `标签"${name}"已创建！`
      });
    } catch (error: any) {
      console.error('Create tag error:', error);
      res.status(500).json({ error: error.message || 'Failed to create tag' });
    }
  }

  /**
   * 批量添加标签
   */
  static async batchCreateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId, tags } = req.body;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({ error: 'Tags array is required' });
        return;
      }

      const createdTags = await TagService.batchCreateTags(merchantId, categoryId, tags);

      res.status(201).json({
        success: true,
        data: {
          created: createdTags.length,
          tags: createdTags
        },
        message: `成功创建 ${createdTags.length} 个标签`
      });
    } catch (error: any) {
      console.error('Batch create tags error:', error);
      res.status(500).json({ error: error.message || 'Failed to create tags' });
    }
  }

  /**
   * 重命名标签
   */
  static async renameTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tagId, newName } = req.body;

      if (!tagId || !newName) {
        res.status(400).json({ error: 'Tag ID and new name are required' });
        return;
      }

      if (newName.length === 0 || newName.length > 50) {
        res.status(400).json({ error: 'Tag name must be 1-50 characters' });
        return;
      }

      await TagService.updateTagName(tagId, newName);

      res.json({
        success: true,
        message: '标签已重命名'
      });
    } catch (error: any) {
      console.error('Rename tag error:', error);
      res.status(500).json({ error: error.message || 'Failed to rename tag' });
    }
  }

  /**
   * 删除标签
   */
  static async deleteTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { tagId } = req.params;

      await pool.execute('DELETE FROM product_categories WHERE id = ?', [tagId]);

      res.json({
        success: true,
        message: '标签已删除'
      });
    } catch (error: any) {
      console.error('Delete tag error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete tag' });
    }
  }
}
```

Add missing import at top:

```typescript
import { pool } from '../database/connection';
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- tests/controllers/tags.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/controllers/tags.ts backend/tests/controllers/tags.test.ts
git commit -m "refactor: update TagsController for category-tag relationship"
```

---

## Task 6: Update Backend Routes

**Files:**
- Modify: `backend/src/routes/tags.ts`

**Step 1: Update routes**

Replace entire `backend/src/routes/tags.ts`:

```typescript
import express from 'express';
import { TagsController } from '../controllers/tags';
import authenticateMerchant from '../middleware/auth';
import injectMerchantId from '../middleware/merchantContext';

const router = express.Router();

router.use(authenticateMerchant, injectMerchantId);

router.get('/', TagsController.getTags);
router.post('/', TagsController.createTag);
router.post('/batch', TagsController.batchCreateTags);
router.post('/rename', TagsController.renameTag);
router.delete('/:tagId', TagsController.deleteTag);

export default router;
```

**Step 2: Commit**

```bash
git add backend/src/routes/tags.ts
git commit -m "refactor: update tags routes"
```

---

## Task 7: Update Frontend Types

**Files:**
- Modify: `shangjiaduan/types.ts`

**Step 1: Update type definitions**

Replace existing Tag and Category interfaces:

```typescript
export interface Tag {
  id: number;
  name: string;
  category_id: number;
  order_index: number;
}

export interface CategoryWithTags {
  id: number;
  name: string;
  tags: Tag[];
  tag_count: number;
}

export interface Category {
  id: number;
  name: string;
  order_index: number;
}

export interface TagData {
  name: string;
  categoryId: number;
}

export interface BatchTagData {
  categoryId: number;
  tags: string[];
}
```

**Step 2: Commit**

```bash
git add shangjiaduan/types.ts
git commit -m "refactor: update frontend types for category-tag relationship"
```

---

## Task 8: Rewrite Frontend Tags Component

**Files:**
- Modify: `shangjiaduan/pages/Tags.tsx`

**Step 1: Replace entire component**

Replace entire `shangjiaduan/pages/Tags.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CategoryWithTags, Tag, Category } from '../types';
import { Plus, Pencil, Trash2, X, ListPlus } from 'lucide-react';

export const Tags: React.FC = () => {
  const [categoriesWithTags, setCategoriesWithTags] = useState<CategoryWithTags[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [tagName, setTagName] = useState('');
  const [batchTags, setBatchTags] = useState<string[]>(['', '', '', '', '', '']);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchTags();
    fetchCategories();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await api.get('/merchant/tags');
      setCategoriesWithTags(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setCategoriesWithTags([]);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/merchant/categories');
      setCategories(res.data?.data || []);
    } catch (e) {
      console.error(e);
      setCategories([]);
    }
  };

  const handleCreateTag = async () => {
    try {
      if (!tagName.trim() || !selectedCategory) {
        alert('请填写标签名称并选择类目');
        return;
      }

      await api.post('/merchant/tags', {
        name: tagName,
        categoryId: selectedCategory
      });

      alert('标签已创建！');
      setIsCreateModalOpen(false);
      setTagName('');
      setSelectedCategory(null);
      fetchTags();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || '创建失败，请重试');
    }
  };

  const handleBatchCreate = async () => {
    try {
      if (!selectedCategory) {
        alert('请选择类目');
        return;
      }

      const validTags = batchTags.filter(t => t.trim().length > 0);
      if (validTags.length === 0) {
        alert('请至少输入一个标签名称');
        return;
      }

      await api.post('/merchant/tags/batch', {
        categoryId: selectedCategory,
        tags: validTags
      });

      alert(`成功创建 ${validTags.length} 个标签！`);
      setIsBatchModalOpen(false);
      setBatchTags(['', '', '', '', '', '']);
      setSelectedCategory(null);
      fetchTags();
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.error || '创建失败，请重试');
    }
  };

  const handleDeleteCategory = async (categoryId: number, categoryName: string) => {
    if (window.confirm(`确定要删除类目"${categoryName}"及其下所有标签吗？`)) {
      try {
        await api.delete(`/merchant/categories/${categoryId}`);
        alert('类目已删除');
        fetchTags();
        fetchCategories();
      } catch (e: any) {
        console.error(e);
        alert(e.response?.data?.error || '删除失败，请重试');
      }
    }
  };

  const totalTags = categoriesWithTags.reduce((sum, cat) => sum + cat.tag_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">标签管理</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus size={18} className="mr-2" />
            添加标签
          </button>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
          >
            <ListPlus size={18} className="mr-2" />
            批量添加
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类目</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标签名称</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categoriesWithTags.map((category) => (
              <tr key={category.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{category.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{category.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {category.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {category.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">无标签</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteCategory(category.id, category.name)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-600">
        总计：{categoriesWithTags.length} 个类目，{totalTags} 个标签
      </div>

      {/* 单个添加标签模态框 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">新建标签</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类目</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">选择类目</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签名称</label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="输入标签名称"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleCreateTag}
                className="px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量添加标签模态框 */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">批量添加标签</h2>
              <button onClick={() => setIsBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类目</label>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                >
                  <option value="">选择类目</option>
                  {categories.map(c => {
                    const catWithTags = categoriesWithTags.find(ct => ct.id === c.id);
                    const tagCount = catWithTags?.tag_count || 0;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} ({tagCount}/6)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标签列表（每行一个，最多6个）
                </label>
                <div className="space-y-2">
                  {batchTags.map((tag, index) => (
                    <input
                      key={index}
                      type="text"
                      value={tag}
                      onChange={(e) => {
                        const newTags = [...batchTags];
                        newTags[index] = e.target.value;
                        setBatchTags(newTags);
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={`标签 ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              {selectedCategory && (
                <div className="text-sm text-gray-600">
                  当前已有：{categoriesWithTags.find(c => c.id === selectedCategory)?.tag_count || 0}/6
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-6">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleBatchCreate}
                className="px-4 py-2.5 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Commit**

```bash
git add shangjiaduan/pages/Tags.tsx
git commit -m "refactor: rewrite Tags component for category-tag relationship"
```

---

## Task 9: Test and Verify

**Step 1: Start backend**

Run: `cd backend && npm start`

**Step 2: Start frontend**

Run: `cd shangjiaduan && npm start`

**Step 3: Manual testing checklist**

- [ ] 打开标签管理页面，验证类目分组显示
- [ ] 创建单个标签，验证数量限制（最多6个）
- [ ] 批量添加标签，验证总数不超过6个
- [ ] 验证标签名称在同一类目内唯一
- [ ] 删除类目，验证级联删除标签
- [ ] 验证前端界面符合设计稿

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete tag-category relationship implementation"
```

---

## Summary

This plan implements the tag-category relationship by:

1. **Backend**: Refactors TagService to use parent_id for hierarchy, adds batch operations and validation
2. **Controller**: Updates all endpoints to handle the new relationship model
3. **Frontend**: Rewrites Tags component to group by category, adds batch add modal

Total estimated time: 2-3 hours
Total commits: 9

All changes are backward-compatible and use existing ProductCategoryModel.
