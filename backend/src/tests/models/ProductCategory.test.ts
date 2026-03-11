import { jest } from '@jest/globals';

// Unmock the database connection for model tests
jest.unmock('../../database/connection');
jest.unmock('../../database/models/ProductCategory');

import { ProductCategoryModel } from '../../database/models/ProductCategory';
import { pool } from '../../database/connection';

describe('ProductCategoryModel', () => {
  let merchantId: number;

  beforeAll(async () => {
    // 创建测试商家
    const [merchantResult] = await pool.execute(
      'INSERT INTO merchants (username, password) VALUES (?, ?)',
      ['test_merchant', 'hashed_password']
    );
    merchantId = (merchantResult as any).insertId;
  });

  afterAll(async () => {
    await pool.execute('DELETE FROM product_categories');
    await pool.execute('DELETE FROM merchants WHERE id = ?', [merchantId]);
    await pool.end();
  });

  it('should create a root category', async () => {
    const category = await ProductCategoryModel.create({
      merchantId,
      name: '服装',
      parentId: null,
      orderIndex: 0
    });

    expect(category.id).toBeDefined();
    expect(category.name).toBe('服装');
    expect(category.level).toBe(0);
    expect(category.path).toMatch(/^\/\d+\/$/);
  });

  it('should create a child category', async () => {
    // First create a parent
    const parent = await ProductCategoryModel.create({
      merchantId,
      name: '电子产品',
      parentId: null,
      orderIndex: 0
    });

    // Then create a child
    const childCategory = await ProductCategoryModel.create({
      merchantId,
      name: '手机',
      parentId: parent.id,
      orderIndex: 0
    });

    expect(childCategory.level).toBe(1);
    expect(childCategory.path).toContain(`/${parent.id}/`);
  });

  it('should return tree structure', async () => {
    // Create root category
    const root = await ProductCategoryModel.create({
      merchantId,
      name: '食品',
      parentId: null,
      orderIndex: 0
    });

    // Create child category
    await ProductCategoryModel.create({
      merchantId,
      name: '水果',
      parentId: root.id,
      orderIndex: 0
    });

    const tree = await ProductCategoryModel.findTreeByMerchant(merchantId);

    expect(Array.isArray(tree)).toBe(true);
    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].children).toBeDefined();
  });

  it('should prevent deleting category with children', async () => {
    // Create parent category
    const parent = await ProductCategoryModel.create({
      merchantId,
      name: '图书',
      parentId: null,
      orderIndex: 0
    });

    // Create child category
    await ProductCategoryModel.create({
      merchantId,
      name: '小说',
      parentId: parent.id,
      orderIndex: 0
    });

    // Try to delete parent - should fail
    await expect(ProductCategoryModel.delete(parent.id!)).rejects.toThrow();
  });
});
