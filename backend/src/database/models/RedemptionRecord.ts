import { pool } from '../connection';

export interface RedemptionRecord {
  id?: number;
  merchant_id: number;
  user_id: number;
  prize_id: number;
  lottery_record_id?: number;
  reward_code: string;
  cash_amount: number;
  status: 'pending' | 'success' | 'failed' | 'verified';
  screenshot_url?: string;
  verified_by?: number;
  verified_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export class RedemptionRecordModel {
  static async create(record: Omit<RedemptionRecord, 'id' | 'created_at' | 'updated_at'>): Promise<RedemptionRecord> {
    const result = await pool.query(
      `INSERT INTO redemption_records
       (merchant_id, user_id, prize_id, lottery_record_id, reward_code, cash_amount, status, screenshot_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [record.merchant_id, record.user_id, record.prize_id, record.lottery_record_id,
       record.reward_code, record.cash_amount, record.status, record.screenshot_url || null]
    );
    return { ...record, id: result.rows[0].id };
  }

  static async findByRewardCode(rewardCode: string): Promise<RedemptionRecord | null> {
    const result = await pool.query(
      'SELECT * FROM redemption_records WHERE reward_code = $1',
      [rewardCode]
    );
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<RedemptionRecord | null> {
    const result = await pool.query(
      'SELECT * FROM redemption_records WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByMerchant(merchantId: number, status?: string): Promise<RedemptionRecord[]> {
    let sql = 'SELECT * FROM redemption_records WHERE merchant_id = $1';
    const params: any[] = [merchantId];
    if (status) {
      sql += ' AND status = $' + (params.length + 1);
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows as RedemptionRecord[];
  }

  static async findByUser(userId: number): Promise<RedemptionRecord[]> {
    const result = await pool.query(
      'SELECT * FROM redemption_records WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows as RedemptionRecord[];
  }

  static async updateStatus(id: number, status: string, verifiedBy?: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE redemption_records SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3',
      [status, verifiedBy || null, id]
    );
    return Boolean(result.rowCount || 0);
  }

  static async uploadScreenshot(id: number, screenshotUrl: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE redemption_records SET screenshot_url = $1 WHERE id = $2',
      [screenshotUrl, id]
    );
    return Boolean(result.rowCount || 0);
  }
}
