# 产品数据集成实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 打通商家网页端和用户小程序端的数据，实现商家可以管理小程序的产品类型、产品名称以及对应的评价标签和图片。

**Architecture:** 采用邻接表 + path 字段方案实现多级分类树，产品仅关联叶子节点分类，支持商家数据隔离，小程序启动时主动拉取数据。

**Tech Stack:**
- Backend: Node.js + Express + TypeScript + MySQL + OSS
- Merchant Frontend: React 19 + TypeScript + Vite
- Miniprogram: 微信小程序原生 + 云开发

---

## Phase 1: 数据库表创建和迁移

### Task 1: 创建产品分类表迁移脚本

**Files:**
- Create: `backend/src/database/migrations/001-create-product-categories.ts`

**Step 1: 写迁移脚本**

```typescript
import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      merchant_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      parent_id INT DEFAULT NULL,
      level INT NOT NULL DEFAULT 0,
      path VARCHAR(500) NOT NULL DEFAULT '/',
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE CASCADE,
      INDEX idx_merchant_parent (merchant_id, parent_id),
      INDEX idx_path (path(255))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createTable);
  console.log('product_categories table created successfully');
}

export async function down() {
  await pool.execute('DROP TABLE IF EXISTS product_categories');
  console.log('product_categories table dropped successfully');
}
```

**Step 2: 创建测试文件验证表结构**

创建测试文件 `backend/src/tests/migrations/001-create-product-categories.test.ts`：

```typescript
import { up, down } from '../../../database/migrations/001-create-product-categories';

describe('Product Categories Migration', () => {
  beforeAll(async () => {
    await up();
  });

  afterAll(async () => {
    await down();
  });

  it('should create product_categories table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_categories"');
    expect(rows.length).toBe(1);
  });

  it('should have all required columns', async () => {
    const [columns] = await pool.execute('DESCRIBE product_categories');
    const columnNames = (columns as any[]).map((c: any) => c.Field);

    expect(columnNames).toContain('id');
    expect(columnNames).toContain('merchant_id');
    expect(columnNames).toContain('name');
    expect(columnNames).toContain('parent_id');
    expect(columnNames).toContain('level');
    expect(columnNames).toContain('path');
    expect(columnNames).toContain('order_index');
  });
});
```

**Step 3: 运行测试验证迁移**

```bash
cd backend
npm test -- 001-create-product-categories.test.ts
```

期望: PASS

**Step 4: 提交迁移脚本**

```bash
git add backend/src/database/migrations/001-create-product-categories.ts
git add backend/src/tests/migrations/001-create-product-categories.test.ts
git commit -m "feat: add product_categories table migration"
```

---

### Task 2: 创建产品项表迁移脚本

**Files:**
- Create: `backend/src/database/migrations/002-create-product-items.ts`

**Step 1: 写迁移脚本**

```typescript
import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      merchant_id INT NOT NULL,
      category_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      tags JSON,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE CASCADE,
      INDEX idx_merchant_category (merchant_id, category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createTable);
  console.log('product_items table created successfully');
}

export async function down() {
  await pool.execute('DROP TABLE IF EXISTS product_items');
  console.log('product_items table dropped successfully');
}
```

**Step 2: 创建测试文件**

创建 `backend/src/tests/migrations/002-create-product-items.test.ts`：

```typescript
import { up, down } from '../../../database/migrations/002-create-product-items';

describe('Product Items Migration', () => {
  beforeAll(async () => {
    await up();
  });

  afterAll(async () => {
    await down();
  });

  it('should create product_items table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_items"');
    expect(rows.length).toBe(1);
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
npm test -- 002-create-product-items.test.ts
```

期望: PASS

**Step 4: 提交**

```bash
git add backend/src/database/migrations/002-create-product-items.ts
git add backend/src/tests/migrations/002-create-product-items.test.ts
git commit -m "feat: add product_items table migration"
```

---

### Task 3: 创建产品图片表迁移脚本

**Files:**
- Create: `backend/src/database/migrations/003-create-product-images.ts`

**Step 1: 写迁移脚本**

