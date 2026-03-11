import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TagService } from '../services/TagService';

/**
 * 标签管理控制器
 * 标签在这个系统中实际上就是商品类目
 */
export class TagsController {
  /**
   * 获取所有标签
   */
  static async getAllTags(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const tags = await TagService.getAllTags(merchantId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({ error: 'Failed to get tags' });
    }
  }

  /**
   * 获取指定分类下的标签
   */
  static async getTagsByCategory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { categoryId } = req.params;

      if (!categoryId) {
        res.status(400).json({ error: 'Category ID is required' });
        return;
      }

      const tags = await TagService.getTagsByCategoryId(parseInt(categoryId), merchantId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Get tags by category error:', error);
      res.status(500).json({ error: 'Failed to get tags' });
    }
  }

  /**
   * 获取标签统计信息
   */
  static async getTagStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const tags = await TagService.getTagStats(merchantId);

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Get tag stats error:', error);
      res.status(500).json({ error: 'Failed to get tag stats' });
    }
  }

  /**
   * 创建标签
   */
  static async createTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { name, categoryId } = req.body;

      // 验证输入
      if (!name || name.length === 0 || name.length > 50) {
        res.status(400).json({ error: 'Tag name must be 1-50 characters' });
        return;
      }

      if (!categoryId) {
        res.status(400).json({ error: '请选择所属分类' });
        return;
      }

      const tag = await TagService.createTag(merchantId, categoryId, name);

      res.status(201).json({
        success: true,
        data: tag,
        message: `标签"${name}"已创建！`
      });
    } catch (error: any) {
      console.error('Create tag error:', error);
      res.status(500).json({ error: error.message || 'Failed to create tag' });
    }
  }

  /**
   * 重命名标签
   */
  static async renameTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { oldName, newName } = req.body;

      if (!oldName || !newName) {
        res.status(400).json({ error: 'Old name and new name are required' });
        return;
      }

      await TagService.renameTag(merchantId, oldName, newName);

      res.json({
        success: true,
        message: `标签"${oldName}"已重命名为"${newName}"`
      });
    } catch (error) {
      console.error('Rename tag error:', error);
      res.status(500).json({ error: 'Failed to rename tag' });
    }
  }

  /**
   * 删除标签
   */
  static async deleteTag(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { tagName } = req.body;

      if (!tagName) {
        res.status(400).json({ error: 'Tag name is required' });
        return;
      }

      await TagService.deleteTag(merchantId, tagName);

      res.json({
        success: true,
        message: `标签"${tagName}"已删除`
      });
    } catch (error: any) {
      console.error('Delete tag error:', error);
      res.status(400).json({ error: error.message || 'Failed to delete tag' });
    }
  }
}
