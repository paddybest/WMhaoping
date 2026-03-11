import { pool } from '../database/connection';

export interface CategoryWithTags {
  id: number;
  name: string;
  tags: {
    id: number;
    name: string;
    category_id: number;
    order_index?: number;
  }[];
  tag_count: number;
}

export interface Tag {
  id: number;
  name: string;
  merchantId: number;
  category_id: number;
  order_index?: number;
}

interface CategoryRow {
  category_id: number;
  category_name: string;
  tag_id: number | null;
  tag_name: string | null;
  order_index: number | null;
  id: number;
  merchant_id: number;
  name: string;
  parent_id: number | null;
  level: number;
  path: string;
}

export class TagService {
  /**
   * 获取所有标签
   */
  static async getAllTags(merchantId: number): Promise<Tag[]> {
    try {
      const result = await pool.query(
        `SELECT id, name, category_id, merchant_id
         FROM product_tag_labels
         WHERE merchant_id = $1
         ORDER BY category_id, order_index, name`,
        [merchantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching all tags:', error);
      throw new Error(`Failed to fetch tags`);
    }
  }

  /**
   * 根据分类ID获取标签
   */
  static async getTagsByCategoryId(categoryId: number, merchantId: number): Promise<Tag[]> {
    try {
      const result = await pool.query(
        `SELECT id, name, category_id, merchant_id
         FROM product_tag_labels
         WHERE category_id = $1 AND merchant_id = $2
         ORDER BY order_index, name`,
        [categoryId, merchantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching tags by category:', error);
      throw new Error(`Failed to fetch tags for category`);
    }
  }

  /**
   * Fetches all tags grouped by their parent category for a specific merchant.
   * Uses a single optimized query with LEFT JOIN to avoid N+1 query problem.
   *
   * @param merchantId - The merchant ID to fetch tags for
   * @returns Array of categories with their associated tags
   * @throws Error if database operation fails
   */
  static async getTagsByCategory(merchantId: number): Promise<CategoryWithTags[]> {
    try {
      const result = await pool.query(
        `SELECT
          pc.id as category_id,
          pc.name as category_name,
          t.id as tag_id,
          t.name as tag_name,
          t.order_index
        FROM product_categories pc
        LEFT JOIN product_categories t ON t.parent_id = pc.id
        WHERE pc.merchant_id = $1 AND pc.parent_id IS NULL
        ORDER BY pc.name, t.order_index, t.name`,
        [merchantId]
      );
      const results = result.rows;

      // Group results by category in memory
      const categoryMap = new Map<number, CategoryWithTags>();

      for (const row of results) {
        if (!categoryMap.has(row.category_id)) {
          categoryMap.set(row.category_id, {
            id: row.category_id,
            name: row.category_name,
            tags: [],
            tag_count: 0
          });
        }

        // Only add tag if it exists (not null from LEFT JOIN)
        if (row.tag_id !== null && row.tag_name !== null) {
          const category = categoryMap.get(row.category_id)!;
          category.tags.push({
            id: row.tag_id,
            name: row.tag_name,
            category_id: row.category_id,
            order_index: row.order_index ?? undefined
          });
        }
      }

      // Update tag counts and convert to array
      const categoryArray = Array.from(categoryMap.values());
      categoryArray.forEach(category => {
        category.tag_count = category.tags.length;
      });

      return categoryArray;
    } catch (error) {
      console.error('Error fetching tags for merchant:', merchantId, error);
      throw new Error(`Failed to fetch tags for merchant ${merchantId}`);
    }
  }

  /**
   * 创建标签（归属于类目）
   */
  static async createTag(merchantId: number, categoryId: number, name: string): Promise<Tag> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 检查类目是否存在
      console.log(`Creating tag: categoryId=${categoryId}, merchantId=${merchantId}, name=${name}`);
      const categoriesResult = await client.query(
        'SELECT id FROM product_categories WHERE id = $1 AND merchant_id = $2',
        [categoryId, merchantId]
      );
      const categories = categoriesResult.rows;
      console.log(`Categories found: ${categories.length}`);
      if (categories.length === 0) {
        throw new Error(`分类不存在 (categoryId=${categoryId}, merchantId=${merchantId})`);
      }

      // 检查类目标签数量（最多6个）
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM product_tag_labels WHERE category_id = $1 AND merchant_id = $2',
        [categoryId, merchantId]
      );
      if (countResult.rows[0].count >= 6) {
        throw new Error('每个分类最多6个标签已达上限');
      }

      // 检查标签名称在类目内唯一
      const existingResult = await client.query(
        'SELECT id FROM product_tag_labels WHERE category_id = $1 AND merchant_id = $2 AND name = $3',
        [categoryId, merchantId, name]
      );
      const existing = existingResult.rows;
      if (existing.length > 0) {
        throw new Error('该分类下已存在相同名称的标签');
      }

      // 插入标签到 product_tag_labels 表 (PostgreSQL 使用 RETURNING)
      const result = await client.query(
        `INSERT INTO product_tag_labels (merchant_id, name, category_id, order_index)
        VALUES ($1, $2, $3, 0)
        RETURNING id`,
        [merchantId, name, categoryId]
      );

      const tagId = result.rows[0].id;

      await client.query('COMMIT');

      // 返回创建的标签
      const newTagResult = await pool.query(
        'SELECT id, name, category_id, merchant_id FROM product_tag_labels WHERE id = $1',
        [tagId]
      );

      return newTagResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 根据 ID 获取标签
   */
  private static async getTagById(tagId: number): Promise<Tag | null> {
    const result = await pool.query(
      `SELECT id, name, merchant_id as "merchantId", category_id
      FROM product_tag_labels
      WHERE id = $1`,
      [tagId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 重命名标签
   */
  static async renameTag(merchantId: number, oldName: string, newName: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 查找旧标签
      const existingResult = await client.query(
        'SELECT id, category_id FROM product_tag_labels WHERE merchant_id = $1 AND name = $2',
        [merchantId, oldName]
      );
      const existing = existingResult.rows;

      if (existing.length === 0) {
        throw new Error('Tag not found');
      }

      // 检查新名称是否已存在
      const duplicateResult = await client.query(
        'SELECT id FROM product_tag_labels WHERE merchant_id = $1 AND category_id = $2 AND name = $3 AND id != $4',
        [merchantId, existing[0].category_id, newName, existing[0].id]
      );
      const duplicate = duplicateResult.rows;

      if (duplicate.length > 0) {
        throw new Error('该分类下已存在相同名称的标签');
      }

      // 更新标签名称
      await client.query(
        'UPDATE product_tag_labels SET name = $1 WHERE id = $2',
        [newName, existing[0].id]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除标签
   */
  static async deleteTag(merchantId: number, tagName: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 删除标签
      const result = await client.query(
        'DELETE FROM product_tag_labels WHERE merchant_id = $1 AND name = $2',
        [merchantId, tagName]
      );

      if (result.rowCount === 0) {
        throw new Error('Tag not found');
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取标签统计信息
   * 注意: PostgreSQL 使用不同的 JSON 函数
   */
  static async getTagStats(merchantId: number): Promise<any[]> {
    try {
      // PostgreSQL 使用 jsonb 操作符而不是 JSON_CONTAINS
      const result = await pool.query(
        `SELECT
          t.name,
          COUNT(DISTINCT pi.id) as product_count
        FROM product_tag_labels t
        LEFT JOIN product_items pi ON pi.tags ? t.name
        WHERE t.merchant_id = $1
        GROUP BY t.id, t.name
        ORDER BY product_count DESC`,
        [merchantId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error fetching tag stats:', error);
      throw new Error('Failed to fetch tag stats');
    }
  }
}
