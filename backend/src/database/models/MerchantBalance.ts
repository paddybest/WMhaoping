import { pool } from '../connection';

export interface MerchantBalance {
  id?: number;
  merchant_id: number;
  balance: number;
  total_recharged: number;
  total_redeemed: number;
  created_at?: Date;
  updated_at?: Date;
}

export class MerchantBalanceModel {
  static async findByMerchantId(merchantId: number): Promise<MerchantBalance | null> {
    const result = await pool.query(
      'SELECT * FROM merchant_balances WHERE merchant_id = $1',
      [merchantId]
    );
    return result.rows[0] || null;
  }

  static async getOrCreate(merchantId: number): Promise<MerchantBalance> {
    let balance = await this.findByMerchantId(merchantId);
    if (!balance) {
      await pool.query(
        'INSERT INTO merchant_balances (merchant_id, balance, total_recharged, total_redeemed) VALUES ($1, 0, 0, 0)',
        [merchantId]
      );
      balance = await this.findByMerchantId(merchantId);
    }
    return balance!;
  }

  static async recharge(merchantId: number, amount: number): Promise<MerchantBalance> {
    await pool.query(
      'UPDATE merchant_balances SET balance = balance + $1, total_recharged = total_recharged + $1 WHERE merchant_id = $2',
      [amount, merchantId]
    );
    return (await this.findByMerchantId(merchantId))!;
  }

  static async deduct(merchantId: number, amount: number): Promise<boolean> {
    const result = await pool.query(
      'UPDATE merchant_balances SET balance = balance - $1, total_redeemed = total_redeemed + $1 WHERE merchant_id = $2 AND balance >= $1',
      [amount, merchantId]
    );
    return Boolean(result.rowCount || 0);
  }
}