```typescript
import { pool } from '../connection';

export async function up() {
  const createTable = `
    CREATE TABLE IF NOT EXISTS product_images (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      oss_file_id VARCHAR(500),
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES product_items(id) ON DELETE CASCADE,
      INDEX idx_product_order (product_id, order_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await pool.execute(createTable);
  console.log('product_images table created successfully');
}

export async function down() {
  await pool.execute('DROP TABLE IF EXISTS product_images');
  console.log('product_images table dropped successfully');
}
```

**Step 2: 创建测试文件**

创建 `backend/src/tests/migrations/003-create-product-images.test.ts`：

```typescript
import { up, down } from '../../../database/migrations/003-create-product-images';

describe('Product Images Migration', () => {
  beforeAll(async () => {
    await up();
  });

  afterAll(async () => {
    await down();
  });

  it('should create product_images table', async () => {
    const [rows] = await pool.execute('SHOW TABLES LIKE "product_images"');
    expect(rows.length).toBe(1);
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
npm test -- 003-create-product-images.test.ts
```

期望: PASS

**Step 4: 提交**

```bash
git add backend/src/database/migrations/003-create-product-images.ts
git add backend/src/tests/migrations/003-create-product-images.test.ts
git commit -m "feat: add product_images table migration"
```

---

### Task 4: 创建迁移运行脚本

**Files:**
- Create: `backend/src/database/migrations/run.ts`

**Step 1: 写迁移运行器**

```typescript
import { pool } from '../connection';

async function runMigrations() {
  try {
    // 记录迁移的表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 导入所有迁移
    const migrations = [
      { name: '001-create-product-categories', up: () => require('./001-create-product-categories').up() },
      { name: '002-create-product-items', up: () => require('./002-create-product-items').up() },
      { name: '003-create-product-images', up: () => require('./003-create-product-images').up() },
    ];

    for (const migration of migrations) {
      // 检查是否已执行
      const [existing] = await pool.execute('SELECT * FROM migrations WHERE name = ?', [migration.name]);

      if ((existing as any[]).length === 0) {
        console.log(`Running migration: ${migration.name}`);
        await migration.up();
        await pool.execute('INSERT INTO migrations (name) VALUES (?)', [migration.name]);
        console.log(`Migration ${migration.name} completed`);
      } else {
        console.log(`Migration ${migration.name} already executed, skipping`);
      }
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
```

**Step 2: 添加 package.json 脚本**

修改 `backend/package.json`，添加：

```json
{
  "scripts": {
    "migrate": "ts-node src/database/migrations/run.ts"
  }
}
```

**Step 3: 运行迁移**

```bash
cd backend
npm run migrate
```

期望: 看到所有迁移成功执行的消息

**Step 4: 提交**

```bash
git add backend/src/database/migrations/run.ts
git add backend/package.json
git commit -m "feat: add migration runner"
```

---

## Phase 2: 后端数据模型层

### Task 5: 创建产品分类模型

**Files:**
- Create: `backend/src/database/models/ProductCategory.ts`

**Step 1: 写模型**

```typescript
import { pool } from '../connection';

export interface ProductCategory {
  id?: number;
  merchantId: number;
  name: string;
  parentId?: number | null;
  level: number;
  path: string;
  orderIndex: number;
  created_at?: Date;
  updated_at?: Date;
}

export class ProductCategoryModel {
  // 查询商家的所有分类（树形）
  static async findTreeByMerchant(merchantId: number): Promise<ProductCategory[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM product_categories WHERE merchant_id = ? ORDER BY path',
      [merchantId]
    );
    const categories = rows as ProductCategory[];

    // 构建树形结构
    const buildTree = (parentId: number | null = null): ProductCategory[] => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildTree(cat.id)
        }));
    };

    return buildTree();
  }

  // 根据 ID 查询分类
  static async findById(id: number): Promise<ProductCategory | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM product_categories WHERE id = ?',
      [id]
    );
    return (rows as ProductCategory[])[0] || null;
  }

  // 创建分类
  static async create(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at' | 'level' | 'path'>): Promise<ProductCategory> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 计算 level 和 path
      let level = 0;
      let path = '/';
      let parentId = category.parentId || null;

      if (parentId) {
        const parent = await this.findById(parentId);
        if (!parent) {
          throw new Error('Parent category not found');
        }
        level = parent.level + 1;
        path = parent.path;
      }

      // 插入分类
      const [result] = await connection.execute(
        'INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [category.merchantId, category.name, parentId, level, path, category.orderIndex]
      );

      const insertId = (result as any).insertId;

      // 更新 path
      const finalPath = `${path}${insertId}/`;
      await connection.execute(
        'UPDATE product_categories SET path = ? WHERE id = ?',
        [finalPath, insertId]
      );

      await connection.commit();

      return this.findById(insertId) as Promise<ProductCategory>;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 更新分类
  static async update(id: number, updates: Partial<ProductCategory>): Promise<ProductCategory | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.parentId !== undefined) {
      fields.push('parent_id = ?');
      values.push(updates.parentId);
    }
    if (updates.orderIndex !== undefined) {
      fields.push('order_index = ?');
      values.push(updates.orderIndex);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.execute(
      `UPDATE product_categories SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // 删除分类（检查是否有子分类或产品）
  static async delete(id: number): Promise<boolean> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 检查是否有子分类
      const [children] = await connection.execute(
        'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = ?',
        [id]
      );
      if ((children as any)[0].count > 0) {
        throw new Error('Cannot delete category with children');
      }

      // 检查是否有关联的产品
      const [products] = await connection.execute(
        'SELECT COUNT(*) as count FROM product_items WHERE category_id = ?',
        [id]
      );
      if ((products as any)[0].count > 0) {
        throw new Error('Cannot delete category with products');
      }

      await connection.execute('DELETE FROM product_categories WHERE id = ?', [id]);
      await connection.commit();

      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 检查是否为叶子节点
  static async isLeafNode(id: number): Promise<boolean> {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = ?',
      [id]
    );
    return (rows as any)[0].count === 0;
  }
}
```

**Step 2: 写单元测试**

创建 `backend/src/tests/models/ProductCategory.test.ts`：

```typescript
import { ProductCategoryModel } from '../../database/models/ProductCategory';

describe('ProductCategoryModel', () => {
  let merchantId: number;
  let categoryId: number;

  beforeAll(async () => {
    // 创建测试商家
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
  });

  it('should create a root category', async () => {
    const category = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });

    expect(category.id).toBeDefined();
    expect(category.name).toBe('服装');
    expect(category.level).toBe(0);
    expect(category.path).toMatch(/^\/\d+\/$/);
    categoryId = category.id!;
  });

  it('should create a child category', async () => {
    const childCategory = await ProductCategoryModel.create({
      merchantId,
      name: '女装',
      parentId: categoryId,
      orderIndex: 0
    });

    expect(childCategory.level).toBe(1);
    expect(childCategory.path).toContain(`/${categoryId}/`);
  });

  it('should return tree structure', async () => {
    const tree = await ProductCategoryModel.findTreeByMerchant(merchantId);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].children).toBeDefined();
  });

  it('should prevent deleting category with children', async () => {
    await expect(ProductCategoryModel.delete(categoryId)).rejects.toThrow();
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
npm test -- ProductCategory.test.ts
```

期望: PASS

**Step 4: 提交**

```bash
git add backend/src/database/models/ProductCategory.ts
git add backend/src/tests/models/ProductCategory.test.ts
git commit -m "feat: add ProductCategory model with tree support"
```

---

### Task 6: 创建产品项模型

**Files:**
- Create: `backend/src/database/models/ProductItem.ts`

**Step 1: 写模型**

```typescript
import { pool } from '../connection';
import { ProductCategoryModel } from './ProductCategory';

export interface ProductItem {
  id?: number;
  merchantId: number;
  categoryId: number;
  name: string;
  tags: string[];
  isActive: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export class ProductItemModel {
  // 根据分类查询产品
  static async findByCategory(categoryId: number, merchantId: number): Promise<ProductItem[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM product_items WHERE category_id = ? AND merchant_id = ? ORDER BY created_at DESC',
      [categoryId, merchantId]
    );
    return (rows as any[]).map(row => ({
      ...row,
      tags: JSON.parse(row.tags || '[]')
    }));
  }

  // 根据 ID 查询产品（含图片）
  static async findById(id: number): Promise<ProductItem | null> {
    const [rows] = await pool.execute(
      'SELECT * FROM product_items WHERE id = ?',
      [id]
    );

    if ((rows as any[]).length === 0) return null;

    const product = (rows as any[])[0];
    return {
      ...product,
      tags: JSON.parse(product.tags || '[]')
    };
  }

  // 创建产品
  static async create(product: Omit<ProductItem, 'id' | 'created_at' | 'updated_at'>): Promise<ProductItem> {
    // 验证分类是叶子节点
    const isLeaf = await ProductCategoryModel.isLeafNode(product.categoryId);
    if (!isLeaf) {
      throw new Error('Category must be a leaf node');
    }

    const [result] = await pool.execute(
      'INSERT INTO product_items (merchant_id, category_id, name, tags, is_active) VALUES (?, ?, ?, ?, ?)',
      [product.merchantId, product.categoryId, product.name, JSON.stringify(product.tags), product.isActive]
    );

    const insertId = (result as any).insertId;
    return this.findById(insertId) as Promise<ProductItem>;
  }

  // 更新产品
  static async update(id: number, updates: Partial<ProductItem>): Promise<ProductItem | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.execute(
      `UPDATE product_items SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }

  // 删除产品
  static async delete(id: number, merchantId: number): Promise<boolean> {
    const [result] = await pool.execute(
      'DELETE FROM product_items WHERE id = ? AND merchant_id = ?',
      [id, merchantId]
    );
    return (result as any).affectedRows > 0;
  }
}
```

**Step 2: 写测试**

创建 `backend/src/tests/models/ProductItem.test.ts`：

```typescript
import { ProductItemModel } from '../../database/models/ProductItem';
import { ProductCategoryModel } from '../../database/models/ProductCategory';

describe('ProductItemModel', () => {
  let merchantId: number;
  let categoryId: number;

  beforeAll(async () => {
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;

    const category = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });
    categoryId = category.id!;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_items');
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
  });

  it('should create a product item', async () => {
    const product = await ProductItemModel.create({
      merchantId,
      categoryId,
      name: '连衣裙',
      tags: ['舒适', '透气', '时尚']
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe('连衣裙');
    expect(product.tags).toEqual(['舒适', '透气', '时尚']);
  });

  it('should prevent creating product in non-leaf category', async () => {
    const parentCategory = await ProductCategoryModel.create({
      merchantId,
      name: '女装',
      parentId: categoryId,
      orderIndex: 0
    });

    await expect(ProductItemModel.create({
      merchantId,
      categoryId: parentCategory.id!,
      name: '测试产品',
      tags: []
    })).rejects.toThrow('Category must be a leaf node');
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
npm test -- ProductItem.test.ts
```

期望: PASS

**Step 4: 提交**

```bash
git add backend/src/database/models/ProductItem.ts
git add backend/src/tests/models/ProductItem.test.ts
git commit -m "feat: add ProductItem model"
```

---

### Task 7: 创建产品图片模型

**Files:**
- Create: `backend/src/database/models/ProductImage.ts`

**Step 1: 写模型**

```typescript
import { pool } from '../connection';

export interface ProductImage {
  id?: number;
  productId: number;
  imageUrl: string;
  ossFileId?: string;
  orderIndex: number;
  created_at?: Date;
}

export class ProductImageModel {
  // 获取产品的所有图片
  static async findByProduct(productId: number): Promise<ProductImage[]> {
    const [rows] = await pool.execute(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY order_index',
      [productId]
    );
    return rows as ProductImage[];
  }

  // 创建图片记录
  static async create(image: Omit<ProductImage, 'id' | 'created_at'>): Promise<ProductImage> {
    const [result] = await pool.execute(
      'INSERT INTO product_images (product_id, image_url, oss_file_id, order_index) VALUES (?, ?, ?, ?)',
      [image.productId, image.imageUrl, image.ossFileId || null, image.orderIndex]
    );

    return {
      ...image,
      id: (result as any).insertId
    };
  }

  // 删除图片
  static async delete(id: number, productId: number): Promise<boolean> {
    const [result] = await pool.execute(
      'DELETE FROM product_images WHERE id = ? AND product_id = ?',
      [id, productId]
    );
    return (result as any).affectedRows > 0;
  }

  // 更新图片顺序
  static async updateOrder(productId: number, imageIds: number[]): Promise<void> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      for (let i = 0; i < imageIds.length; i++) {
        await connection.execute(
          'UPDATE product_images SET order_index = ? WHERE id = ? AND product_id = ?',
          [i, imageIds[i], productId]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // 获取产品图片数量
  static async countByProduct(productId: number): Promise<number> {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM product_images WHERE product_id = ?',
      [productId]
    );
    return (rows as any)[0].count;
  }
}
```

**Step 2: 写测试**

创建 `backend/src/tests/models/ProductImage.test.ts`：

```typescript
import { ProductImageModel } from '../../database/models/ProductImage';
import { ProductItemModel } from '../../database/models/ProductItem';
import { ProductCategoryModel } from '../../database/models/ProductCategory';

describe('ProductImageModel', () => {
  let merchantId: number;
  let productId: number;

  beforeAll(async () => {
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;

    const category = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });

    const product = await ProductItemModel.create({
      merchantId,
      categoryId: category.id!,
      name: '连衣裙',
      tags: []
    });
    productId = product.id!;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_images');
    await pool.execute('DELETE FROM product_items');
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
  });

  it('should create product image', async () => {
    const image = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image.jpg',
      orderIndex: 0
    });

    expect(image.id).toBeDefined();
    expect(image.imageUrl).toBe('https://example.com/image.jpg');
  });

  it('should get images by product', async () => {
    await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image1.jpg',
      orderIndex: 0
    });
    await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image2.jpg',
      orderIndex: 1
    });

    const images = await ProductImageModel.findByProduct(productId);
    expect(images.length).toBeGreaterThanOrEqual(2);
  });
});
```

**Step 3: 运行测试**

```bash
cd backend
npm test -- ProductImage.test.ts
```

期望: PASS

**Step 4: 提交**

```bash
git add backend/src/database/models/ProductImage.ts
git add backend/src/tests/models/ProductImage.test.ts
git commit -m "feat: add ProductImage model"
```

---

## Phase 3: 后端 API 控制器和路由

### Task 8: 创建产品分类控制器

**Files:**
- Create: `backend/src/controllers/productCategory.ts`

**Step 1: 写控制器**

```typescript
import { Response } from 'express';
import { ProductCategoryModel } from '../database/models/ProductCategory';
import { AuthRequest, authenticateMerchant } from '../middleware/auth';

