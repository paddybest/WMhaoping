import { pool } from '../connection';

/**
 * QrCodeScan Model
 *
 * 扫码统计模型，用于记录用户扫描二维码的事件
 * 支持任务17：扫码统计数据
 *
 * 主要功能：
 * - 记录扫码事件
 * - 统计独立用户数
 * - 提供商家级别的统计数据
 * - 支持时间范围查询（日/周/月）
 */

export interface QrCodeScan {
  id?: number;
  merchant_id: number;
  user_openid: string;
  qr_code_url: string;
  scan_time: Date;
  ip_address?: string;
}

export interface ScanStatistics {
  id?: number;
  merchant_id: number;
  date: string;
  total_scans: number;
  unique_users: number;
}

export interface DailyScanStats {
  merchant_id: number;
  scan_date: string;
  total_scans: number;
  unique_users: number;
}

export class QrCodeScanModel {
  /**
   * 记录扫码事件
   *
   * @param scan - 扫码数据
   * @returns 创建的扫码记录
   */
  static async create(scan: Omit<QrCodeScan, 'id'>): Promise<QrCodeScan> {
    const result = await pool.query(
      'INSERT INTO qr_code_scans (merchant_id, user_openid, qr_code_url, scan_time, ip_address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [scan.merchant_id, scan.user_openid, scan.qr_code_url, scan.scan_time || new Date(), scan.ip_address || null]
    );
    return { ...scan, id: result.rows[0].id };
  }

