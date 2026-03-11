import { jest } from '@jest/globals';

// Unmock the database connection and models for testing
jest.unmock('../../database/connection');
jest.unmock('../../database/models/ProductImage');
jest.unmock('../../database/models/ProductItem');
jest.unmock('../../database/models/ProductCategory');

import { ProductImageModel } from '../../database/models/ProductImage';
import { ProductItemModel } from '../../database/models/ProductItem';
import { ProductCategoryModel } from '../../database/models/ProductCategory';
import { pool } from '../../database/connection';

describe('ProductImageModel', () => {
  let merchantId: number;
  let productId: number;

  beforeAll(async () => {
    // 创建测试商家
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant_image', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;

    // 创建测试分类
    const category = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });

    // 创建测试产品
    const product = await ProductItemModel.create({
      merchantId,
      categoryId: category.id!,
      name: '连衣裙',
      tags: ['舒适', '透气'],
      isActive: true
    });
    productId = product.id!;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_images');
    await pool.execute('DELETE FROM product_items');
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
    await pool.end();
  });

  it('should create product image', async () => {
    const image = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image.jpg',
      orderIndex: 0
    });

    expect(image.id).toBeDefined();
    expect(image.imageUrl).toBe('https://example.com/image.jpg');
    expect(image.productId).toBe(productId);
    expect(image.orderIndex).toBe(0);
  });

  it('should create product image with OSS file ID', async () => {
    const image = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image2.jpg',
      ossFileId: 'oss-file-123',
      orderIndex: 1
    });

    expect(image.id).toBeDefined();
    expect(image.ossFileId).toBe('oss-file-123');
  });

  it('should get images by product ordered by order_index', async () => {
    // 创建多个图片
    await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image3.jpg',
      orderIndex: 2
    });
    await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/image4.jpg',
      orderIndex: 3
    });

    const images = await ProductImageModel.findByProduct(productId);

    expect(images.length).toBeGreaterThan(0);
    // 验证是否按 order_index 排序
    for (let i = 1; i < images.length; i++) {
      expect(images[i].orderIndex).toBeGreaterThanOrEqual(images[i - 1].orderIndex);
    }
  });

  it('should delete image', async () => {
    const image = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/to-delete.jpg',
      orderIndex: 10
    });

    const deleted = await ProductImageModel.delete(image.id!, productId);

    expect(deleted).toBe(true);

    // 验证已删除
    const images = await ProductImageModel.findByProduct(productId);
    const found = images.find(img => img.id === image.id);
    expect(found).toBeUndefined();
  });

  it('should return false when deleting non-existent image', async () => {
    const deleted = await ProductImageModel.delete(99999, productId);
    expect(deleted).toBe(false);
  });

  it('should count images by product', async () => {
    const count = await ProductImageModel.countByProduct(productId);
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThan(0);
  });

  it('should update image order', async () => {
    // 创建测试图片
    const img1 = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/order1.jpg',
      orderIndex: 20
    });
    const img2 = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/order2.jpg',
      orderIndex: 21
    });
    const img3 = await ProductImageModel.create({
      productId,
      imageUrl: 'https://example.com/order3.jpg',
      orderIndex: 22
    });

    // 更新顺序（反转）
    await ProductImageModel.updateOrder(productId, [img3.id!, img2.id!, img1.id!]);

    // 验证顺序已更新
    const images = await ProductImageModel.findByProduct(productId);
    const updatedImg3 = images.find(img => img.id === img3.id);
    const updatedImg2 = images.find(img => img.id === img2.id);
    const updatedImg1 = images.find(img => img.id === img1.id);

    expect(updatedImg3?.orderIndex).toBe(0);
    expect(updatedImg2?.orderIndex).toBe(1);
    expect(updatedImg1?.orderIndex).toBe(2);
  });
});
