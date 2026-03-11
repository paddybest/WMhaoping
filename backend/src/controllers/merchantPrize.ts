import { Response } from 'express';
import { PrizeModel } from '../database/models/Prize';
import { AuthRequest } from '../middleware/auth';
import OSS = require('ali-oss');
import { randomUUID } from 'crypto';

// OSS配置
const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.OSS_BUCKET || 'haopingbao'
});

/**
 * 商家端奖品API控制器
 *
 * 功能：
 * - 商家可以管理自己的奖品（CRUD）
 * - 自动从JWT提取merchant_id，无需手动传递
 * - 防止商家访问其他商家的奖品数据
 *
 * 所有端点都需要JWT认证（使用authenticateMerchant中间件）
 */
export class MerchantPrizeController {
  /**
   * 获取当前商家的所有奖品
   *
   * GET /api/merchant/prizes
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 自动从JWT中提取merchant_id
   */
  static async getPrizes(req: AuthRequest, res: Response): Promise<void> {
    try {
      // merchantId由injectMerchantId中间件自动注入
      const merchantId = (req as any).merchantId;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const prizes = await PrizeModel.findByMerchant(merchantId);

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
   * 获取当前商家的指定奖品
   *
   * GET /api/merchant/prizes/:id
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 路径参数：
   * - id: 奖品ID
   *
   * 自动验证奖品属于当前商家
   */
  static async getPrizeById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchantId = (req as any).merchantId;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const prizeId = parseInt(id);
      if (isNaN(prizeId)) {
        res.status(400).json({
          success: false,
          error: '奖品ID无效',
          code: 'INVALID_PRIZE_ID'
        });
        return;
      }

      // 使用多租户安全验证方法
      const prize = await PrizeModel.findByIdAndMerchant(prizeId, merchantId);

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

  /**
   * 创建新奖品
   *
   * POST /api/merchant/prizes
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 请求体：
   * {
   *   "name": "满100减20券",
   *   "description": "全场通用",
   *   "probability": 0.1,
   *   "stock": 50,
   *   "image_url": "https://oss.example.com/prize1.png"
   * }
   *
   * merchant_id自动从JWT注入，无需在请求体中传递
   */
  static async createPrize(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchantId;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const { name, description, probability, stock, image_url } = req.body;

      // 验证必填字段
      if (!name || probability === undefined || stock === undefined) {
        res.status(400).json({
          success: false,
          error: '缺少必填字段：name, probability, stock',
          code: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // 验证probability范围（0-1）
      if (probability < 0 || probability > 1) {
        res.status(400).json({
          success: false,
          error: 'probability必须在0到1之间',
          code: 'INVALID_PROBABILITY'
        });
        return;
      }

      // 验证stock为非负整数
      if (stock < 0 || !Number.isInteger(stock)) {
        res.status(400).json({
          success: false,
          error: 'stock必须是非负整数',
          code: 'INVALID_STOCK'
        });
        return;
      }

      // 创建奖品，自动注入merchant_id
      const prize = await PrizeModel.create({
        merchant_id: merchantId,  // 自动注入，不能被覆盖 ✅
        name,
        description,
        probability,
        stock,
        image_url
      });

      res.status(201).json({
        success: true,
        data: prize,
        message: '奖品创建成功'
      });
    } catch (error) {
      console.error('创建奖品失败:', error);
      res.status(500).json({
        success: false,
        error: '创建奖品失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 更新奖品
   *
   * PATCH /api/merchant/prizes/:id
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 路径参数：
   * - id: 奖品ID
   *
   * 请求体：
   * {
   *   "name": "新名称",  // 可选
   *   "description": "新描述",  // 可选
   *   "probability": 0.2,  // 可选
   *   "stock": 100,  // 可选
   *   "image_url": "https://oss.example.com/new.png"  // 可选
   * }
   *
   * 只能更新属于当前商家的奖品
   */
  static async updatePrize(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchantId = (req as any).merchantId;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const prizeId = parseInt(id);
      if (isNaN(prizeId)) {
        res.status(400).json({
          success: false,
          error: '奖品ID无效',
          code: 'INVALID_PRIZE_ID'
        });
        return;
      }

      const { name, description, probability, stock, image_url } = req.body;

      // 验证probability（如果提供）
      if (probability !== undefined && (probability < 0 || probability > 1)) {
        res.status(400).json({
          success: false,
          error: 'probability必须在0到1之间',
          code: 'INVALID_PROBABILITY'
        });
        return;
      }

      // 验证stock（如果提供）
      if (stock !== undefined && (stock < 0 || !Number.isInteger(stock))) {
        res.status(400).json({
          success: false,
          error: 'stock必须是非负整数',
          code: 'INVALID_STOCK'
        });
        return;
      }

      // 构建更新对象（只包含提供的字段）
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (probability !== undefined) updates.probability = probability;
      if (stock !== undefined) updates.stock = stock;
      if (image_url !== undefined) updates.image_url = image_url;

      // 使用多租户安全更新方法
      const prize = await PrizeModel.updateByMerchant(prizeId, merchantId, updates);

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
        data: prize,
        message: '奖品更新成功'
      });
    } catch (error) {
      console.error('更新奖品失败:', error);
      res.status(500).json({
        success: false,
        error: '更新奖品失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 删除奖品
   *
   * DELETE /api/merchant/prizes/:id
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 路径参数：
   * - id: 奖品ID
   *
   * 只能删除属于当前商家的奖品
   */
  static async deletePrize(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchantId = (req as any).merchantId;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const prizeId = parseInt(id);
      if (isNaN(prizeId)) {
        res.status(400).json({
          success: false,
          error: '奖品ID无效',
          code: 'INVALID_PRIZE_ID'
        });
        return;
      }

      // 使用多租户安全删除方法
      const deleted = await PrizeModel.deleteByMerchant(prizeId, merchantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: '奖品不存在或无权访问',
          code: 'PRIZE_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        message: '奖品删除成功'
      });
    } catch (error) {
      console.error('删除奖品失败:', error);
      res.status(500).json({
        success: false,
        error: '删除奖品失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 增加奖品库存
   *
   * POST /api/merchant/prizes/:id/increment
   *
   * Headers:
   * - Authorization: Bearer {token}
   *
   * 路径参数：
   * - id: 奖品ID
   *
   * 请求体：
   * {
   *   "quantity": 10  // 可选，默认为1
   * }
   */
  static async incrementStock(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchantId = (req as any).merchantId;
      const { quantity = 1 } = req.body;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const prizeId = parseInt(id);
      if (isNaN(prizeId)) {
        res.status(400).json({
          success: false,
          error: '奖品ID无效',
          code: 'INVALID_PRIZE_ID'
        });
        return;
      }

      if (quantity < 1 || !Number.isInteger(quantity)) {
        res.status(400).json({
          success: false,
          error: 'quantity必须是正整数',
          code: 'INVALID_QUANTITY'
        });
        return;
      }

      // 验证奖品属于当前商家
      const prize = await PrizeModel.findByIdAndMerchant(prizeId, merchantId);
      if (!prize) {
        res.status(404).json({
          success: false,
          error: '奖品不存在或无权访问',
          code: 'PRIZE_NOT_FOUND'
        });
        return;
      }

      // 增加库存
      await PrizeModel.incrementStock(prizeId, quantity);

      // 获取更新后的奖品
      const updatedPrize = await PrizeModel.findByIdAndMerchant(prizeId, merchantId);

      res.json({
        success: true,
        data: updatedPrize,
        message: `库存已增加${quantity}`
      });
    } catch (error) {
      console.error('增加库存失败:', error);
      res.status(500).json({
        success: false,
        error: '增加库存失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 上传奖品图片
   *
   * POST /api/merchant/prizes/:id/image
   */
  static async uploadImage(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const merchantId = (req as any).merchantId;
      const prizeId = parseInt(id);

      // 验证奖品存在
      const prize = await PrizeModel.findByIdAndMerchant(prizeId, merchantId);
      if (!prize) {
        res.status(404).json({
          success: false,
          error: '奖品不存在',
          code: 'PRIZE_NOT_FOUND'
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '请选择要上传的图片',
          code: 'NO_FILE'
        });
        return;
      }

      // 上传到 OSS
      const fileExt = req.file.originalname.split('.').pop();
      const safeFileName = `${Date.now()}-${randomUUID()}.${fileExt}`;
      const fileName = `prizes/${merchantId}/${prizeId}/${safeFileName}`;
      const result = await ossClient.put(fileName, req.file.buffer);

      // 更新奖品的图片URL
      await PrizeModel.updateByMerchant(prizeId, merchantId, {
        image_url: result.url
      });

      res.json({
        success: true,
        data: {
          imageUrl: result.url
        },
        message: '图片上传成功'
      });
    } catch (error) {
      console.error('上传奖品图片失败:', error);
      res.status(500).json({
        success: false,
        error: '图片上传失败',
        code: 'UPLOAD_ERROR'
      });
    }
  }
}
