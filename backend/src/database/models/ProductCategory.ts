import { pool } from '../connection';

export interface ProductCategory {
  id?: number;
  merchantId: number;
  name: string;
  parentId?: number | null;
  level: number;
  path: string;
  orderIndex: number;
  tags?: string[];
  created_at?: Date;
  updated_at?: Date;
  children?: ProductCategory[];
}

export class ProductCategoryModel {
  // 查询商家的所有分类（树形）
  static async findTreeByMerchant(merchantId: number): Promise<ProductCategory[]> {
    const result = await pool.query(
      `SELECT
        id,
        merchant_id as "merchantId",
        name,
        parent_id as "parentId",
        level,
        path,
        order_index as "orderIndex",
        tags,
        created_at,
        updated_at
      FROM product_categories
      WHERE merchant_id = $1
      ORDER BY path`,
      [merchantId]
    );
    const categories = result.rows;

    // 解析 tags JSON 字段
    categories.forEach(cat => {
      if (cat.tags) {
        cat.tags = typeof cat.tags === 'string' ? JSON.parse(cat.tags) : cat.tags;
      } else {
        cat.tags = [];
      }
    });

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
    const result = await pool.query(
      `SELECT
        id,
        merchant_id as "merchantId",
        name,
        parent_id as "parentId",
        level,
        path,
        order_index as "orderIndex",
        tags,
        created_at,
        updated_at
      FROM product_categories
      WHERE id = $1`,
      [id]
    );
    const row = result.rows[0];
    if (row && row.tags) {
      row.tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags;
    }
    return row || null;
  }

  // 根据 ID 查询分类（不解析 tags，用于内部使用）
  static async findByIdRaw(id: number): Promise<any | null> {
    const result = await pool.query(
      `SELECT * FROM product_categories WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // 创建分类
  static async create(category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at' | 'level' | 'path'>): Promise<ProductCategory> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 检查同级分类名称唯一性（同一商家、同一父分类下不能有同名分类）
      const existing = await client.query(
        'SELECT id FROM product_categories WHERE merchant_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND name = $3',
        [category.merchantId, category.parentId || null, category.name]
      );

      if (existing.rows.length > 0) {
        throw new Error('Category with this name already exists at the same level');
      }

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
      const insertResult = await client.query(
        'INSERT INTO product_categories (merchant_id, name, parent_id, level, path, order_index) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [category.merchantId, category.name, parentId, level, path, category.orderIndex]
      );

      const insertId = insertResult.rows[0].id;

      // 更新 path
      const finalPath = `${path}${insertId}/`;
      await client.query(
        'UPDATE product_categories SET path = $1 WHERE id = $2',
        [finalPath, insertId]
      );

      await client.query('COMMIT');

      return this.findById(insertId) as Promise<ProductCategory>;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 更新分类
  static async update(id: number, updates: Partial<ProductCategory>): Promise<ProductCategory | null> {
    // 先获取当前分类信息
    const current = await this.findById(id);
    if (!current) {
      throw new Error('Category not found');
    }

    const fields: string[] = [];
    const values: any[] = [];

    // 如果要更新名称，检查唯一性
    if (updates.name !== undefined) {
      const existing = await pool.query(
        'SELECT id FROM product_categories WHERE merchant_id = $1 AND parent_id IS NOT DISTINCT FROM $2 AND name = $3 AND id != $4',
        [current.merchantId, updates.parentId !== undefined ? updates.parentId : current.parentId, updates.name, id]
      );

      if (existing.rows.length > 0) {
        throw new Error('Category with this name already exists at the same level');
      }

      fields.push('name = $' + (values.length + 1));
      values.push(updates.name);
    }
    if (updates.parentId !== undefined) {
      // 检查循环依赖：不能将分类设置为自己的后代节点
      if (updates.parentId !== null) {
        const isDescendant = await this.isDescendant(id, updates.parentId);
        if (isDescendant) {
          throw new Error('Cannot set parent to descendant category (circular reference)');
        }
      }
      fields.push('parent_id = $' + (values.length + 1));
      values.push(updates.parentId);
    }
    if (updates.orderIndex !== undefined) {
      fields.push('order_index = $' + (values.length + 1));
      values.push(updates.orderIndex);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE product_categories SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );

    return this.findById(id);
  }

  // 检查一个分类是否是另一个分类的后代节点
  private static async isDescendant(ancestorId: number, categoryId: number): Promise<boolean> {
    if (ancestorId === categoryId) {
      return true; // 同一个节点
    }

    const result = await pool.query(
      'SELECT parent_id FROM product_categories WHERE id = $1',
      [categoryId]
    );

    const category = result.rows[0];
    if (!category || !category.parent_id) {
      return false; // 到达根节点
    }

    // 递归检查父节点
    return this.isDescendant(ancestorId, category.parent_id);
  }

  // 删除分类（检查是否有子分类或产品）
  static async delete(id: number): Promise<boolean> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 检查是否有子分类
      const children = await client.query(
        'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = $1',
        [id]
      );
      if (parseInt(children.rows[0].count) > 0) {
        throw new Error('Cannot delete category with children');
      }

      // 检查是否有关联的产品
      const products = await client.query(
        'SELECT COUNT(*) as count FROM product_items WHERE category_id = $1',
        [id]
      );
      if (parseInt(products.rows[0].count) > 0) {
        throw new Error('Cannot delete category with products');
      }

      await client.query('DELETE FROM product_categories WHERE id = $1', [id]);
      await client.query('COMMIT');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 检查是否为叶子节点
  static async isLeafNode(id: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM product_categories WHERE parent_id = $1',
      [id]
    );
    return parseInt(result.rows[0].count) === 0;
  }

  // 获取分类的顶级祖先
  static async findTopLevelAncestor(categoryId: number): Promise<ProductCategory | null> {
    const category = await this.findById(categoryId);
    if (!category || category.level === 0) {
      return category;
    }

    // 从 path 中提取顶级分类 ID (path 格式如 /1/3/5/)
    const pathParts = category.path.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      const topLevelId = parseInt(pathParts[0]);
      return this.findById(topLevelId);
    }

    return category;
  }

  // 获取商家的所有顶级分类（带标签）
  static async findTopLevelCategories(merchantId: number): Promise<ProductCategory[]> {
    const result = await pool.query(
      `SELECT
        id,
        merchant_id as "merchantId",
        name,
        parent_id as "parentId",
        level,
        path,
        order_index as "orderIndex",
        tags,
        created_at,
        updated_at
      FROM product_categories
      WHERE merchant_id = $1 AND level = 0
      ORDER BY order_index, id`,
      [merchantId]
    );
    const categories = result.rows;
    categories.forEach(cat => {
      if (cat.tags) {
        cat.tags = typeof cat.tags === 'string' ? JSON.parse(cat.tags) : cat.tags;
      } else {
        cat.tags = [];
      }
    });
    return categories;
  }

  // 更新分类标签
  static async updateTags(id: number, tags: string[]): Promise<ProductCategory | null> {
    // 验证标签数量（固定6个）
    if (tags.length !== 6) {
      throw new Error('Tags must have exactly 6 items');
    }

    // 验证每个标签长度（允许空字符串）
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.length > 4) {
        throw new Error('Each tag must be 0-4 characters');
      }
    }

    const tagsJson = JSON.stringify(tags);
    await pool.query(
      'UPDATE product_categories SET tags = $1 WHERE id = $2',
      [tagsJson, id]
    );

    return this.findById(id);
  }
}
