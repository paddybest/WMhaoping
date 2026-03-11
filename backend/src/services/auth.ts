import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../database/models/User';
import { redisClient } from '../database/connection';

export interface JWTPayload {
  id: number;
  openid: string;
}

export interface MerchantJWTPayload {
  id: number;
  username: string;
}

export class AuthService {
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return secret;
  }

  static generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d'
    });
  }

  static verifyToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static async loginWithWechat(code: string) {
    // 这里需要调用微信API获取openid
    // 模拟实现，实际需要调用微信API
    const openid = `mock_openid_${code}`;

    let user = await UserModel.findByOpenid(openid);
    if (!user) {
      user = await UserModel.create({ openid });
    }

    const token = this.generateToken({
      id: user.id!,
      openid: user.openid
    });

    return { user, token };
  }

  static generateMerchantToken(payload: MerchantJWTPayload): string {
    return jwt.sign(payload, this.getJwtSecret(), {
      expiresIn: (process.env.JWT_EXPIRES_IN as any) || '7d'
    });
  }

  static verifyMerchantToken(token: string): MerchantJWTPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as MerchantJWTPayload;
    } catch (error) {
      return null;
    }
  }
}