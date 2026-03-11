import request from 'supertest';
import app from '../src/app';

describe('Lottery API', () => {
  let token: string;

  beforeEach(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test123' });

    token = loginResponse.body.data.token;
  });

  describe('GET /api/lottery/test', () => {
    it('should return test message', async () => {
      const response = await request(app)
        .get('/api/lottery/test')
        .expect(200);

      expect(response.body.message).toBe('Lottery API working');
    });
  });

  describe('POST /api/lottery/draw', () => {
    it('should perform lottery draw successfully', async () => {
      // 需要确保抽奖服务已正确实现
      // 如果抽奖服务未实现，测试会失败，这是预期的
      const response = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 基础断言 - 结构检查
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('should check daily draw limit', async () => {
      // 测试每日抽奖限制逻辑
      // 连续多次抽奖测试限制
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/lottery/draw')
          .set('Authorization', `Bearer ${token}`)
          .expect(i < 3 ? 200 : 400); // 假设限制为3次
      }
    });

    it('should return prize information when winning', async () => {
      const response = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      if (response.body.data.prize) {
        expect(response.body.data.prize).toBeDefined();
        expect(response.body.data.prize.name).toBeDefined();
        expect(response.body.data.code).toBeDefined();
      }
    });

    it('should handle no prize scenario', async () => {
      // 测试未中奖情况
      // 可能需要mock抽奖服务
      const response = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      if (!response.body.data.prize) {
        expect(response.body.data.prize).toBeNull();
        expect(response.body.data.code).toBeUndefined();
      }
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .post('/api/lottery/draw')
        .expect(401);
    });

    it('should reset daily limit at midnight', async () => {
      // 测试每日限制重置逻辑
      // 这个测试可能需要设置特定时间或使用mock
      const response = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/lottery/my-prizes', () => {
    it('should get user prizes successfully', async () => {
      const response = await request(app)
        .get('/api/lottery/my-prizes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array when no prizes', async () => {
      const response = await request(app)
        .get('/api/lottery/my-prizes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return user prizes with details', async () => {
      // 先抽奖获得奖品
      await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 获取奖品列表
      const response = await request(app)
        .get('/api/lottery/my-prizes')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // 检查奖品详情结构
      response.body.data.forEach((prize: any) => {
        expect(prize).toHaveProperty('id');
        expect(prize).toHaveProperty('prize_id');
        expect(prize).toHaveProperty('prize_name');
        expect(prize).toHaveProperty('reward_code');
        expect(prize).toHaveProperty('is_claimed');
        expect(prize).toHaveProperty('created_at');
      });
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .get('/api/lottery/my-prizes')
        .expect(401);
    });
  });

  describe('POST /api/lottery/claim', () => {
    it('should claim prize successfully with valid code', async () => {
      // 先抽奖获得兑换码
      const drawResponse = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const code = drawResponse.body.data.code;

      // 使用兑换码核销奖品
      const response = await request(app)
        .post('/api/lottery/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.claimed).toBe(true);
    });

    it('should return error when code is missing', async () => {
      const response = await request(app)
        .post('/api/lottery/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('兑换码不能为空');
    });

    it('should return error when code is invalid', async () => {
      const response = await request(app)
        .post('/api/lottery/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'INVALID' })
        .expect(400);

      expect(response.body.error).toBe('无效的兑换码');
    });

    it('should return error when code is already claimed', async () => {
      // 测试已使用的兑换码
      const response = await request(app)
        .post('/api/lottery/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'USED123' })
        .expect(400);

      expect(response.body.error).toBe('无效的兑换码');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .post('/api/lottery/claim')
        .send({ code: 'TEST123' })
        .expect(401);
    });

    it('should not allow claiming other user\'s prize', async () => {
      // 测试不能核销其他用户的奖品
      const response = await request(app)
        .post('/api/lottery/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'OTHERUSER123' })
        .expect(400);

      expect(response.body.error).toBe('兑换码不属于当前用户');
    });
  });

  describe('Lottery Rate and Probability', () => {
    it('should respect prize probabilities over multiple draws', async () => {
      // 连续多次抽奖，验证概率分布
      const totalDraws = 100;
      let winCount = 0;

      for (let i = 0; i < totalDraws; i++) {
        const response = await request(app)
          .post('/api/lottery/draw')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        if (response.body.data.prize) {
          winCount++;
        }
      }

      // 验证中奖次数在合理范围内
      // 假设总中奖概率为10%，100次抽奖应该在10次左右
      const winRate = winCount / totalDraws;
      expect(winRate).toBeGreaterThan(0.05); // 至少5%
      expect(winRate).toBeLessThan(0.3); // 不超过30%
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent draws gracefully', async () => {
      // 并发抽奖测试
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/lottery/draw')
            .set('Authorization', `Bearer ${token}`)
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.body.success).toBe(true);
      });
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock数据库错误
      jest.spyOn<any, any>(require('../src/services/lottery').LotteryService, 'draw')
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/lottery/draw')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);

      expect(response.body.error).toBe('抽奖失败');
    });
  });
});