  /**
   * 检查用户今天是否已扫描过该二维码（防重复统计）
   *
   * @param merchantId - 商家ID
   * @param userOpenid - 微信用户openid
   * @param qrCodeUrl - 二维码URL
   * @returns 是否已扫描
   */
  static async hasScannedToday(
    merchantId: number,
    userOpenid: string,
    qrCodeUrl: string
  ): Promise<boolean> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM qr_code_scans ' +
      'WHERE merchant_id = $1 AND user_openid = $2 AND qr_code_url = $3 ' +
      'AND scan_time >= CURRENT_DATE',
      [merchantId, userOpenid, qrCodeUrl]
    );
    return parseInt(result.rows[0].count) > 0;
  }

  /**
   * 获取商家的扫码统计（汇总）
   *
   * @param merchantId - 商家ID
   * @param startDate - 开始日期（可选）
   * @param endDate - 结束日期（可选）
   * @returns 扫码统计
   */
  static async getScanStatistics(
    merchantId: number,
    startDate?: string,
    endDate?: string
  ): Promise<ScanStatistics[]> {
    let query = `
      SELECT
        id,
        merchant_id,
        date,
        total_scans,
        unique_users,
        created_at
      FROM qr_scan_statistics
      WHERE merchant_id = $1
    `;
    const params: any[] = [merchantId];

    if (startDate) {
      query += ' AND date >= $' + (params.length + 1);
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= $' + (params.length + 1);
      params.push(endDate);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);
    return result.rows as ScanStatistics[];
  }

  /**
   * 获取每日扫码统计（按日期分组）
   *
   * @param merchantId - 商家ID
   * @param days - 天数（默认7天）
   * @returns 每日统计
   */
  static async getDailyScanStats(
    merchantId: number,
    days: number = 7
  ): Promise<DailyScanStats[]> {
    const result = await pool.query(
      `SELECT
        merchant_id,
        DATE(scan_time) as scan_date,
        COUNT(*) as total_scans,
        COUNT(DISTINCT user_openid) as unique_users
      FROM qr_code_scans
      WHERE merchant_id = $1
        AND scan_time >= CURRENT_DATE - INTERVAL '$2 days'
      GROUP BY merchant_id, DATE(scan_time)
      ORDER BY DATE(scan_time) DESC`,
      [merchantId, days]
    );
    return result.rows as DailyScanStats[];
  }

  /**
   * 获取总扫码次数
   *
   * @param merchantId - 商家ID
   * @returns 总扫码次数
   */
  static async getTotalScans(merchantId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as total FROM qr_code_scans WHERE merchant_id = $1',
      [merchantId]
    );
    return parseInt(result.rows[0].total);
  }

  /**
   * 获取独立用户数
   *
   * @param merchantId - 商家ID
   * @returns 独立用户数
   */
  static async getUniqueUsersCount(merchantId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(DISTINCT user_openid) as count FROM qr_code_scans WHERE merchant_id = $1',
      [merchantId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * 获取今日扫码统计
   *
   * @param merchantId - 商家ID
   * @returns 今日统计
   */
  static async getTodayStats(merchantId: number): Promise<{ totalScans: number; uniqueUsers: number }> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_scans,
        COUNT(DISTINCT user_openid) as unique_users
      FROM qr_code_scans
      WHERE merchant_id = $1 AND DATE(scan_time) = CURRENT_DATE`,
      [merchantId]
    );
    return {
      totalScans: parseInt(result.rows[0].total_scans),
      uniqueUsers: parseInt(result.rows[0].unique_users)
    };
  }

  /**
   * 删除指定日期之前的扫码记录（数据清理）
   *
   * @param merchantId - 商家ID
   * @param beforeDate - 日期
   * @returns 删除的记录数
   */
  static async deleteOldScans(merchantId: number, beforeDate: string): Promise<number> {
    const result = await pool.query(
      'DELETE FROM qr_code_scans WHERE merchant_id = $1 AND scan_time < $2',
      [merchantId, beforeDate]
    );
    return result.rowCount || 0;
  }

  /**
   * 获取扫码历史（分页）
   *
   * @param merchantId - 商家ID
   * @param limit - 每页数量
   * @param offset - 偏移量
   * @returns 扫码记录列表
   */
  static async getScanHistory(
    merchantId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<QrCodeScan[]> {
    const result = await pool.query(
      'SELECT * FROM qr_code_scans ' +
      'WHERE merchant_id = $1 ORDER BY scan_time DESC LIMIT $2 OFFSET $3',
      [merchantId, limit, offset]
    );
    return result.rows as QrCodeScan[];
  }

  /**
   * 获取热门扫码时间段
   *
   * @param merchantId - 商家ID
   * @returns 按小时分组的扫码统计
   */
  static async getScanByHour(merchantId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        EXTRACT(HOUR FROM scan_time) as hour,
        COUNT(*) as scan_count
      FROM qr_code_scans
      WHERE merchant_id = $1 AND DATE(scan_time) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM scan_time)
      ORDER BY hour`,
      [merchantId]
    );
    return result.rows as any[];
  }

  /**
   * 更新每日汇总统计表（定时任务使用）
   *
   * @param merchantId - 商家ID
   * @param date - 日期（默认今天）
   * @returns 更新结果
   */
  static async updateDailyStatistics(merchantId: number, date?: string): Promise<boolean> {
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO qr_scan_statistics (merchant_id, date, total_scans, unique_users)
      SELECT $1, $2, COUNT(*), COUNT(DISTINCT user_openid)
      FROM qr_code_scans
      WHERE merchant_id = $3 AND DATE(scan_time) = $4
      ON CONFLICT (merchant_id, date) DO UPDATE SET
        total_scans = EXCLUDED.total_scans,
        unique_users = EXCLUDED.unique_users,
        updated_at = CURRENT_TIMESTAMP`,
      [merchantId, targetDate, merchantId, targetDate]
    );
    return Boolean(result.rowCount || 0);
  }

  /**
   * 获取商家排名（按扫码量）
   *
   * @param limit - 返回数量（默认10）
   * @returns 商家排名列表
   */
  static async getTopMerchantsByScans(limit: number = 10): Promise<any[]> {
    const result = await pool.query(
      `SELECT
        m.id,
        m.name,
        m.shop_name,
        m.is_active,
        COALESCE(s.total_scans, 0) as total_scans,
        COALESCE(s.unique_users, 0) as unique_users
      FROM qr_scan_statistics s
      INNER JOIN merchants m ON s.merchant_id = m.id
      WHERE s.date = CURRENT_DATE
      ORDER BY s.total_scans DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows as any[];
  }
}