export class ProductCategoryController {
  // 获取分类树
  static async getTree(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;

      const categories = await ProductCategoryModel.findTreeByMerchant(merchantId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  // 创建分类
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { name, parentId, orderIndex = 0 } = req.body;

      // 验证输入
      if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
        res.status(400).json({ error: 'Category name must be 1-50 characters' });
        return;
      }

      if (parentId !== undefined && parentId !== null) {
        // 验证父分类存在且属于当前商家
        const parentCategory = await ProductCategoryModel.findById(parentId);
        if (!parentCategory || parentCategory.merchantId !== merchantId) {
          res.status(400).json({ error: 'Parent category not found' });
          return;
        }
      }

      const category = await ProductCategoryModel.create({
        merchantId,
        name,
        parentId: parentId || null,
        orderIndex
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({ error: error.message || 'Failed to create category' });
    }
  }

  // 更新分类
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);
      const { name, parentId, orderIndex } = req.body;

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (parentId !== undefined) updates.parentId = parentId;
      if (orderIndex !== undefined) updates.orderIndex = orderIndex;

      const updatedCategory = await ProductCategoryModel.update(categoryId, updates);

      res.json({
        success: true,
        data: updatedCategory,
        message: 'Category updated successfully'
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({ error: error.message || 'Failed to update category' });
    }
  }

