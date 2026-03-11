import { AuthService } from '../services/auth';
import { MerchantModel } from '../database/models/Merchant';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    openid: string;
  };
  merchant?: {
    id: number;
    username: string;
    shopName: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = payload;
  next();
};

export const authenticateMerchant = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = AuthService.verifyMerchantToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // 获取商家信息
  const merchant = await MerchantModel.findById(payload.id);
  if (!merchant) {
    res.status(401).json({ error: 'Merchant not found' });
    return;
  }

  req.merchant = {
    id: merchant.id!,
    username: merchant.username,
    shopName: merchant.shopName
  };

  next();
};