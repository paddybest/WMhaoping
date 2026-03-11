import { Response } from 'express';
import { MerchantModel } from '../database/models/Merchant';
import { AuthService } from '../services/auth';
import { AuthRequest } from '../middleware/auth';
import { autoGenerateQRCodeOnRegistration } from '../services/qrcode';

export class MerchantAuthController {
  // 商家登录
  static async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;

      // 验证输入
      if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
      }

      // 查找商家
      const merchant = await MerchantModel.findByUsername(username);
      if (!merchant) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      // 验证密码
      const isValid = await MerchantModel.verifyPassword(password, merchant.password);
      if (!isValid) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }

      // 生成 token
      const token = AuthService.generateMerchantToken({
        id: merchant.id!,
        username: merchant.username
      });

      res.json({
        success: true,
        data: {
          token,
          merchant: {
            id: merchant.id,
            username: merchant.username,
            shopName: merchant.shopName
          }
        }
      });
    } catch (error) {
      console.error('Merchant login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }

  // 商家注册
  static async register(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, password, shopName } = req.body;

      // 验证输入
      if (!username || !password || !shopName) {
        res.status(400).json({ error: 'Username, password and shop name are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      // 检查用户名是否已存在
      const existingMerchant = await MerchantModel.findByUsername(username);
      if (existingMerchant) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }

      // 创建商家
      const merchant = await MerchantModel.create({
        username,
        password,
        shopName,
        name: shopName,
        description: '',
        is_active: true
      });

      // 自动生成商家专属二维码（异步执行，不阻塞注册流程）
      autoGenerateQRCodeOnRegistration(merchant.id!).catch((error) => {
        console.error(`[注册] 商家${merchant.id}二维码自动生成失败:`, error);
      });

      // 生成 token
      const token = AuthService.generateMerchantToken({
        id: merchant.id!,
        username: merchant.username
      });

      res.status(201).json({
        success: true,
        data: {
          token,
          merchant: {
            id: merchant.id,
            username: merchant.username,
            shopName: merchant.shopName
          }
        }
      });
    } catch (error) {
      console.error('Merchant registration error:', error);
      res.status(500).json({ error: 'Failed to register' });
    }
  }

  // 获取当前商家信息
  static async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchant = req.merchant;
      if (!merchant) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: merchant.id,
          username: merchant.username,
          shopName: merchant.shopName
        }
      });
    } catch (error) {
      console.error('Get merchant info error:', error);
      res.status(500).json({ error: 'Failed to get merchant info' });
    }
  }

  // 获取商家完整资料（包含客服二维码等）
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant?.id;
      if (!merchantId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const merchant = await MerchantModel.findById(merchantId);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      // 不返回密码
      const { password, ...profile } = merchant as any;

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Get merchant profile error:', error);
      res.status(500).json({ error: 'Failed to get merchant profile' });
    }
  }

  // 更新商家资料
  static async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant?.id;
      if (!merchantId) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { name, description, contact_phone, address, customerServiceQrUrl } = req.body;

      // 验证输入
      if (name && name.length > 100) {
        res.status(400).json({ error: 'Name is too long (max 100 characters)' });
        return;
      }
      if (description && description.length > 500) {
        res.status(400).json({ error: 'Description is too long (max 500 characters)' });
        return;
      }
      if (contact_phone && contact_phone.length > 20) {
        res.status(400).json({ error: 'Contact phone is too long (max 20 characters)' });
        return;
      }
      if (address && address.length > 255) {
        res.status(400).json({ error: 'Address is too long (max 255 characters)' });
        return;
      }
      if (customerServiceQrUrl && customerServiceQrUrl.length > 500) {
        res.status(400).json({ error: 'QR code URL is too long (max 500 characters)' });
        return;
      }

      // 更新商家信息
      const updatedMerchant = await MerchantModel.update(merchantId, {
        name,
        description,
        contact_phone,
        address,
        customerServiceQrUrl
      });

      if (!updatedMerchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }

      // 不返回密码
      const { password, ...profile } = updatedMerchant as any;

      res.json({
        success: true,
        data: profile,
        message: '商家信息更新成功'
      });
    } catch (error) {
      console.error('Update merchant profile error:', error);
      res.status(500).json({ error: 'Failed to update merchant profile' });
    }
  }
}
