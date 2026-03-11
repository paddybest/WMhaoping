import { Response } from 'express';
import { PrizeModel } from '../database/models/Prize';

/**
 * 小程序端奖品API控制器
 *
 * 功能：
 * - 根据merchant_id获取奖品列表
 * - 自动验证merchant_id有效性
 * - 只返回有库存的奖品
 */
export class MiniprogramPrizeController {
  /**
   * 获取商家奖品列表（公开接口）
   *
   * GET /api/miniprogram/prizes?merchantId=123
   *
   * 查询参数：
   * - merchantId: 商家ID（必填）
   * - withStock: 是否只返回有库存的奖品（可选，默认true）
   */
  static async getPrizes(req: any, res: Response): Promise<void> {
    try {
      const { merchantId, withStock = 'true' } = req.query;

      // 验证merchantId参数
      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: '缺少merchantId参数',
          code: 'MISSING_MERCHANT_ID'
        });
        return;
      }

      const merchantIdNum = parseInt(merchantId as string);
      if (isNaN(merchantIdNum)) {
        res.status(400).json({
          success: false,
          error: 'merchantId参数无效',
          code: 'INVALID_MERCHANT_ID'
        });
        return;
      }

      // 根据withStock参数决定查询方法
      const shouldFilterStock = withStock === 'true' || withStock === '1';
      const prizes = shouldFilterStock
        ? await PrizeModel.findByMerchantWithStock(merchantIdNum)
        : await PrizeModel.findByMerchant(merchantIdNum);

      res.json({
        success: true,
        data: prizes,
        count: prizes.length
      });
    } catch (error) {
      console.error('获取奖品列表失败:', error);
      res.status(500).json({
        success: false,
        error: '获取奖品列表失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 根据ID获取奖品详情（公开接口）
   *
   * GET /api/miniprogram/prizes/:id?merchantId=123
   *
   * 路径参数：
   * - id: 奖品ID
   *
   * 查询参数：
   * - merchantId: 商家ID（必填，用于验证权限）
   */
  static async getPrizeById(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { merchantId } = req.query;

      // 验证参数
      if (!id || !merchantId) {
        res.status(400).json({
          success: false,
          error: '缺少必需参数',
          code: 'MISSING_PARAMETERS'
        });
        return;
      }

      const prizeId = parseInt(id);
      const merchantIdNum = parseInt(merchantId as string);

      if (isNaN(prizeId) || isNaN(merchantIdNum)) {
        res.status(400).json({
          success: false,
          error: '参数无效',
          code: 'INVALID_PARAMETERS'
        });
        return;
      }

      // 使用多租户安全验证方法
      const prize = await PrizeModel.findByIdAndMerchant(prizeId, merchantIdNum);

      if (!prize) {
        res.status(404).json({
          success: false,
          error: '奖品不存在或无权访问',
          code: 'PRIZE_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: prize
      });
    } catch (error) {
      console.error('获取奖品详情失败:', error);
      res.status(500).json({
        success: false,
        error: '获取奖品详情失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}
