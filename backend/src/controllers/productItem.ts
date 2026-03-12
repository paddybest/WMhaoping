import { Response } from 'express';
import { ProductItemModel } from '../database/models/ProductItem';
import { ProductImageModel } from '../database/models/ProductImage';
import { ProductCategoryModel } from '../database/models/ProductCategory';
import { AIService } from '../services/ai';
import { AuthRequest, authenticateMerchant } from '../middleware/auth';

export class ProductItemController {
  // 获取产品列表
  static async getByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId } = req.query;

      if (!categoryId || typeof categoryId !== 'string') {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const products = await ProductItemModel.findByCategory(parseInt(categoryId), merchantId);

      // 获取每个产品的图片数量
      const productsWithImageCount = await Promise.all(
        products.map(async (product) => {
          const imageCount = await ProductImageModel.countByProduct(product.id!);
          return {
            ...product,
            imageCount
          };
        })
      );

      res.json({
        success: true,
        data: productsWithImageCount
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to get products' });
    }
  }

  // 创建产品
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId, name, isActive = true } = req.body;

      // 验证输入
      if (!categoryId || !name) {
        res.status(400).json({ error: 'Category ID and name are required' });
        return;
      }

      // 允许先创建商品，后续再添加图片
      const product = await ProductItemModel.create({
        merchantId,
        categoryId: parseInt(categoryId),
        name,
        tags: [],
        isActive
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });
    } catch (error: any) {
      console.error('Create product error:', error);
      res.status(400).json({ error: error.message || 'Failed to create product' });
    }
  }

  // 更新产品
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);
      const { name, isActive } = req.body;

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // 验证产品名称长度
      if (name !== undefined && name.length > 255) {
        res.status(400).json({ success: false, error: 'Product name must be less than 255 characters' });
        return;
      }

      // 允许激活产品时没有图片，后续可以再添加

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedProduct = await ProductItemModel.update(productId, updates);

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Product updated successfully'
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ success: false, error: 'Failed to update product' });
    }
  }

  // 批量创建产品
  static async batchCreate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { products, categoryMap } = req.body;

      if (!Array.isArray(products) || products.length === 0) {
        res.status(400).json({ error: 'Products array is required' });
        return;
      }

      if (products.length > 100) {
        res.status(400).json({ error: 'Maximum 100 products per batch' });
        return;
      }

      // categoryMap: { "分类名称": categoryId }
      const results = [];
      for (const p of products) {
        const categoryName = p.categoryName || p.category;
        const categoryId = categoryMap?.[categoryName];

        if (!categoryId || !p.name) {
          results.push({ success: false, name: p.name, error: 'Missing category or name' });
          continue;
        }

        // 解析标签（逗号分隔）
        let tags: string[] = [];
        if (p.tags) {
          tags = p.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        try {
          const product = await ProductItemModel.create({
            merchantId,
            categoryId,
            name: p.name,
            tags,
            isActive: p.isActive !== false
          });
          results.push({ success: true, name: p.name, id: product.id });
        } catch (e: any) {
          results.push({ success: false, name: p.name, error: e.message });
        }
      }

      res.json({ success: true, data: results });
    } catch (error: any) {
      console.error('Batch create products error:', error);
      res.status(500).json({ error: error.message || 'Failed to batch create products' });
    }
  }

  // 删除产品
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      const deleted = await ProductItemModel.delete(productId, merchantId);

      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
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

  // 获取产品详情（含图片）
  static async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      const product = await ProductItemModel.findById(productId);

      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const images = await ProductImageModel.findByProduct(productId);

      res.json({
        success: true,
        data: {
          ...product,
          images
        }
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to get product' });
    }
  }

  // 更新产品标签
  static async updateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);
      const { tags } = req.body;

      // 验证标签
      if (!Array.isArray(tags)) {
        res.status(400).json({ success: false, error: 'Tags must be an array' });
        return;
      }

      // 确保标签数量为6个
      let finalTags = tags.slice(0, 6);
      while (finalTags.length < 6) {
        finalTags.push('');
      }

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const updatedProduct = await ProductItemModel.update(productId, { tags: finalTags });

      // 同时更新顶级分类的标签
      try {
        const topLevelCategory = await ProductCategoryModel.findTopLevelAncestor(product.categoryId);
        if (topLevelCategory && topLevelCategory.id) {
          await ProductCategoryModel.updateTags(topLevelCategory.id, finalTags);
        }
      } catch (e) {
        console.log('Failed to update top-level category tags:', e);
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Tags updated successfully'
      });
    } catch (error) {
      console.error('Update tags error:', error);
      res.status(500).json({ success: false, error: 'Failed to update tags' });
    }
  }

  // 重新生成产品标签
  static async regenerateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      // 获取分类名称
      let categoryName = '';
      try {
        const category = await ProductCategoryModel.findById(product.categoryId);
        categoryName = category?.name || '';
      } catch (e) {
        console.log('Failed to get category name:', e);
      }

      // 调用AI重新生成标签
      const newTags = await AIService.generateTags(product.name, categoryName);

      // 更新产品标签
      const updatedProduct = await ProductItemModel.update(productId, { tags: newTags });

      // 同时更新顶级分类的标签
      try {
        const topLevelCategory = await ProductCategoryModel.findTopLevelAncestor(product.categoryId);
        if (topLevelCategory && topLevelCategory.id) {
          await ProductCategoryModel.updateTags(topLevelCategory.id, newTags);
        }
      } catch (e) {
        console.log('Failed to update top-level category tags:', e);
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: 'Tags regenerated successfully'
      });
    } catch (error) {
      console.error('Regenerate tags error:', error);
      res.status(500).json({ success: false, error: 'Failed to regenerate tags' });
    }
  }
}
