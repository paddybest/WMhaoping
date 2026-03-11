import { pool } from '../connection';

export interface LotteryRecord {
  id?: number;
  user_id: number;
  prize_id?: number;
  prize_name?: string;
  reward_code?: string;
  is_claimed: boolean;
  created_at?: Date;
  claimed_at?: Date;
}

export class LotteryRecordModel {
  static async create(record: Omit<LotteryRecord, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryRecord> {
    const result = await pool.query(
      'INSERT INTO lottery_records (user_id, prize_id, prize_name, reward_code, is_claimed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [record.user_id, record.prize_id, record.prize_name, record.reward_code, record.is_claimed]
    );
    return { ...record, id: result.rows[0].id };
  }

  static async findByUserId(userId: number, offset: number = 0, limit: number = 20): Promise<LotteryRecord[]> {
    const result = await pool.query(
      'SELECT * FROM lottery_records WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return result.rows as LotteryRecord[];
  }

  static async findByUserIdWithPagination(userId: number, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const [records, countResult] = await Promise.all([
      this.findByUserId(userId, offset, limit),
      pool.query('SELECT COUNT(*) as total FROM lottery_records WHERE user_id = $1', [userId])
    ]);

    const total = parseInt(countResult.rows[0].total);

    return {
      records: records as LotteryRecord[],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async findById(id: number): Promise<LotteryRecord | null> {
    const result = await pool.query('SELECT * FROM lottery_records WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByRewardCode(rewardCode: string): Promise<LotteryRecord | null> {
    const result = await pool.query('SELECT * FROM lottery_records WHERE reward_code = $1', [rewardCode]);
    return result.rows[0] || null;
  }

  static async findByPrizeId(prizeId: number): Promise<LotteryRecord[]> {
    const result = await pool.query(
      'SELECT * FROM lottery_records WHERE prize_id = $1 ORDER BY created_at DESC',
      [prizeId]
    );
    return result.rows as LotteryRecord[];
  }

  static async updateClaimed(rewardCode: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE lottery_records SET is_claimed = true, claimed_at = NOW() WHERE reward_code = $1',
      [rewardCode]
    );
    return Boolean(result.rowCount || 0);
  }

  static async updatePrizeInfo(id: number, prizeId: number, prizeName: string): Promise<boolean> {
    const result = await pool.query(
      'UPDATE lottery_records SET prize_id = $1, prize_name = $2 WHERE id = $3',
      [prizeId, prizeName, id]
    );
    return Boolean(result.rowCount || 0);
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_records WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async countByUserIdAndDate(userId: number, startDate: Date, endDate: Date): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_records WHERE user_id = $1 AND created_at >= $2 AND created_at < $3',
      [userId, startDate, endDate]
    );
    return parseInt(result.rows[0].count);
  }

  static async getTodayDrawCount(userId: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.countByUserIdAndDate(userId, today, tomorrow);
  }

  static async getClaimedCount(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_records WHERE user_id = $1 AND is_claimed = true',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getUnclaimedCount(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM lottery_records WHERE user_id = $1 AND is_claimed = false',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM lottery_records WHERE id = $1', [id]);
    return Boolean(result.rowCount || 0);
  }

  static async getUserStatistics(userId: number): Promise<{
    totalDraws: number;
    claimedPrizes: number;
    unclaimedPrizes: number;
  }> {
    const totalDraws = await this.countByUserId(userId);
    const claimedPrizes = await this.getClaimedCount(userId);
    const unclaimedPrizes = await this.getUnclaimedCount(userId);

    return {
      totalDraws,
      claimedPrizes,
      unclaimedPrizes
    };
  }
}
