import request from 'supertest';
import app from '../src/app';

describe('Review API', () => {
  let token: string;

  beforeEach(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test123' });

    token = loginResponse.body.data.token;
  });

  describe('POST /api/reviews/generate', () => {
    it('should generate review successfully', async () => {
      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身'],
        rating: 5
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.review).toBeDefined();
      expect(response.body.data.content).toBeDefined();
      expect(response.body.data.imageUrl).toBeDefined();
      expect(response.body.data.review.rating).toBe(5);
      expect(response.body.data.review.tags).toEqual(['轻薄', '修身']);
    });

    it('should return 400 when productName is missing', async () => {
      const reviewData = {
        tags: ['轻薄', '修身'],
        rating: 5
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toBe('Product name, tags and rating are required');
    });

    it('should return 400 when tags are missing', async () => {
      const reviewData = {
        productName: '女装',
        rating: 5
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toBe('Product name, tags and rating are required');
    });

    it('should return 400 when rating is missing', async () => {
      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身']
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toBe('Product name, tags and rating are required');
    });

    it('should return 400 when rating is less than 1', async () => {
      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身'],
        rating: 0
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 400 when rating is greater than 5', async () => {
      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身'],
        rating: 6
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toBe('Rating must be between 1 and 5');
    });

    it('should return 500 when AI service fails', async () => {
      // Mock AIService to throw error
      jest.spyOn<any, any>(require('../src/services/ai').AIService, 'generateReview')
        .mockRejectedValue(new Error('AI service error'));

      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身'],
        rating: 5
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(500);
    });

    it('should return 401 when token is missing', async () => {
      const reviewData = {
        productName: '女装',
        tags: ['轻薄', '修身'],
        rating: 5
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .send(reviewData)
        .expect(401);
    });

    it('should generate review with 1 star rating', async () => {
      const reviewData = {
        productName: '男装',
        tags: ['厚重', '不合身'],
        rating: 1
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review.rating).toBe(1);
    });

    it('should generate review with 3 star rating', async () => {
      const reviewData = {
        productName: '数码产品',
        tags: ['一般', '价格合理'],
        rating: 3
      };

      const response = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.review.rating).toBe(3);
    });
  });

  describe('GET /api/reviews/my-reviews', () => {
    it('should get user reviews successfully', async () => {
      const response = await request(app)
        .get('/api/reviews/my-reviews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return empty array when no reviews exist', async () => {
      // Mock empty reviews
      jest.spyOn<any, any>(require('../src/database/models/Review').ReviewModel, 'findByUserId')
        .mockResolvedValue([]);

      const response = await request(app)
        .get('/api/reviews/my-reviews')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });

    it('should return 500 when database error occurs', async () => {
      // Mock database error
      jest.spyOn<any, any>(require('../src/database/models/Review').ReviewModel, 'findByUserId')
        .mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/reviews/my-reviews')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .get('/api/reviews/my-reviews')
        .expect(401);
    });
  });

  describe('Integration with Product API', () => {
    it('should create review using existing product', async () => {
      // First create a product
      const productResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product for Review',
          tags: ['test', 'review']
        });

      expect(productResponse.body.success).toBe(true);
      const productId = productResponse.body.data.id;

      // Then generate review for that product
      const reviewData = {
        productName: 'Test Product for Review',
        tags: ['test', 'review'],
        rating: 4
      };

      const reviewResponse = await request(app)
        .post('/api/reviews/generate')
        .set('Authorization', `Bearer ${token}`)
        .send(reviewData)
        .expect(200);

      expect(reviewResponse.body.success).toBe(true);
      expect(reviewResponse.body.data.review.product_id).toBe(productId);
    });
  });
});