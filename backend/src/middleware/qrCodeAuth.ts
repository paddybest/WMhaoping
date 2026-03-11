import { Request, Response, NextFunction } from 'express';
import { verifyQRCodeSignature } from '../services/qrcode';

/**
 * Extended Request interface with QR code verification
 */
export interface QRCodeRequest extends Request {
  verifiedMerchantId?: number;
}

/**
 * Validate QR code signature middleware
 * 验证二维码签名中间件
 *
 * @param req - Request object
 * @param res - Response object
 * @param next - NextFunction
 */
export function validateQRCodeSignature(
  req: QRCodeRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // 从查询参数中获取merchant_id和sig
    const merchantId = parseInt(req.query.merchant_id as string);
    const signature = req.query.sig as string;

    // 验证参数是否存在
    if (!merchantId || isNaN(merchantId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid or missing merchant_id'
      });
      return;
    }

    if (!signature) {
      res.status(400).json({
        success: false,
        error: 'Missing signature (sig) parameter'
      });
      return;
    }

    // 验证签名
    if (!verifyQRCodeSignature(merchantId, signature)) {
      console.warn(`[QRCodeAuth] 无效的二维码签名，merchantId: ${merchantId}, signature: ${signature}`);
      res.status(403).json({
        success: false,
        error: 'Invalid QR code signature. The QR code may be tampered with.'
      });
      return;
    }

    // 签名验证通过，将验证后的merchant_id附加到request对象
    req.verifiedMerchantId = merchantId;

    next();
  } catch (error) {
    console.error('[QRCodeAuth] 签名验证失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate QR code signature'
    });
  }
}

/**
 * Optional QR code signature validation middleware
 * 可选的二维码签名验证中间件（如果签名存在则验证，否则放行）
 *
 * 用于向后兼容：如果QR code没有签名，仍然允许访问
 * 支持商家二维码和商品二维码两种模式
 *
 * @param req - Request object
 * @param res - Response object
 * @param next - NextFunction
 */
export function optionalValidateQRCodeSignature(
  req: QRCodeRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const merchantId = req.query.merchant_id as string || req.query.merchantId as string;
    const productId = req.query.product_id as string || req.query.productId as string;
    const signature = req.query.sig as string;

    if (!merchantId) {
      next();
      return;
    }

    if (merchantId && !signature) {
      console.warn(`[QRCodeAuth] QR code without signature detected (backward compatibility), merchantId: ${merchantId}`);
      next();
      return;
    }

    const parsedMerchantId = parseInt(merchantId);
    const parsedProductId = productId ? parseInt(productId) : undefined;
    
    if (!isNaN(parsedMerchantId) && signature) {
      if (!verifyQRCodeSignature(parsedMerchantId, signature, parsedProductId)) {
        console.warn(`[QRCodeAuth] 无效的二维码签名，merchantId: ${parsedMerchantId}, productId: ${parsedProductId}, signature: ${signature}`);
        res.status(403).json({
          success: false,
          error: 'Invalid QR code signature'
        });
        return;
      }

      req.verifiedMerchantId = parsedMerchantId;
    }

    next();
  } catch (error) {
    console.error('[QRCodeAuth] 可选签名验证失败:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate QR code signature'
    });
  }
}
