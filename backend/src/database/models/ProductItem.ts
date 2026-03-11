import { pool } from '../connection';
import { ProductCategoryModel } from './ProductCategory';
import { AIService } from '../../services/ai';

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
    const result = await pool.query(
      `SELECT
        id,
        merchant_id as "merchantId",
        category_id as "categoryId",
        name,
        tags,
        is_active as "isActive",
        created_at,
        updated_at
      FROM product_items
      WHERE category_id = $1 AND merchant_id = $2
      ORDER BY created_at DESC`,
      [categoryId, merchantId]
    );
    return result.rows.map(row => ({
      ...row,
      tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags || '[]'),
      isActive: Boolean(row.isActive)
    }));
  }

  // 根据 ID 查询产品（含图片）
  static async findById(id: number): Promise<ProductItem | null> {
    const result = await pool.query(
      `SELECT
        id,
        merchant_id as "merchantId",
        category_id as "categoryId",
        name,
        tags,
        is_active as "isActive",
        created_at,
        updated_at
      FROM product_items
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const product = result.rows[0];
    return {
      ...product,
      tags: Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags || '[]'),
      isActive: Boolean(product.isActive)
    };
  }

  // 创建产品
  static async create(product: Omit<ProductItem, 'id' | 'created_at' | 'updated_at'>): Promise<ProductItem> {
    // 验证分类是叶子节点
    const isLeaf = await ProductCategoryModel.isLeafNode(product.categoryId);
    if (!isLeaf) {
      throw new Error('Category must be a leaf node');
    }

    // 获取分类名称用于AI生成标签
    let categoryName = '';
    try {
      const category = await ProductCategoryModel.findById(product.categoryId);
      categoryName = category?.name || '';
    } catch (e) {
      console.log('Failed to get category name:', e);
    }

    // 如果没有提供标签，自动生成6个标签
    let tags = product.tags;
    if (!tags || tags.length === 0) {
      try {
        tags = await AIService.generateTags(product.name, categoryName);
      } catch (e) {
        console.error('Failed to generate tags:', e);
        // 使用默认标签
        tags = ['优质', '实惠', '耐用', '美观', '实用', '推荐'];
      }
    } else {
      // 确保标签数量为6个
      while (tags.length < 6) {
        tags.push('');
      }
      tags = tags.slice(0, 6);
    }

    const result = await pool.query(
      'INSERT INTO product_items (merchant_id, category_id, name, tags, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [product.merchantId, product.categoryId, product.name, JSON.stringify(tags), product.isActive]
    );

    const insertId = result.rows[0].id;
    return this.findById(insertId) as Promise<ProductItem>;
  }

  // 更新产品
  static async update(id: number, updates: Partial<ProductItem>): Promise<ProductItem | null> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = $' + (values.length + 1));
      values.push(updates.name);
    }
    if (updates.tags !== undefined) {
      fields.push('tags = $' + (values.length + 1));
      values.push(JSON.stringify(updates.tags));
    }
    if (updates.isActive !== undefined) {
      fields.push('is_active = $' + (values.length + 1));
      values.push(updates.isActive);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    await pool.query(
      `UPDATE product_items SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );

    return this.findById(id);
  }

  // 删除产品
  static async delete(id: number, merchantId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM product_items WHERE id = $1 AND merchant_id = $2',
      [id, merchantId]
    );
    return Boolean(result.rowCount || 0);
  }
}
