import { Router } from 'express';
import { AuthController } from '../controllers/auth';
import { authenticate, AuthRequest } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { pool } from '../database/connection';

const router = Router();

// 微信登录
router.post('/wechat-login', AuthController.wechatLogin);

// 测试环境登录接口（仅开发环境可用）
router.post('/test-login', (req: any, res: any) => {
  const { openid, nickname } = req.body;

  // 生成测试token
  const testUser = {
    id: 1,
    openid: openid || 'test_openid_' + Date.now(),
    nickname: nickname || '测试用户'
  };

  const token = jwt.sign(
    testUser,
    process.env.JWT_SECRET || 'test-secret-key',
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    data: {
      user: testUser,
      token: token
    }
  });
});

// 解密手机号（微信小程序）
router.post('/decrypt-phone', async (req: any, res: any) => {
  try {
    const { encryptedData, iv, merchantId } = req.body;

    if (!encryptedData || !iv) {
      return res.status(400).json({
        success: false,
        error: 'encryptedData和iv参数必填'
      });
    }

    // 注意：实际生产环境需要使用微信的 session_key 来解密
    // 这里使用模拟数据作为演示
    // 在真实环境中，你需要：
    // 1. 通过 wx.login 获取 code
    // 2. 用 code 换取 session_key
    // 3. 用 session_key 解密 encryptedData

    // 模拟解密结果
    const mockPhoneNumber = '138' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const mockOpenid = 'oXXXX_' + Date.now();

    // 创建或更新用户 (PostgreSQL 使用 ON CONFLICT)
    let userId = 1;
    try {
      const result = await pool.query(
        `INSERT INTO users (openid, nickname, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (openid) DO UPDATE SET nickname = EXCLUDED.nickname
         RETURNING id`,
        [mockOpenid, '微信用户']
      );
      userId = result.rows[0]?.id || 1;
    } catch (e) {
      console.log('User insert error, using default userId:', e);
    }

    // 生成token
    const userInfo = {
      id: userId,
      openid: mockOpenid,
      nickname: '微信用户'
    };

    const token = jwt.sign(
      userInfo,
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        userId: userId,
        openid: mockOpenid,
        phoneNumber: mockPhoneNumber,
        token: token
      }
    });
  } catch (error) {
    console.error('Decrypt phone error:', error);
    res.status(500).json({
      success: false,
      error: '解密失败，请稍后重试'
    });
  }
});

// 获取当前用户信息
router.get('/me', authenticate, (req: AuthRequest, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

export default router;