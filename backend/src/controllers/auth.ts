import { AuthService } from '../services/auth';
import { Request, Response } from 'express';

export class AuthController {
  static async wechatLogin(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        res.status(400).json({ error: 'Wechat code is required' });
        return;
      }

      const result = await AuthService.loginWithWechat(code);

      res.json({
        success: true,
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      console.error('Wechat login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
}