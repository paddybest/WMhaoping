import { Request, Response } from 'express';
import { ProductModel, Product } from '../database/models/Product';
import { authenticate, AuthRequest } from '../middleware/auth';

export class ProductController {
  // 获取所有商品
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const products = await ProductModel.findAll();

      res.json({
        success: true,
        data: products,
        total: products.length
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // 根据ID获取商品
  static async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      const product = await ProductModel.findById(productId);

      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  // 创建商品（需要认证）
  static async createProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { name, tags } = req.body;

      // 验证输入
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Product name is required and must be a string' });
        return;
      }

      if (!tags || !Array.isArray(tags)) {
        res.status(400).json({ error: 'Product tags are required and must be an array' });
        return;
      }

      // 验证标签内容
      for (const tag of tags) {
        if (typeof tag !== 'string') {
          res.status(400).json({ error: 'All tags must be strings' });
          return;
        }
      }

      const productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> = {
        name,
        tags
      };

      const product = await ProductModel.create(productData);

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  }

  // 更新商品（需要认证）
  static async updateProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      // 检查商品是否存在
      const existingProduct = await ProductModel.findById(productId);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 允许更新的字段
      const allowedUpdates = ['name', 'tags'];
      const updates: Partial<Product> = {};

      for (const key of allowedUpdates) {
        if (req.body[key] !== undefined) {
          updates[key as keyof Product] = req.body[key];
        }
      }

      // 验证输入
      if (updates.name && typeof updates.name !== 'string') {
        res.status(400).json({ error: 'Product name must be a string' });
        return;
      }

      if (updates.tags && !Array.isArray(updates.tags)) {
        res.status(400).json({ error: 'Product tags must be an array' });
        return;
      }

      if (updates.tags) {
        for (const tag of updates.tags) {
          if (typeof tag !== 'string') {
            res.status(400).json({ error: 'All tags must be strings' });
            return;
          }
        }
      }

      // 如果没有要更新的字段
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
      }

      const updatedProduct = await ProductModel.update(productId, updates);

      if (!updatedProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  // 删除商品（需要认证）
  static async deleteProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        res.status(400).json({ error: 'Invalid product ID' });
        return;
      }

      // 检查商品是否存在
      const existingProduct = await ProductModel.findById(productId);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const deleted = await ProductModel.delete(productId);

      if (!deleted) {
        res.status(500).json({ error: 'Failed to delete product' });
        return;
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }
}