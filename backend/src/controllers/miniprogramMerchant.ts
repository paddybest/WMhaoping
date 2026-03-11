import { Response } from 'express';
import { MerchantModel } from '../database/models/Merchant';
import { QRCodeRequest } from '../middleware/qrCodeAuth';

export class MiniprogramMerchantController {
  // 验证二维码签名
  static async validateQRCode(req: QRCodeRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.verifiedMerchantId;

      if (!merchantId) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID verification failed'
        });
        return;
      }

      // 验证商家是否存在且活跃
      const merchant = await MerchantModel.findById(merchantId);

      if (!merchant) {
        res.status(404).json({
          success: false,
          error: 'Merchant not found'
        });
        return;
      }

      if (merchant.is_active === false) {
        res.status(404).json({
          success: false,
          error: 'Merchant is not active'
        });
        return;
      }

      // 签名验证通过，返回商家信息
      res.json({
        success: true,
        data: {
          merchantId: merchant.id,
          name: merchant.name,
          description: merchant.description,
          shopName: merchant.shopName,
          isValid: true
        }
      });
    } catch (error) {
      console.error('Validate QR code error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate QR code'
      });
    }
  }

  // 获取活跃商家列表
  static async getActiveMerchants(req: any, res: Response): Promise<void> {
    try {
      // 只返回活跃的商家
      const merchants = await MerchantModel.getActiveMerchants();

      res.json({
        success: true,
        data: merchants.map(merchant => ({
          id: merchant.id,
          name: merchant.name,
          description: merchant.description,
          isActive: merchant.is_active,
          customerServiceQrUrl: merchant.customerServiceQrUrl,
          qrCodeUrl: merchant.qrCodeUrl,
          createdAt: merchant.createdAt
        }))
      });
    } catch (error) {
      console.error('Get active merchants error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get merchants'
      });
    }
  }

  // 获取商家详情（根据ID）
  static async getMerchantById(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          error: 'Merchant ID is required'
        });
        return;
      }

      const merchantId = parseInt(id);
      if (isNaN(merchantId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid Merchant ID'
        });
        return;
      }

      const merchant = await MerchantModel.findById(merchantId);

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

      // 返回商家信息（不包含密码）
      res.json({
        success: true,
        data: {
          id: merchant.id,
          name: merchant.name,
          description: merchant.description,
          shopName: merchant.shopName,
          isActive: merchant.is_active,
          customerServiceQrUrl: merchant.customerServiceQrUrl,
          qrCodeUrl: merchant.qrCodeUrl,
          createdAt: merchant.createdAt,
          updatedAt: merchant.updatedAt
        }
      });
    } catch (error) {
      console.error('Get merchant by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get merchant'
      });
    }
  }

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
