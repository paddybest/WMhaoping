import { Response } from 'express';
import { MerchantModel } from '../database/models/Merchant';

export class MiniprogramCustomerServiceController {
  // 获取商家客服二维码
  static async getCustomerServiceQR(req: any, res: Response): Promise<void> {
    try {
      const { merchantId } = req.params;

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
        return;
      }

      const id = parseInt(merchantId);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid Merchant ID'
        });
        return;
      }

      const merchant = await MerchantModel.findById(id);

      if (!merchant) {
        res.status(404).json({
          success: false,
          error: 'Merchant not found'
        });
        return;
      }

      // 检查商家是否活跃
      if (merchant.is_active === false) {
        res.status(404).json({
          success: false,
          error: 'Merchant is not active'
        });
        return;
      }

      // 检查是否有客服二维码
      if (!merchant.customerServiceQrUrl) {
        res.status(404).json({
          success: false,
          error: 'Customer service QR code not available'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          merchantId: merchant.id,
          merchantName: merchant.name,
          shopName: merchant.shopName,
          qrCodeUrl: merchant.customerServiceQrUrl
        }
      });
    } catch (error) {
      console.error('Get customer service QR error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get customer service QR code'
      });
    }
  }
}