  // 删除分类
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      await ProductCategoryModel.delete(categoryId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete category' });
    }
  }
}
```

**Step 2: 创建路由**

创建 `backend/src/routes/productCategory.ts`：

```typescript
import { Router } from 'express';
import { ProductCategoryController } from '../controllers/productCategory';
import { authenticateMerchant } from '../middleware/auth';

const router = Router();

// 所有路由需要商家认证
router.use(authenticateMerchant);

router.get('/', ProductCategoryController.getTree);
router.post('/', ProductCategoryController.create);
router.put('/:id', ProductCategoryController.update);
router.delete('/:id', ProductCategoryController.delete);

export default router;
```

**Step 3: 注册路由**

修改 `backend/src/app.ts`，添加：

```typescript
import productCategoryRoutes from './routes/productCategory';

app.use('/api/merchant/categories', productCategoryRoutes);
```

**Step 4: 提交**

```bash
git add backend/src/controllers/productCategory.ts
git add backend/src/routes/productCategory.ts
git add backend/src/app.ts
git commit -m "feat: add product category CRUD API"
```

---

### Task 9: 创建产品项控制器

**Files:**
- Create: `backend/src/controllers/productItem.ts`

**Step 1: 写控制器**

```typescript
import { Response } from 'express';
import { ProductItemModel } from '../database/models/ProductItem';
import { ProductImageModel } from '../database/models/ProductImage';
import { AuthRequest, authenticateMerchant } from '../middleware/auth';

export class ProductItemController {
  // 获取产品列表
  static async getByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId } = req.query;

      if (!categoryId || typeof categoryId !== 'string') {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const products = await ProductItemModel.findByCategory(parseInt(categoryId), merchantId);

      // 获取每个产品的图片数量
      const productsWithImageCount = await Promise.all(
        products.map(async (product) => {
          const imageCount = await ProductImageModel.countByProduct(product.id!);
          return {
            ...product,
            imageCount
          };
        })
      );

      res.json({
        success: true,
        data: productsWithImageCount
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // 创建产品
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId, name, tags, isActive = true } = req.body;

      // 验证输入
      if (!categoryId || !name) {
        res.status(400).json({ error: 'Category ID and name are required' });
        return;
      }

      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        res.status(400).json({ error: 'At least one tag is required' });
        return;
      }

      if (tags.length > 20) {
        res.status(400).json({ error: 'Maximum 20 tags allowed' });
        return;
      }

      for (const tag of tags) {
        if (typeof tag !== 'string' || tag.length < 1 || tag.length > 20) {
          res.status(400).json({ error: 'Each tag must be 1-20 characters' });
          return;
        }
      }

      const product = await ProductItemModel.create({
        merchantId,
        categoryId: parseInt(categoryId),
        name,
        tags,
        isActive
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(400).json({ error: error.message || 'Failed to create product' });
    }
  }

  // 更新产品
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);
      const { name, tags, isActive } = req.body;

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (tags !== undefined) updates.tags = tags;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedProduct = await ProductItemModel.update(productId, updates);

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // 删除产品
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      const deleted = await ProductItemModel.delete(productId, merchantId);

      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  // 获取产品详情（含图片）
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      const product = await ProductItemModel.findById(productId);

      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const images = await ProductImageModel.findByProduct(productId);

      res.json({
        success: true,
        data: {
          ...product,
          images
        }
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }
}
```

**Step 2: 创建路由**

创建 `backend/src/routes/productItem.ts`：

```typescript
import { Router } from 'express';
import { ProductItemController } from '../controllers/productItem';
import { authenticateMerchant } from '../middleware/auth';

const router = Router();

router.use(authenticateMerchant);

router.get('/', ProductItemController.getByCategory);
router.get('/:id', ProductItemController.getById);
router.post('/', ProductItemController.create);
router.put('/:id', ProductItemController.update);
router.delete('/:id', ProductItemController.delete);

export default router;
```

**Step 3: 注册路由**

修改 `backend/src/app.ts`，添加：

```typescript
import productItemRoutes from './routes/productItem';

