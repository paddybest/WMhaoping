import { jest } from '@jest/globals';

// Unmock the database connection and models for testing
jest.unmock('../../database/connection');
jest.unmock('../../database/models/ProductItem');
jest.unmock('../../database/models/ProductCategory');

import { ProductItemModel } from '../../database/models/ProductItem';
import { ProductCategoryModel } from '../../database/models/ProductCategory';
import { pool } from '../../database/connection';

describe('ProductItemModel', () => {
  let merchantId: number;
  let leafCategoryId: number;
  let parentCategoryId: number;

  beforeAll(async () => {
    // 创建测试商家
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant_product', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;

    // 创建一个叶子节点分类
    const leafCategory = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });
    leafCategoryId = leafCategory.id!;

    // 创建一个父分类（非叶子节点）
    const parentCategory = await ProductCategoryModel.create({
      merchantId,
      name: '电子产品',
      parentId: null,
      orderIndex: 1
    });
    parentCategoryId = parentCategory.id!;

    // 为父分类创建子分类，使其成为非叶子节点
    await ProductCategoryModel.create({
      merchantId,
      name: '手机',
      parentId: parentCategoryId,
      orderIndex: 0
    });
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_items');
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
    await pool.end();
  });

  it('should create a product item in leaf category', async () => {
    const product = await ProductItemModel.create({
      merchantId,
      categoryId: leafCategoryId,
      name: '连衣裙',
      tags: ['舒适', '透气', '时尚'],
      isActive: true
    });

    expect(product.id).toBeDefined();
    expect(product.name).toBe('连衣裙');
    expect(product.tags).toEqual(['舒适', '透气', '时尚']);
    expect(product.isActive).toBe(true);
  });

  it('should prevent creating product in non-leaf category', async () => {
    await expect(ProductItemModel.create({
      merchantId,
      categoryId: parentCategoryId,
      name: '测试产品',
      tags: [],
      isActive: true
    })).rejects.toThrow('Category must be a leaf node');
  });

  it('should find product by category', async () => {
    // 创建另一个产品
    await ProductItemModel.create({
      merchantId,
      categoryId: leafCategoryId,
      name: 'T恤',
      tags: ['休闲'],
      isActive: true
    });

    const products = await ProductItemModel.findByCategory(leafCategoryId, merchantId);

    expect(products.length).toBeGreaterThan(0);
    expect(products[0].categoryId).toBe(leafCategoryId);
  });

  it('should find product by id', async () => {
    const created = await ProductItemModel.create({
      merchantId,
      categoryId: leafCategoryId,
      name: '牛仔裤',
      tags: ['耐磨'],
      isActive: true
    });

    const found = await ProductItemModel.findById(created.id!);

    expect(found).not.toBeNull();
    expect(found?.name).toBe('牛仔裤');
    expect(found?.tags).toEqual(['耐磨']);
  });

  it('should update product', async () => {
    const created = await ProductItemModel.create({
      merchantId,
      categoryId: leafCategoryId,
      name: '夹克',
      tags: ['保暖'],
      isActive: true
    });

    const updated = await ProductItemModel.update(created.id!, {
      name: '羽绒服',
      tags: ['保暖', '轻薄'],
      isActive: false
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('羽绒服');
    expect(updated?.tags).toEqual(['保暖', '轻薄']);
    expect(updated?.isActive).toBe(false);
  });

  it('should delete product', async () => {
    const created = await ProductItemModel.create({
      merchantId,
      categoryId: leafCategoryId,
      name: '衬衫',
      tags: [],
      isActive: true
    });

    const deleted = await ProductItemModel.delete(created.id!, merchantId);

    expect(deleted).toBe(true);

    // 验证已删除
    const found = await ProductItemModel.findById(created.id!);
    expect(found).toBeNull();
  });
});
