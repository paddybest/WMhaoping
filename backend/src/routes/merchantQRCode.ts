import { Router, Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import {
  regenerateMerchantQRCode,
  autoGenerateQRCodeOnRegistration,
  generateAndUploadProductQRCode,
  batchGenerateProductQRCodes
} from '../services/qrcode';
import { MerchantModel } from '../database/models/Merchant';
import { pool } from '../database/connection';

const router = Router();

// 所有二维码路由都需要商家认证
router.use(authenticateMerchant);
router.use(injectMerchantId);

/**
 * POST /api/merchant/qrcode/generate
 * 生成商家专属二维码
 * 需要认证
 */
router.post('/generate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;

    console.log(`[API] 生成商家二维码请求，merchantId: ${merchantId}`);

    // 重新生成二维码（删除旧的，生成新的）
    const qrCodeUrl = await regenerateMerchantQRCode(merchantId);

    // 获取更新后的商家信息
    const merchant = await MerchantModel.findById(merchantId);

    res.json({
      success: true,
      data: {
        merchantId,
        qrCodeUrl,
        name: merchant?.name,
        shopName: merchant?.shopName,
        message: 'QR code regenerated successfully'
      }
    });
  } catch (error) {
    console.error('[API] 生成商家二维码失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
});

/**
 * GET /api/merchant/qrcode
 * 获取当前商家的二维码信息
 * 需要认证
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;

    // 获取商家信息
    const merchant = await MerchantModel.findById(merchantId);

    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
      return;
    }

    if (!merchant.qrCodeUrl) {
      // 没有二维码时返回空数据，而不是404错误
      res.json({
        success: true,
        data: null,
        message: 'No QR code yet. Please generate one.'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        merchantId: merchant.id,
        qrCodeUrl: merchant.qrCodeUrl,
        name: merchant.name,
        shopName: merchant.shopName,
        generatedAt: merchant.updatedAt
      }
    });
  } catch (error) {
    console.error('[API] 获取商家二维码信息失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get QR code information'
    });
  }
});

/**
 * POST /api/merchant/qrcode/upload
 * 上传自定义商家二维码（可选功能）
 * 需要认证
 */
router.post('/upload', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;
    const { qrCodeUrl } = req.body;

    if (!qrCodeUrl) {
      res.status(400).json({
        success: false,
        error: 'qrCodeUrl is required'
      });
      return;
    }

    // 简单验证URL格式
    try {
      const url = new URL(qrCodeUrl);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw new Error('Invalid URL protocol');
      }
    } catch {
      res.status(400).json({
        success: false,
        error: 'Invalid qrCodeUrl format'
      });
      return;
    }

    // 更新数据库
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      res.status(404).json({
        success: false,
        error: 'Merchant not found'
      });
      return;
    }

    // 更新二维码URL
    merchant.qrCodeUrl = qrCodeUrl;
    await MerchantModel.update(merchantId, merchant);

    res.json({
      success: true,
      data: {
        merchantId,
        qrCodeUrl,
        message: 'QR code URL updated successfully'
      }
    });
  } catch (error) {
    console.error('[API] 上传自定义二维码失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload custom QR code'
    });
  }
});

/**
 * POST /api/merchant/qrcode/product
 * 生成商品专属二维码（绑定商家+商品）
 * 需要认证
 */
router.post('/product', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;
    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({
        success: false,
        error: 'productId is required'
      });
      return;
    }

    const productResult = await pool.query(
      'SELECT id, name FROM product_items WHERE id = $1 AND merchant_id = $2',
      [productId, merchantId]
    );
    const productRows = productResult.rows;

    if (productRows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found or does not belong to this merchant'
      });
      return;
    }

    console.log(`[API] 生成商品二维码，merchantId: ${merchantId}, productId: ${productId}`);

    const qrCodeUrl = await generateAndUploadProductQRCode(merchantId, productId);

    await pool.query(
      'UPDATE product_items SET qr_code_url = $1 WHERE id = $2',
      [qrCodeUrl, productId]
    );

    res.json({
      success: true,
      data: {
        merchantId,
        productId,
        qrCodeUrl,
        message: 'Product QR code generated successfully'
      }
    });
  } catch (error) {
    console.error('[API] 生成商品二维码失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate product QR code'
    });
  }
});

/**
 * POST /api/merchant/qrcode/product/batch
 * 批量生成商品二维码
 * 需要认证
 */
router.post('/product/batch', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'productIds array is required'
      });
      return;
    }

    console.log(`[API] 批量生成商品二维码，merchantId: ${merchantId}, count: ${productIds.length}`);

    const results = await batchGenerateProductQRCodes(merchantId, productIds);

    for (const result of results) {
      if (result.success) {
        await pool.query(
          'UPDATE product_items SET qr_code_url = $1 WHERE id = $2',
          [result.url, result.productId]
        );
      }
    }

    res.json({
      success: true,
      data: {
        merchantId,
        total: productIds.length,
        results
      }
    });
  } catch (error) {
    console.error('[API] 批量生成商品二维码失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to batch generate product QR codes'
    });
  }
});

/**
 * GET /api/merchant/qrcode/product/:productId
 * 获取商品二维码信息
 * 需要认证
 */
router.get('/product/:productId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const merchantId = req.merchant!.id;
    const productId = parseInt(req.params.productId);

    if (isNaN(productId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid productId'
      });
      return;
    }

    const rowsResult = await pool.query(
      'SELECT id, name, qr_code_url FROM product_items WHERE id = $1 AND merchant_id = $2',
      [productId, merchantId]
    );
    const rows = rowsResult.rows;

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Product not found'
      });
      return;
    }

    const product = rows[0];

    res.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        qrCodeUrl: product.qr_code_url
      }
    });
  } catch (error) {
    console.error('[API] 获取商品二维码失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product QR code'
    });
  }
});

export default router;
