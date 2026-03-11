import { pool } from '../connection';

export interface Tag {
  id?: number;
  name: string;
  merchantId: number;
  category_id: number | null;
  product_count?: number;
  created_at?: Date;
  updated_at?: Date;
}

export class TagModel {
  // 获取所有标签
  static async findAll(merchantId: number): Promise<Tag[]> {
    const result = await pool.query(
      `SELECT
        id, name, merchant_id, category_id,
        COUNT(DISTINCT product_id) as product_count
      FROM product_items
      WHERE merchant_id = $1 AND tags IS NOT NULL AND tags != 'null' AND tags != '""'
        GROUP BY name
      ORDER BY name ASC`,
      [merchantId]
    );

    return result.rows as Tag[];
  }

  // 根据ID获取标签
  static async findById(id: number, merchantId: number): Promise<Tag | null> {
    const result = await pool.query(
      `SELECT
        id, name, merchant_id, category_id,
        COUNT(DISTINCT product_id) as product_count
      FROM product_items
      WHERE merchant_id = $1 AND name = $2 AND id = $1
      `,
      [merchantId, id]
    );

    return result.rows[0] || null;
  }

  // 创建标签
  static async create(tag: Omit<Tag, 'id' | 'created_at' | 'updated_at'>): Promise<Tag> {
    const { name, category_id, merchantId } = tag;

    if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
      throw new Error('Tag name must be 1-50 characters');
    }

    const result = await pool.query(
      'INSERT INTO product_tag_labels (name, category_id, merchant_id) VALUES ($1, $2, $3) RETURNING id',
      [name, category_id, merchantId]
    );

    return { ...tag, id: result.rows[0].id };
  }

  // 更新标签名称
  static async update(id: number, merchantId: number, updates: Partial<Tag>): Promise<Tag | null> {
    const { name, category_id } = updates;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = $' + (values.length + 1));
      values.push(name);
    }
    if (category_id !== undefined) {
      fields.push('category_id = $' + (values.length + 1));
      values.push(category_id);
    }

    if (fields.length === 0) {
      throw new Error('At least name or category_id must be provided');
    }

    values.push(id, merchantId);

    await pool.query(
      `UPDATE product_tag_labels SET ${fields.join(', ')} WHERE id = $${values.length - 1} AND merchant_id = $${values.length}`,
      values
    );

    return await this.findById(id, merchantId);
  }

  // 删除标签
  static async delete(id: number, merchantId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM product_tag_labels WHERE id = $1 AND merchant_id = $2',
      [id, merchantId]
    );
    return Boolean(result.rowCount || 0);
  }

  // 获取标签的产品统计
  static async getTagStats(merchantId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        t.name,
        COUNT(DISTINCT product_id) as product_count
      FROM product_tag_labels t
      JOIN product_items ON tags @> jsonb_build_array(t.name)::jsonb
      WHERE t.merchant_id = $1
      GROUP BY t.name
      ORDER BY product_count DESC
      `,
      [merchantId]
    );

    return result.rows as any[];
  }
}
