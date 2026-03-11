import { Router, Request, Response } from 'express';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import { pool } from '../database/connection';

const router = Router();

// 所有路由需要商家认证
router.use(authenticateMerchant);
router.use(injectMerchantId);

/**
 * GET /api/merchant/stats/overview
 * 获取商家概览统计数据
 */
router.get('/overview', async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;

  try {
    // 获取总用户数（通过扫码记录）
    const usersResult = await pool.query(
      'SELECT COUNT(DISTINCT user_openid) as total_users FROM qr_code_scans WHERE merchant_id = $1',
      [merchantId]
    );

    // 获取总评价数
    const evaluationsResult = await pool.query(
      `SELECT COUNT(*) as total_evaluations
       FROM reviews r
       INNER JOIN product_items pi ON r.product_id = pi.id
       WHERE pi.merchant_id = $1`,
      [merchantId]
    );

    // 获取今日评价数 (PostgreSQL 使用 CURRENT_DATE 而不是 CURDATE())
    const todayEvaluationsResult = await pool.query(
      `SELECT COUNT(*) as today_evaluations
       FROM reviews r
       INNER JOIN product_items pi ON r.product_id = pi.id
       WHERE pi.merchant_id = $1 AND DATE(r.created_at) = CURRENT_DATE`,
      [merchantId]
    );

    // 获取抽奖参与数（通过奖品关联的商家）
    const lotteryResult = await pool.query(
      `SELECT COUNT(DISTINCT lr.user_id) as lottery_participants
       FROM lottery_records lr
       INNER JOIN prizes p ON lr.prize_id = p.id
       WHERE p.merchant_id = $1`,
      [merchantId]
    );

    const stats = {
      total_users: usersResult.rows[0]?.total_users || 0,
      total_evaluations: evaluationsResult.rows[0]?.total_evaluations || 0,
      today_evaluations: todayEvaluationsResult.rows[0]?.today_evaluations || 0,
      lottery_participants: lotteryResult.rows[0]?.lottery_participants || 0
    };

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取统计数据失败'
    });
  }
});

/**
 * GET /api/merchant/stats/trends
 * 获取趋势数据
 * Query参数:
 *   - days: 返回最近多少天的数据（默认7）
 */
router.get('/trends', async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;
  const days = parseInt(req.query.days as string) || 7;

  try {
    // 获取评价趋势 (PostgreSQL 使用 NOW() - INTERVAL 而不是 DATE_SUB)
    const evaluationTrendsResult = await pool.query(
      `SELECT DATE(r.created_at) as date, COUNT(*) as count
       FROM reviews r
       INNER JOIN product_items pi ON r.product_id = pi.id
       WHERE pi.merchant_id = $1 AND r.created_at >= NOW() - INTERVAL '$2 days'
       GROUP BY DATE(r.created_at)
       ORDER BY date ASC`,
      [merchantId, days]
    );
    const evaluationTrends = evaluationTrendsResult.rows;

    // 转换为前端需要的格式
    const trends = evaluationTrends.map(row => ({
      date: row.date,
      count: row.count
    }));

    return res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取趋势数据失败'
    });
  }
});

export default router;
