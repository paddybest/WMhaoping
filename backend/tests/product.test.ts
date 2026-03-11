import request from 'supertest';
import app from '../src/app';

describe('Product API', () => {
  let token: string;

  beforeEach(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/wechat-login')
      .send({ code: 'test123' });

    token = loginResponse.body.data.token;
  });

  describe('GET /api/products', () => {
    it('should get all products successfully', async () => {
      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeDefined();
    });

    it('should return empty array when no products exist', async () => {
      // 测试空数据情况
      jest.spyOn<any, any>(require('../src/database/models/Product').ProductModel, 'findAll')
        .mockResolvedValue([]);

      const response = await request(app)
        .get('/api/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get product by id successfully', async () => {
      // 先创建一个商品
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          tags: ['test', 'product']
        });

      const productId = createResponse.body.data.id;

      // 获取商品
      const response = await request(app)
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(productId);
      expect(response.body.data.name).toBe('Test Product');
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .get('/api/products/99999')
        .expect(404);

      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app)
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid product ID');
    });
  });

  describe('POST /api/products', () => {
    it('should create product successfully', async () => {
      const productData = {
        name: 'New Product',
        tags: ['new', 'product', 'test']
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send(productData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('New Product');
      expect(response.body.data.tags).toEqual(['new', 'product', 'test']);
    });

    it('should return 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          tags: ['test']
        })
        .expect(400);

      expect(response.body.error).toBe('Product name is required and must be a string');
    });

    it('should return 400 when tags are missing', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product'
        })
        .expect(400);

      expect(response.body.error).toBe('Product tags are required and must be an array');
    });

    it('should return 400 when tags are not array', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          tags: 'not-array'
        })
        .expect(400);

      expect(response.body.error).toBe('Product tags are required and must be an array');
    });

    it('should return 400 when tags contain non-string values', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Product',
          tags: ['valid', 123, 'also-valid']
        })
        .expect(400);

      expect(response.body.error).toBe('All tags must be strings');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .post('/api/products')
        .send({
          name: 'Test Product',
          tags: ['test']
        })
        .expect(401);
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: number;

    beforeEach(async () => {
      // 创建一个商品用于更新
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Original Product',
          tags: ['original', 'test']
        });

      productId = createResponse.body.data.id;
    });

    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Product',
        tags: ['updated', 'test', 'new']
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Updated Product');
      expect(response.body.data.tags).toEqual(['updated', 'test', 'new']);
    });

    it('should update partially successfully', async () => {
      const updateData = {
        name: 'Partial Update'
      };

      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Partial Update');
      expect(response.body.data.tags).toEqual(['original', 'test']);
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app)
        .put('/api/products/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(400);

      expect(response.body.error).toBe('Invalid product ID');
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .put('/api/products/99999')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.error).toBe('Product not found');
    });

    it('should return 400 when no fields to update', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('No fields to update');
    });

    it('should return 400 when name is not string', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 123 })
        .expect(400);

      expect(response.body.error).toBe('Product name must be a string');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .put(`/api/products/${productId}`)
        .send({ name: 'Test' })
        .expect(401);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: number;

    beforeEach(async () => {
      // 创建一个商品用于删除
      const createResponse = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Product to Delete',
          tags: ['delete', 'test']
        });

      productId = createResponse.body.data.id;
    });

    it('should delete product successfully', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Product deleted successfully');
    });

    it('should return 400 when id is invalid', async () => {
      const response = await request(app)
        .delete('/api/products/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid product ID');
    });

    it('should return 404 when product does not exist', async () => {
      const response = await request(app)
        .delete('/api/products/99999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      expect(response.body.error).toBe('Product not found');
    });

    it('should return 401 when token is missing', async () => {
      const response = await request(app)
        .delete(`/api/products/${productId}`)
        .expect(401);
    });
  });
});