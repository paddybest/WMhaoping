import request from 'supertest';
import app from '../src/app';

describe('返现功能 API', () => {
  let merchantToken: string;
  let userToken: string;

  beforeEach(async () => {
    // 商家登录
    const merchantLoginRes = await request(app)
      .post('/api/auth/merchant/login')
      .send({ username: 'test_merchant', password: 'password123' });
    merchantToken = merchantLoginRes.body.data?.token || 'mock_merchant_token';

    // 用户登录
    const userLoginRes = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test_code_123' });
    userToken = userLoginRes.body.data?.token || 'mock_user_token';
  });

  describe('商家余额管理', () => {
    describe('GET /api/redemption/merchant/balance', () => {
      it('商家可以查询自己的余额', async () => {
        const response = await request(app)
          .get('/api/redemption/merchant/balance?merchantId=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data).toHaveProperty('balance');
        expect(response.body.data).toHaveProperty('total_recharged');
        expect(response.body.data).toHaveProperty('total_redeemed');
      });

      it('不传 merchantId 应返回错误', async () => {
        const response = await request(app)
          .get('/api/redemption/merchant/balance')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('merchantId');
      });
    });

    describe('POST /api/redemption/merchant/recharge', () => {
      it('商家可以充值余额', async () => {
        const response = await request(app)
          .post('/api/redemption/merchant/recharge')
          .send({ merchantId: 1, amount: 100 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('balance');
      });

      it('充值金额必须为正数', async () => {
        const response = await request(app)
          .post('/api/redemption/merchant/recharge')
          .send({ merchantId: 1, amount: -50 })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('不传金额应返回错误', async () => {
        const response = await request(app)
          .post('/api/redemption/merchant/recharge')
          .send({ merchantId: 1 })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('返现记录管理', () => {
    describe('POST /api/redemption/create', () => {
      it('可以创建返现记录', async () => {
        const response = await request(app)
          .post('/api/redemption/create')
          .send({
            merchantId: 1,
            userId: 1,
            prizeId: 2,
            rewardCode: 'ABC123',
            cashAmount: 5.00
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data.status).toBe('pending');
      });

      it('缺少必填字段应返回错误', async () => {
        const response = await request(app)
          .post('/api/redemption/create')
          .send({ merchantId: 1 })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('Missing');
      });
    });

    describe('GET /api/redemption/my', () => {
      it('用户可以查看自己的返现记录', async () => {
        const response = await request(app)
          .get('/api/redemption/my?userId=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('不传 userId 应返回错误', async () => {
        const response = await request(app)
          .get('/api/redemption/my')
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });

    describe('GET /api/redemption/by-code/:code', () => {
      it('查询不存在的兑换码应返回404', async () => {
        const response = await request(app)
          .get('/api/redemption/by-code/NONEXIST')
          .expect(404);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('商家审核返现', () => {
    describe('GET /api/redemption/merchant/list', () => {
      it('商家可以查看返现记录列表', async () => {
        const response = await request(app)
          .get('/api/redemption/merchant/list?merchantId=1')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('可以按状态筛选', async () => {
        const response = await request(app)
          .get('/api/redemption/merchant/list?merchantId=1&status=pending')
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/redemption/merchant/verify', () => {
      it('需要必填参数', async () => {
        const response = await request(app)
          .post('/api/redemption/merchant/verify')
          .send({})
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain('required');
      });
    });
  });
});
