import { Router, Request, Response } from 'express';
import { LotteryService } from '../services/lottery';
import { pool } from '../database/connection';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';

const router = Router();

/**
 * GET /api/lottery/test
 * 健康检查端点
 */
router.get('/test', (_req, res) => {
  return res.json({ message: 'Lottery API working' });
});

/**
 * GET /api/lottery/status
 * 检查用户抽奖次数状态
 * Query参数:
 *   - userId: 用户ID（必需）
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId参数必填'
      });
    }

    const result = await LotteryService.canDraw(userId);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取抽奖状态失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取抽奖状态失败，请稍后重试'
    });
  }
});

/**
 * GET /api/lottery/prizes
 * 获取奖品列表（支持多租户）
 * Query参数:
 *   - merchantId: 商家ID（必需）
 */
router.get('/prizes', async (req: Request, res: Response) => {
  try {
    const merchantId = req.query.merchantId
      ? parseInt(req.query.merchantId as string)
      : undefined;

    if (!merchantId) {
      return res.status(400).json({
        success: false,
        error: 'merchantId参数必填'
      });
    }

    const prizes = await LotteryService.getPrizes(merchantId);

    return res.json({
      success: true,
      data: prizes,
      count: prizes.length
    });
  } catch (error) {
    console.error('获取奖品列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取奖品列表失败，请稍后重试'
    });
  }
});

/**
 * GET /api/lottery/my-prizes
 * 获取用户的中奖记录列表
 * Query参数:
 *   - userId: 用户ID（必需）
 *   - merchantId: 商家ID（可选）
 */
router.get('/my-prizes', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const merchantId = req.query.merchantId ? parseInt(req.query.merchantId as string) : undefined;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId参数必填'
      });
    }

    // 获取用户奖品列表
    const result = await LotteryService.getUserPrizes(userId);

    return res.json({
      success: true,
      data: result.records
    });
  } catch (error) {
    console.error('获取用户奖品列表失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取用户奖品列表失败，请稍后重试'
    });
  }
});

/**
 * GET /api/lottery/records
 * 获取抽奖记录（商家端）
 * 需要商家认证
 */
router.get('/records', authenticateMerchant, injectMerchantId, async (req: Request, res: Response) => {
  const merchantId = (req as any).merchantId;

  try {
    // 获取该商家的抽奖记录（通过关联的奖品查找）
    const result = await pool.query(
      `SELECT lr.id, lr.user_id, lr.prize_id, lr.prize_name, lr.reward_code, lr.is_claimed, lr.created_at, lr.claimed_at
       FROM lottery_records lr
       LEFT JOIN prizes p ON lr.prize_id = p.id
       WHERE p.merchant_id = $1
       ORDER BY lr.created_at DESC
       LIMIT 100`,
      [merchantId]
    );
    const rows = result.rows;

    return res.json({
      success: true,
      data: {
        records: rows
      }
    });
  } catch (error) {
    console.error('获取抽奖记录失败:', error);
    return res.status(500).json({
      success: false,
      error: '获取抽奖记录失败，请稍后重试'
    });
  }
});

/**
 * POST /api/lottery/draw
 * 执行抽奖（支持多租户）
 * Body参数:
 *   - userId: 用户ID（必需）
 *   - merchantId: 商家ID（必需）
 */
router.post('/draw', async (req: Request, res: Response) => {
  try {
    const { userId, merchantId } = req.body;

    if (!userId || !merchantId) {
      return res.status(400).json({
        success: false,
        error: 'userId和merchantId参数必填'
      });
    }

    const result = await LotteryService.draw(userId, merchantId);

    if (result.prize) {
      return res.json({
        success: true,
        data: {
          prize: result.prize,
          code: result.code,
          message: result.message
        }
      });
    } else {
      return res.json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('抽奖失败:', error);
    return res.status(500).json({
      success: false,
      error: '抽奖失败，请稍后重试'
    });
  }
});

/**
 * Generate random 6-character code (A-Z, 0-9)
 */
const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

/**
 * POST /api/lottery/generate-code
 * 生成随机奖励码（替代云函数 createLotteryCode_simple）
 * Body参数:
 *   - openid: 用户openid（可选）
 */
router.post('/generate-code', async (req: Request, res: Response) => {
  try {
    const { openid } = req.body;

    // 生成6位随机码
    const code = generateRandomCode();

    return res.json({
      success: true,
      data: {
        code,
        message: '生成成功',
        openid: openid || 'anonymous'
      }
    });
  } catch (error) {
    console.error('生成奖励码失败:', error);
    return res.status(500).json({
      success: false,
      error: '生成奖励码失败，请稍后重试'
    });
  }
});

export default router;