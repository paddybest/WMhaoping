import { Response } from 'express';
import { ProductCategoryModel } from '../database/models/ProductCategory';
import { AIService } from '../services/ai';
import { AuthRequest, authenticateMerchant } from '../middleware/auth';

export class ProductCategoryController {
  // 获取分类树
  static async getTree(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;

      const categories = await ProductCategoryModel.findTreeByMerchant(merchantId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({ error: 'Failed to get categories' });
    }
  }

  // 获取顶级分类（带标签）
  static async getTopLevelCategories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;

      const categories = await ProductCategoryModel.findTopLevelCategories(merchantId);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get top level categories error:', error);
      res.status(500).json({ error: 'Failed to get top level categories' });
    }
  }

  // 获取所有二级分类
  static async getLevel2Categories(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;

      // 获取所有分类树
      const categories = await ProductCategoryModel.findTreeByMerchant(merchantId);

      // 提取所有二级分类（叶子节点）
      const extractLevel2 = (cats: any[], parentName?: string): any[] => {
        const result: any[] = [];
        for (const cat of cats) {
          // 如果是一级分类，遍历子分类
          if (cat.children && cat.children.length > 0) {
            for (const child of cat.children) {
              result.push({
                id: child.id,
                name: child.name,
                parentId: child.parentId,
                level: child.level,
                parentName: cat.name, // 父分类名称
                tags: child.tags || []
              });
            }
          }
        }
        return result;
      };

      const level2Categories = extractLevel2(categories);

      res.json({
        success: true,
        data: level2Categories
      });
    } catch (error) {
      console.error('Get level 2 categories error:', error);
      res.status(500).json({ error: 'Failed to get level 2 categories' });
    }
  }

  // 获取分类标签
  static async getTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);

      // 获取分类
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // 获取顶级分类的标签
      const topLevelCategory = await ProductCategoryModel.findTopLevelAncestor(categoryId);

      res.json({
        success: true,
        data: {
          categoryId: topLevelCategory?.id,
          categoryName: topLevelCategory?.name,
          tags: topLevelCategory?.tags || []
        }
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({ error: 'Failed to get tags' });
    }
  }

  // 更新分类标签
  static async updateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);
      const { tags } = req.body;

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // 验证标签格式
      if (!Array.isArray(tags) || tags.length !== 6) {
        res.status(400).json({ error: 'Tags must be an array of exactly 6 items' });
        return;
      }

      // 获取顶级分类并更新标签
      const topLevelCategory = await ProductCategoryModel.findTopLevelAncestor(categoryId);
      if (!topLevelCategory || !topLevelCategory.id) {
        res.status(400).json({ error: 'Failed to find top level category' });
        return;
      }

      const updatedCategory = await ProductCategoryModel.updateTags(topLevelCategory.id, tags);

      res.json({
        success: true,
        data: {
          categoryId: updatedCategory?.id,
          categoryName: updatedCategory?.name,
          tags: updatedCategory?.tags
        },
        message: 'Tags updated successfully'
      });
    } catch (error: any) {
      console.error('Update tags error:', error);
      res.status(400).json({ error: error.message || 'Failed to update tags' });
    }
  }

  // AI重新生成标签
  static async regenerateTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      // 获取顶级分类
      const topLevelCategory = await ProductCategoryModel.findTopLevelAncestor(categoryId);
      if (!topLevelCategory || !topLevelCategory.id) {
        res.status(400).json({ error: 'Failed to find top level category' });
        return;
      }

      // 调用 AI 生成标签
      const tags = await AIService.generateTags(topLevelCategory.name, '');

      // 更新标签
      const updatedCategory = await ProductCategoryModel.updateTags(topLevelCategory.id, tags);

      res.json({
        success: true,
        data: {
          categoryId: updatedCategory?.id,
          categoryName: updatedCategory?.name,
          tags: updatedCategory?.tags
        },
        message: 'Tags regenerated successfully'
      });
    } catch (error: any) {
      console.error('Regenerate tags error:', error);
      res.status(400).json({ error: error.message || 'Failed to regenerate tags' });
    }
  }

  // 创建分类
  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { name, parentId, orderIndex = 0 } = req.body;

      // 验证输入
      if (!name || typeof name !== 'string' || name.length < 1 || name.length > 50) {
        res.status(400).json({ error: 'Category name must be 1-50 characters' });
        return;
      }

      if (parentId !== undefined && parentId !== null) {
        // 验证父分类存在且属于当前商家
        const parentCategory = await ProductCategoryModel.findById(parentId);
        if (!parentCategory || parentCategory.merchantId !== merchantId) {
          res.status(400).json({ error: 'Parent category not found' });
          return;
        }
      }

      const category = await ProductCategoryModel.create({
        merchantId,
        name,
        parentId: parentId || null,
        orderIndex
      });

      // 如果是顶级分类（parentId为空），自动生成标签
      if (!parentId) {
        try {
          const tags = await AIService.generateTags(name, '');
          await ProductCategoryModel.updateTags(category.id!, tags);
          // 重新获取带有标签的分类
          const categoryWithTags = await ProductCategoryModel.findById(category.id!);
          res.status(201).json({
            success: true,
            data: categoryWithTags,
            message: 'Category created successfully, tags auto-generated'
          });
          return;
        } catch (tagError) {
          console.error('Auto-generate tags error:', tagError);
          // 标签生成失败不影响分类创建
        }
      }

      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully'
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({ error: error.message || 'Failed to create category' });
    }
  }

  // 更新分类
  static async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);
      const { name, parentId, orderIndex } = req.body;

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (parentId !== undefined) updates.parentId = parentId;
      if (orderIndex !== undefined) updates.orderIndex = orderIndex;

      const updatedCategory = await ProductCategoryModel.update(categoryId, updates);

      res.json({
        success: true,
        data: updatedCategory,
        message: 'Category updated successfully'
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({ error: error.message || 'Failed to update category' });
    }
  }

  // 删除分类
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const categoryId = parseInt(id);

      // 验证分类存在
      const category = await ProductCategoryModel.findById(categoryId);
      if (!category || category.merchantId !== merchantId) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }

      await ProductCategoryModel.delete(categoryId);

      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error: any) {
      console.error('Delete category error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete category' });
    }
  }
}