app.use('/api/merchant/products', productItemRoutes);
```

**Step 4: 提交**

```bash
git add backend/src/controllers/productItem.ts
git add backend/src/routes/productItem.ts
git add backend/src/app.ts
git commit -m "feat: add product item CRUD API"
```

---

### Task 10: 创建产品图片控制器

**Files:**
- Create: `backend/src/controllers/productImage.ts`

**Step 1: 写控制器**

```typescript
import { Response } from 'express';
import { ProductImageModel } from '../database/models/ProductImage';
import { ProductItemModel } from '../database/models/ProductItem';
import { AuthRequest, authenticateMerchant } from '../middleware/auth';
import * as OSS from 'ali-oss';

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET || 'haopingbao-images'
});

export class ProductImageController {
  // 上传图片
  static async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 检查图片数量限制
      const imageCount = await ProductImageModel.countByProduct(productId);
      if (imageCount >= 9) {
        res.status(400).json({ error: 'Maximum 9 images allowed per product' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // 上传到 OSS
      const fileName = `products/${merchantId}/${productId}/${Date.now()}-${req.file.originalname}`;
      const result = await ossClient.put(fileName, req.file.buffer);

      // 保存图片记录
      const image = await ProductImageModel.create({
        productId,
        imageUrl: result.url,
        ossFileId: result.name,
        orderIndex: imageCount
      });

      res.status(201).json({
        success: true,
        data: image,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  // 获取产品图片列表
  static async getByProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const images = await ProductImageModel.findByProduct(productId);

      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      console.error('Get images error:', error);
      res.status(500).json({ error: 'Failed to get images' });
    }
  }

  // 删除图片
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id: productId, imageId } = req.params;

      // 验证产品存在
      const product = await ProductItemModel.findById(parseInt(productId));
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 获取图片信息
      const images = await ProductImageModel.findByProduct(parseInt(productId));
      const image = images.find(img => img.id === parseInt(imageId));

      if (!image) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      // 删除 OSS 文件
      if (image.ossFileId) {
        await ossClient.delete(image.ossFileId);
      }

      // 删除数据库记录
      await ProductImageModel.delete(parseInt(imageId), parseInt(productId));

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  // 更新图片顺序
  static async updateOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);
      const { imageIds } = req.body;

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 验证输入
      if (!Array.isArray(imageIds)) {
        res.status(400).json({ error: 'imageIds must be an array' });
        return;
      }

      await ProductImageModel.updateOrder(productId, imageIds);

      res.json({
        success: true,
        message: 'Image order updated successfully'
      });
    } catch (error) {
      console.error('Update image order error:', error);
      res.status(500).json({ error: 'Failed to update image order' });
    }
  }
}
```

**Step 2: 创建路由**

创建 `backend/src/routes/productImage.ts`：

```typescript
import { Router } from 'express';
import { ProductImageController } from '../controllers/productImage';
import { authenticateMerchant } from '../middleware/auth';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

const router = Router();

router.use(authenticateMerchant);

router.post('/:id/images', upload.single('image'), ProductImageController.upload);
router.get('/:id/images', ProductImageController.getByProduct);
router.delete('/:id/images/:imageId', ProductImageController.delete);
router.put('/:id/images/order', ProductImageController.updateOrder);

export default router;
```

**Step 3: 注册路由**

修改 `backend/src/app.ts`，添加：

```typescript
import productImageRoutes from './routes/productImage';

app.use('/api/merchant/products', productImageRoutes);
```

**Step 4: 安装 multer 依赖**

```bash
cd backend
npm install multer @types/multer
```

**Step 5: 提交**

```bash
git add backend/src/controllers/productImage.ts
git add backend/src/routes/productImage.ts
git add backend/src/app.ts
git add backend/package.json
git add backend/package-lock.json
git commit -m "feat: add product image upload and management API"
```

---

### Task 11: 创建小程序端查询 API

**Files:**
- Create: `backend/src/controllers/miniprogramProduct.ts`

**Step 1: 写控制器**

```typescript
import { Response } from 'express';
import { ProductCategoryModel } from '../database/models/ProductCategory';
import { ProductItemModel } from '../database/models/ProductItem';
import { ProductImageModel } from '../database/models/ProductImage';

