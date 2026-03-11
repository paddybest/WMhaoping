import { pool } from '../connection';

export interface LotteryCode {
  id?: number;
  code: string;
  prize_id?: number;
  merchant_id?: number;  // 多租户支持：关联商家ID
  status: number; // 0-未使用, 1-已使用
  user_id?: number;
  created_at?: Date;
  claimed_at?: Date;
}

export class LotteryCodeModel {
  static async create(code: Omit<LotteryCode, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryCode> {
    const result = await pool.query(
      'INSERT INTO lottery_codes (code, prize_id, status, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [code.code, code.prize_id, code.status, code.user_id]
    );
    return { ...code, id: result.rows[0].id };
  }

  static async findByCode(code: string): Promise<LotteryCode | null> {
    const result = await pool.query('SELECT * FROM lottery_codes WHERE code = $1', [code]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<LotteryCode | null> {
    const result = await pool.query('SELECT * FROM lottery_codes WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByUserId(userId: number): Promise<LotteryCode[]> {
    const result = await pool.query(
      'SELECT * FROM lottery_codes WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows as LotteryCode[];
  }

  static async findByPrizeId(prizeId: number): Promise<LotteryCode[]> {
    const result = await pool.query(
      'SELECT * FROM lottery_codes WHERE prize_id = $1 ORDER BY created_at DESC',
      [prizeId]
    );
    return result.rows as LotteryCode[];
  }

  static async updateStatus(code: string, status: number): Promise<boolean> {
    if (status === 1) {
      // 更新为已使用状态，记录核销时间
      const result = await pool.query(
        'UPDATE lottery_codes SET status = $1, claimed_at = NOW() WHERE code = $2',
        [status, code]
      );
      return Boolean(result.rowCount || 0);
    } else {
      // 仅更新状态
      const result = await pool.query(
        'UPDATE lottery_codes SET status = $1 WHERE code = $2',
        [status, code]
      );
      return Boolean(result.rowCount || 0);
    }
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM lottery_codes WHERE id = $1', [id]);
    return Boolean(result.rowCount || 0);
  }

  static async countByPrizeId(prizeId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_codes WHERE prize_id = $1',
      [prizeId]
    );
    return parseInt(result.rows[0].count);
  }

  static async countByStatus(status: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_codes WHERE status = $1',
      [status]
    );
    return parseInt(result.rows[0].count);
  }

  static async getAvailableCodes(prizeId?: number): Promise<LotteryCode[]> {
    let query = 'SELECT * FROM lottery_codes WHERE status = 0';
    let params: any[] = [];

    if (prizeId) {
      query += ' AND prize_id = $1';
      params.push(prizeId);
    }

    query += ' ORDER BY created_at ASC';

    const result = await pool.query(query, params);
    return result.rows as LotteryCode[];
  }

  static async generateUniqueCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let exists: boolean;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const existingCode = await this.findByCode(code);
      exists = existingCode !== null;
    } while (exists);

    return code;
  }

  static async batchCreate(codes: Array<{ prize_id: number; user_id?: number }>): Promise<LotteryCode[]> {
    const createdCodes: LotteryCode[] = [];

    for (const codeData of codes) {
      const code = await this.generateUniqueCode();
      const created = await this.create({
        code,
        prize_id: codeData.prize_id,
        status: 0,
        user_id: codeData.user_id
      });
      createdCodes.push(created);
    }

    return createdCodes;
  }
}
