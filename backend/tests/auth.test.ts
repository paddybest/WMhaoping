import request from 'supertest';
import app from '../src/app';

describe('Auth API', () => {
  describe('POST /api/auth/wechat-login', () => {
    it('should login with wechat code successfully', async () => {
      const response = await request(app)
        .post('/api/auth/wechat-login')
        .send({ code: 'test123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.openid).toBeDefined();
    });

    it('should return 400 when code is missing', async () => {
      const response = await request(app)
        .post('/api/auth/wechat-login')
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Wechat code is required');
    });

    it('should return 500 when login fails', async () => {
      // 测试错误情况
      jest.spyOn<any, any>(require('../src/services/auth').AuthService, 'loginWithWechat')
        .mockRejectedValue(new Error('Login failed'));

      const response = await request(app)
        .post('/api/auth/wechat-login')
        .send({ code: 'error123' })
        .expect(500);

      expect(response.body.error).toBe('Login failed');
    });
  });

  describe('GET /api/auth/me', () => {
    let token: string;

    beforeEach(async () => {
      // 先登录获取token
      const loginResponse = await request(app)
        .post('/api/auth/wechat-login')
        .send({ code: 'test123' });

      token = loginResponse.body.data.token;
    });

    it('should return current user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.openid).toBeDefined();
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Missing or invalid authorization header');
    });

    it('should return 401 when token is invalid', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should return 401 when token format is wrong', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body.error).toBe('Missing or invalid authorization header');
    });
  });
});