export class MiniprogramProductController {
  // 获取所有分类树（公开接口）
  static async getCategories(req: any, res: Response): Promise<void> {
    try {
      const { merchantId } = req.query;

      if (!merchantId) {
        res.status(400).json({ error: 'Merchant ID is required' });
        return;
      }

      const categories = await ProductCategoryModel.findTreeByMerchant(parseInt(merchantId as string));

      // 标记哪些分类有产品
      const categoriesWithProductFlag = await Promise.all(
        categories.map(async (cat) => {
          const hasProducts = await hasProductsInCategory(cat.id!);
          return {
            ...cat,
            hasProducts,
            children: cat.children ? await processChildren(cat.children) : []
          };
        })
      );

      async function processChildren(children: any[]): Promise<any[]> {
        return Promise.all(
          children.map(async (child) => {
            const hasProducts = await hasProductsInCategory(child.id!);
            return {
              ...child,
              hasProducts,
              children: child.children ? await processChildren(child.children) : []
            };
          })
        );
      }

      async function hasProductsInCategory(categoryId: number): Promise<boolean> {
        const products = await ProductItemModel.findByCategory(categoryId, parseInt(merchantId as string));
        return products.length > 0;
      }

      res.json({
        success: true,
        data: categoriesWithProductFlag
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  // 根据分类获取产品（公开接口）
  static async getProducts(req: any, res: Response): Promise<void> {
    try {
      const { categoryId, merchantId } = req.query;

      if (!categoryId || !merchantId) {
        res.status(400).json({ error: 'Category ID and Merchant ID are required' });
        return;
      }

      const products = await ProductItemModel.findByCategory(parseInt(categoryId as string), parseInt(merchantId as string));

      // 获取每个产品的图片
      const productsWithImages = await Promise.all(
        products.map(async (product) => {
          const images = await ProductImageModel.findByProduct(product.id!);
          return {
            id: product.id,
            name: product.name,
            tags: product.tags,
            categoryId: product.categoryId,
            images: images.map(img => img.imageUrl)
          };
        })
      );

      res.json({
        success: true,
        data: productsWithImages
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // 批量获取产品
  static async getProductsBatch(req: any, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids) {
        res.status(400).json({ error: 'Product IDs are required' });
        return;
      }

      const idArray = (ids as string).split(',').map(id => parseInt(id));

      const products = await Promise.all(
        idArray.map(async (id) => {
          const product = await ProductItemModel.findById(id);
          if (!product || !product.isActive) return null;

          const images = await ProductImageModel.findByProduct(id);
          return {
            id: product.id,
            name: product.name,
            tags: product.tags,
            categoryId: product.categoryId,
            images: images.map(img => img.imageUrl)
          };
        })
      );

      const filteredProducts = products.filter(p => p !== null);

      res.json({
        success: true,
        data: filteredProducts
      });
    } catch (error) {
      console.error('Get products batch error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }
}
```

**Step 2: 创建路由**

创建 `backend/src/routes/miniprogramProduct.ts`：

```typescript
import { Router } from 'express';
import { MiniprogramProductController } from '../controllers/miniprogramProduct';

const router = Router();

// 公开接口，无需认证
router.get('/categories', MiniprogramProductController.getCategories);
router.get('/products', MiniprogramProductController.getProducts);
router.get('/products/batch', MiniprogramProductController.getProductsBatch);

export default router;
```

**Step 3: 注册路由**

修改 `backend/src/app.ts`，添加：

```typescript
import miniprogramProductRoutes from './routes/miniprogramProduct';

app.use('/api/miniprogram', miniprogramProductRoutes);
```

**Step 4: 提交**

```bash
git add backend/src/controllers/miniprogramProduct.ts
git add backend/src/routes/miniprogramProduct.ts
git add backend/src/app.ts
git commit -m "feat: add miniprogram read-only product APIs"
```

---

## Phase 4: 商家端 React 界面

### Task 12: 创建分类管理页面

**Files:**
- Create: `shangjiaduan/src/pages/ProductCategories.tsx`
- Create: `shangjiaduan/src/components/CategoryTree.tsx`

**Step 1: 创建分类树组件**

创建 `shangjiaduan/src/components/CategoryTree.tsx`：

```tsx
import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onSelect?: (category: Category) => void;
  onAdd?: (parentId?: number) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  onSelect,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expanded.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => onSelect?.(category)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}

          {isExpanded ? <FolderOpen size={18} className="text-yellow-500" /> : <Folder size={18} className="text-yellow-500" />}

          <span className="flex-1">{category.name}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.(category.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="添加子分类"
          >
            <Plus size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(category);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="编辑"
          >
            <Edit size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(category);
            }}
            className="p-1 hover:bg-red-100 text-red-500 rounded"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">分类管理</h2>
        <button
          onClick={() => onAdd?.()}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加根分类
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无分类，请添加根分类</p>
      ) : (
        <div>{categories.map(category => renderCategory(category))}</div>
      )}
    </div>
  );
};
```

**Step 2: 创建分类管理页面**

创建 `shangjiaduan/src/pages/ProductCategories.tsx`：

```tsx
import React, { useState, useEffect } from 'react';
import { CategoryTree } from '../components/CategoryTree';
import axios from 'axios';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  children?: Category[];
}

export const ProductCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', parentId: null as number | null });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/merchant/categories');
      setCategories(response.data.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      alert('加载分类失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = (parentId?: number) => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: parentId || null });
    setModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, parentId: category.parentId });
    setModalOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`确定要删除分类"${category.name}"吗？`)) return;

    try {
      await axios.delete(`/api/merchant/categories/${category.id}`);
      alert('删除成功');
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to delete category:', error);
      alert(error.response?.data?.error || '删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await axios.put(`/api/merchant/categories/${editingCategory.id}`, formData);
        alert('更新成功');
      } else {
        await axios.post('/api/merchant/categories', formData);
        alert('创建成功');
      }

      setModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      alert(error.response?.data?.error || '保存失败');
    }
  };

  if (loading) {
    return <div className="p-8 text-center">加载中...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">产品分类管理</h1>

      <CategoryTree
        categories={categories}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">
              {editingCategory ? '编辑分类' : '添加分类'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">分类名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                  maxLength={50}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  {editingCategory ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 3: 添加路由**

修改 `shangjiaduan/src/App.tsx`，添加：

```tsx
import { ProductCategories } from './pages/ProductCategories';

// 在路由中添加
<Route path="/products/categories" element={<ProductCategories />} />
```

**Step 4: 提交**

```bash
git add shangjiaduan/src/components/CategoryTree.tsx
git add shangjiaduan/src/pages/ProductCategories.tsx
git add shangjiaduan/src/App.tsx
git commit -m "feat: add product category management page"
```

---

### Task 13: 创建产品管理页面

**Files:**
- Create: `shangjiaduan/src/pages/ProductManager.tsx`
- Create: `shangjiaduan/src/components/ProductEditModal.tsx`

**Step 1: 创建产品编辑弹窗**

创建 `shangjiaduan/src/components/ProductEditModal.tsx`：

```tsx
import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import axios from 'axios';

interface Product {
  id?: number;
  name: string;
  categoryId: number;
  tags: string[];
}

interface Category {
  id: number;
  name: string;
  path: string;
}

interface ProductEditModalProps {
  product?: Product;
  categories: Category[];
  onSave: () => void;
  onClose: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  categories,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    categoryId: product?.categoryId || 0,
    tags: product?.tags || []
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [images, setImages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // 加载预设标签
    const presetTags = [
      '舒适', '透气', '时尚', '百搭', '显瘦', '修身',
      '高性能', '轻薄', '长续航', '拍照好',
      '保湿', '美白', '抗衰老', '敏感肌友好'
    ];
    setAvailableTags(presetTags);

    // 如果是编辑模式，加载产品图片
    if (product?.id) {
      loadProductImages(product.id);
    }
  }, [product]);

  const loadProductImages = async (productId: number) => {
    try {
      const response = await axios.get(`/api/merchant/products/${productId}/images`);
      setImages(response.data.data);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  };

  const handleToggleTag = (tag: string) => {
    const newTags = formData.tags.includes(tag)
      ? formData.tags.filter(t => t !== tag)
      : [...formData.tags, tag];

    if (newTags.length > 20) {
      alert('最多只能添加20个标签');
      return;
    }

    setFormData({ ...formData, tags: newTags });
  };

  const handleAddCustomTag = () => {
    if (!newTag.trim()) return;

    if (formData.tags.includes(newTag)) {
      alert('标签已存在');
      return;
    }

    if (newTag.length > 20) {
      alert('标签长度不能超过20个字符');
      return;
    }

    setFormData({ ...formData, tags: [...formData.tags, newTag] });
    setNewTag('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= 9) {
      alert('最多只能上传9张图片');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过5MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const response = await axios.post(
        `/api/merchant/products/${product?.id}/images`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      setImages([...images, response.data.data]);
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm('确定要删除这张图片吗？')) return;

    try {
      await axios.delete(`/api/merchant/products/${product?.id}/images/${imageId}`);
      setImages(images.filter(img => img.id !== imageId));
    } catch (error) {
      console.error('Delete image failed:', error);
      alert('删除失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('请输入产品名称');
      return;
    }

    if (formData.tags.length === 0) {
      alert('请至少添加一个标签');
      return;
    }

    try {
      if (product?.id) {
        await axios.put(`/api/merchant/products/${product.id}`, formData);
      } else {
        await axios.post('/api/merchant/products', formData);
      }

      alert(product?.id ? '更新成功' : '创建成功');
      onSave();
    } catch (error: any) {
      console.error('Save failed:', error);
      alert(error.response?.data?.error || '保存失败');
    }
  };

  // 获取叶子节点分类
  const leafCategories = categories.filter(cat => !cat.path.match(/\/\d+\/\d+\/$/));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {product?.id ? '编辑产品' : '添加产品'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 产品名称 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">产品名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>

          {/* 分类选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">所属分类</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
              className="w-full border rounded-lg px-3 py-2"
              required
            >
              <option value={0}>请选择分类</option>
              {leafCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* 标签选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">评价标签</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    formData.tags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2"
                placeholder="自定义标签"
                maxLength={20}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                添加
              </button>
            </div>
            <div className="mt-2 text-sm text-gray-500">
              已选择: {formData.tags.join(', ')}
            </div>
          </div>

          {/* 图片上传 */}
          {product?.id && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">产品图片</label>
              <div className="grid grid-cols-3 gap-2">
                {images.map(image => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.imageUrl}
                      alt="产品图片"
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(image.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {images.length < 9 && (
                  <label className="border-2 border-dashed rounded-lg flex items-center justify-center h-24 cursor-pointer hover:border-blue-500">
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <div className="text-center">
                      <Upload size={24} className="mx-auto mb-1 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {uploading ? '上传中...' : '上传图片'}
                      </span>
                    </div>
                  </label>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              {product?.id ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

**Step 2: 创建产品管理页面**

创建 `shangjiaduan/src/pages/ProductManager.tsx`：

```tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { ProductEditModal } from '../components/ProductEditModal';
import axios from 'axios';

interface Product {
  id: number;
  name: string;
  categoryId: number;
  tags: string[];
  imageCount: number;
  isActive: boolean;
}

interface Category {
  id: number;
  name: string;
}

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/merchant/categories');
      const flattenCategories = (cats: any[]): any[] => {
        return cats.reduce((acc: any[], cat: any) => {
          acc.push(cat);
          if (cat.children) {
            acc.push(...flattenCategories(cat.children));
          }
          return acc;
        }, []);
      };
      setCategories(flattenCategories(response.data.data));
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    if (!selectedCategoryId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get('/api/merchant/products', {
        params: { categoryId: selectedCategoryId }
      });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      alert('加载产品失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategoryId]);

  const handleAdd = () => {
    setEditingProduct(undefined);
    setModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`确定要删除产品"${product.name}"吗？`)) return;

    try {
      await axios.delete(`/api/merchant/products/${product.id}`);
      alert('删除成功');
      fetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('删除失败');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">产品管理</h1>

      {/* 筛选栏 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">选择分类</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(parseInt(e.target.value))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value={0}>请选择分类</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">搜索</label>
            <div className="relative">
              <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border rounded-lg pl-10 pr-3 py-2"
                placeholder="搜索产品名称或标签"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            disabled={!selectedCategoryId}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed mt-6"
          >
            <Plus size={20} className="inline mr-2" />
            添加产品
          </button>
        </div>
      </div>

      {/* 产品列表 */}
      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedCategoryId ? '暂无产品' : '请先选择分类'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg">{product.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {product.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded">
                    {tag}
                  </span>
                ))}
                {product.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    +{product.tags.length - 3}
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-500">
                {product.imageCount} 张图片
              </div>

              {!product.isActive && (
                <div className="mt-2 text-sm text-orange-500">
                  已停用
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProductEditModal
          product={editingProduct}
          categories={categories}
          onSave={() => {
            setModalOpen(false);
            fetchProducts();
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
};
```

**Step 3: 添加路由**

修改 `shangjiaduan/src/App.tsx`，添加：

```tsx
import { ProductManager } from './pages/ProductManager';

// 在路由中添加
<Route path="/products/manager" element={<ProductManager />} />
```

**Step 4: 提交**

```bash
git add shangjiaduan/src/components/ProductEditModal.tsx
git add shangjiaduan/src/pages/ProductManager.tsx
git add shangjiaduan/src/App.tsx
git commit -m "feat: add product management page with image upload"
```

---

## Phase 5: 小程序端集成

### Task 14: 修改小程序数据拉取逻辑

**Files:**
- Modify: `yonghuduan/miniprogram/app.js`
- Modify: `yonghuduan/miniprogram/pages/index/index.js`

**Step 1: 更新 app.js 数据拉取**

修改 `yonghuduan/miniprogram/app.js`：

```javascript
App({
  globalData: {
    categories: null,
    productsCache: {},
    merchants: [],
    selectedMerchantId: null
  },

  onLaunch() {
    this.loadCachedData();
  },

  // 加载缓存数据
  loadCachedData() {
    try {
      const categories = wx.getStorageSync('categories');
      const merchants = wx.getStorageSync('merchants');
      const selectedMerchantId = wx.getStorageSync('selectedMerchantId');

      if (categories) {
        const now = Date.now();
        if (now - categories.timestamp < 3600000) { // 1小时缓存
          this.globalData.categories = categories.data;
        }
      }

      if (merchants) {
        const now = Date.now();
        if (now - merchants.timestamp < 86400000) { // 24小时缓存
          this.globalData.merchants = merchants.data;
        }
      }

      if (selectedMerchantId) {
        this.globalData.selectedMerchantId = selectedMerchantId;
      }
    } catch (error) {
      console.error('Load cache failed:', error);
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      // 拉取商家列表
      const merchantsRes = await wx.request({
        url: `${getApp().globalData.apiUrl}/api/merchants`,
        method: 'GET'
      });

      if (merchantsRes.data.success) {
        this.globalData.merchants = merchantsRes.data.data;
        wx.setStorageSync('merchants', {
          data: merchantsRes.data.data,
          timestamp: Date.now()
        });
      }

      // 拉取分类树
      if (this.globalData.selectedMerchantId) {
        await this.loadCategories();
      }
    } catch (error) {
      console.error('Refresh data failed:', error);
      wx.showToast({
        title: '数据刷新失败',
        icon: 'none'
      });
    }
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await wx.request({
        url: `${this.globalData.apiUrl}/api/miniprogram/categories`,
        data: {
          merchantId: this.globalData.selectedMerchantId
        },
        method: 'GET'
      });

      if (res.data.success) {
        this.globalData.categories = res.data.data;
        wx.setStorageSync('categories', {
          data: res.data.data,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Load categories failed:', error);
      throw error;
    }
  }
});
```

**Step 2: 更新首页产品展示**

修改 `yonghuduan/miniprogram/pages/index/index.js`：

```javascript
const app = getApp();

Page({
  data: {
    categories: [],
    products: [],
    selectedCategory: null,
    loading: false
  },

  onLoad() {
    this.setData({
      categories: app.globalData.categories || []
    });

    if (!app.globalData.categories) {
      this.refreshCategories();
    }
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.refreshCategories().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 刷新分类
  async refreshCategories() {
    this.setData({ loading: true });

    try {
      await app.refreshData();
      this.setData({
        categories: app.globalData.categories
      });
    } catch (error) {
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 选择分类
  async selectCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ selectedCategory: category });

    // 从缓存加载产品
    const cacheKey = `products_${category.id}`;
    const cached = wx.getStorageSync(cacheKey);

    if (cached && Date.now() - cached.timestamp < 1800000) { // 30分钟缓存
      this.setData({ products: cached.data });
      return;
    }

    // 从服务器加载
    await this.loadProducts(category.id);
  },

  // 加载产品
  async loadProducts(categoryId) {
    this.setData({ loading: true });

    try {
      const res = await wx.request({
        url: `${app.globalData.apiUrl}/api/miniprogram/products`,
        data: {
          categoryId,
          merchantId: app.globalData.selectedMerchantId
        },
        method: 'GET'
      });

      if (res.data.success) {
        const products = res.data.data;
        this.setData({ products });

        // 缓存产品
        wx.setStorageSync(`products_${categoryId}`, {
          data: products,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Load products failed:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
```

**Step 3: 提交**

```bash
git add yonghuduan/miniprogram/app.js
git add yonghuduan/miniprogram/pages/index/index.js
git commit -m "feat: add data fetching and caching to miniprogram"
```

---

## Phase 6: 测试和文档

### Task 15: 运行端到端测试

**Step 1: 启动后端**

```bash
cd backend
npm run dev
```

**Step 2: 启动商家端**

```bash
cd shangjiaduan
npm run dev
```

**Step 3: 测试流程**

1. **创建商家账户**
   - 注册/登录商家账户

2. **创建分类树**
   - 访问 http://localhost:3000/products/categories
   - 创建根分类"服装"
   - 创建子分类"女装" → "夏季"
   - 验证树形结构正确显示

3. **创建产品**
   - 访问 http://localhost:3000/products/manager
   - 选择"夏季"分类
   - 创建产品"连衣裙"
   - 添加标签：舒适、透气、时尚
   - 上传3张图片

4. **验证数据**
   - 检查数据库表数据正确
   - 测试分类删除限制（有子分类不能删除）
   - 测试产品编辑和删除

5. **小程序端验证**
   - 打开小程序
   - 验证分类树显示
   - 选择分类查看产品
   - 验证标签和图片正确显示
   - 测试下拉刷新

**Step 4: 修复发现的问题**

根据测试结果修复 bug

**Step 5: 提交**

```bash
git add .
git commit -m "test: complete end-to-end testing and bug fixes"
```

---

### Task 16: 更新文档

**Step 1: 更新 README.md**

在 README.md 中添加新功能说明：

```markdown
## 产品数据管理功能

### 商家端功能

- **多级分类管理** - 支持创建无限层级的分类树
- **产品管理** - 在叶子节点分类下创建产品
- **标签系统** - 支持预设标签和自定义标签
- **图片管理** - 支持最多9张图片，拖拽排序

### 小程序端功能

- **分类浏览** - 树形展示分类
- **产品查看** - 查看产品详情、标签和图片
- **智能缓存** - 分类缓存1小时，产品缓存30分钟
```

**Step 2: 提交**

```bash
git add README.md
git commit -m "docs: update README with product management features"
```

---

## 完成检查清单

在实施完成后，验证：

- [ ] 所有数据库迁移已运行
- [ ] 后端 API 单元测试通过
- [ ] 商家端可以创建、编辑、删除分类和产品
- [ ] 图片上传功能正常
- [ ] 小程序端可以拉取和显示数据
- [ ] 缓存机制正常工作
- [ ] 商家数据隔离正确
- [ ] 所有提交已推送到远程仓库

---

**计划结束**

实现这个计划需要大约 4-6 小时的工作量，包括开发和测试。每个任务都是独立且可验证的，确保渐进式开发。
