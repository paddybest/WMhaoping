import { pool } from '../connection';

export interface Prize {
  id?: number;
  merchant_id?: number;  // 多租户支持：关联商家ID
  name: string;
  description?: string;
  probability: number;
  stock: number;
  image_url?: string;
  created_at?: Date;
}

export interface LotteryPrize extends Prize {
  id: number;
}

export class PrizeModel {
  static async findAll(): Promise<Prize[]> {
    const result = await pool.query('SELECT * FROM prizes ORDER BY created_at DESC');
    return result.rows as Prize[];
  }

  static async findById(id: number): Promise<Prize | null> {
    const result = await pool.query('SELECT * FROM prizes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(prize: Omit<Prize, 'id' | 'created_at'>): Promise<Prize> {
    const result = await pool.query(
      'INSERT INTO prizes (merchant_id, name, description, probability, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [prize.merchant_id, prize.name, prize.description ?? null, prize.probability, prize.stock, prize.image_url ?? null]
    );
    return { ...prize, id: result.rows[0].id };
  }

  static async update(id: number, updates: Partial<Prize>): Promise<Prize | null> {
    const fields = Object.keys(updates).map(key => `${key} = $${Object.keys(updates).indexOf(key) + 1}`).join(', ');
    const values = Object.values(updates);

    await pool.query(
      `UPDATE prizes SET ${fields} WHERE id = $${values.length + 1}`,
      [...values, id]
    );

    const result = await pool.query('SELECT * FROM prizes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM prizes WHERE id = $1', [id]);
    return Boolean(result.rowCount || 0);
  }

  static async updateStock(id: number, stockChange: number): Promise<Prize | null> {
    const result = await pool.query(
      'UPDATE prizes SET stock = stock + $1 WHERE id = $2',
      [stockChange, id]
    );

    if (result.rowCount! === 0) {
      return null;
    }

    const prizeResult = await pool.query('SELECT * FROM prizes WHERE id = $1', [id]);
    return prizeResult.rows[0] || null;
  }

  static async findAllWithStock(): Promise<Prize[]> {
    const result = await pool.query(
      'SELECT * FROM prizes WHERE stock > 0 ORDER BY created_at DESC'
    );
    return result.rows as Prize[];
  }

  static async decrementStock(id: number): Promise<void> {
    await pool.query(
      'UPDATE prizes SET stock = stock - 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND stock > 0',
      [id]
    );
  }

  static async incrementStock(id: number, quantity = 1): Promise<void> {
    await pool.query(
      'UPDATE prizes SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [quantity, id]
    );
  }

  /**
   * 根据商家ID获取奖品列表（多租户支持）
   */
  static async findByMerchant(merchantId: number): Promise<Prize[]> {
    const result = await pool.query(
      'SELECT * FROM prizes WHERE merchant_id = $1 ORDER BY created_at DESC',
      [merchantId]
    );
    return result.rows as Prize[];
  }

  /**
   * 根据商家ID获取有库存的奖品列表（多租户支持）
   */
  static async findByMerchantWithStock(merchantId: number): Promise<Prize[]> {
    const result = await pool.query(
      'SELECT * FROM prizes WHERE merchant_id = $1 AND stock > 0 ORDER BY created_at DESC',
      [merchantId]
    );
    return result.rows as Prize[];
  }

  /**
   * 根据ID和商家ID查找奖品（多租户安全验证）
   * 确保商家只能访问自己的奖品数据
   */
  static async findByIdAndMerchant(id: number, merchantId: number): Promise<Prize | null> {
    const result = await pool.query(
      'SELECT * FROM prizes WHERE id = $1 AND merchant_id = $2',
      [id, merchantId]
    );
    return result.rows[0] || null;
  }

  /**
   * 删除奖品（多租户安全验证）
   * 只能删除属于当前商家的奖品
   */
  static async deleteByMerchant(id: number, merchantId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM prizes WHERE id = $1 AND merchant_id = $2',
      [id, merchantId]
    );
    return Boolean(result.rowCount || 0);
  }

  /**
   * 更新奖品（多租户安全验证）
   * 只能更新属于当前商家的奖品
   */
  static async updateByMerchant(
    id: number,
    merchantId: number,
    updates: Partial<Omit<Prize, 'id' | 'merchant_id' | 'created_at'>>
  ): Promise<Prize | null> {
    const fields = Object.keys(updates).map(key => `${key} = $${Object.keys(updates).indexOf(key) + 1}`).join(', ');
    const values = Object.values(updates);

    await pool.query(
      `UPDATE prizes SET ${fields} WHERE id = $${values.length + 1} AND merchant_id = $${values.length + 2}`,
      [...values, id, merchantId]
    );

    const result = await pool.query('SELECT * FROM prizes WHERE id = $1 AND merchant_id = $2', [id, merchantId]);
    return result.rows[0] || null;
  }
}
