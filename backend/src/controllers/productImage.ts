import { Response } from 'express';
import { ProductImageModel } from '../database/models/ProductImage';
import { ProductItemModel } from '../database/models/ProductItem';
import { AuthRequest } from '../middleware/auth';
import OSS = require('ali-oss');
import { randomUUID } from 'crypto';

const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET || 'haopingbao-images'
});

export class ProductImageController {
  // 上传图片
  static async upload(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 检查图片数量限制
      const imageCount = await ProductImageModel.countByProduct(productId);
      if (imageCount >= 50) {
        res.status(400).json({ error: 'Maximum 50 images allowed per product' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // 上传到 OSS（使用UUID代替原始文件名，防止路径遍历攻击）
      const fileExt = req.file.originalname.split('.').pop();
      const safeFileName = `${Date.now()}-${randomUUID()}.${fileExt}`;
      const fileName = `products/${merchantId}/${productId}/${safeFileName}`;
      const result = await ossClient.put(fileName, req.file.buffer);

      // 保存图片记录
      const image = await ProductImageModel.create({
        productId,
        imageUrl: result.url,
        ossFileId: result.name,
        orderIndex: imageCount
      });

      res.status(201).json({
        success: true,
        data: image,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }

  // 获取产品图片列表
  static async getByProduct(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const images = await ProductImageModel.findByProduct(productId);

      res.json({
        success: true,
        data: images
      });
    } catch (error) {
      console.error('Get images error:', error);
      res.status(500).json({ error: 'Failed to get images' });
    }
  }

  // 删除图片
  static async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id: productId, imageId } = req.params;

      // 验证产品存在
      const product = await ProductItemModel.findById(parseInt(productId));
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 获取图片信息
      const images = await ProductImageModel.findByProduct(parseInt(productId));
      const image = images.find(img => img.id === parseInt(imageId));

      if (!image) {
        res.status(404).json({ error: 'Image not found' });
        return;
      }

      // 删除 OSS 文件
      if (image.ossFileId) {
        await ossClient.delete(image.ossFileId);
      }

      // 删除数据库记录
      await ProductImageModel.delete(parseInt(imageId), parseInt(productId));

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });
    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  }

  // 更新图片顺序
  static async updateOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { id } = req.params;
      const productId = parseInt(id);
      const { imageIds } = req.body;

      // 验证产品存在
      const product = await ProductItemModel.findById(productId);
      if (!product || product.merchantId !== merchantId) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // 验证输入
      if (!Array.isArray(imageIds)) {
        res.status(400).json({ error: 'imageIds must be an array' });
        return;
      }

      await ProductImageModel.updateOrder(productId, imageIds);

      res.json({
        success: true,
        message: 'Image order updated successfully'
      });
    } catch (error) {
      console.error('Update image order error:', error);
      res.status(500).json({ error: 'Failed to update image order' });
    }
  }
}
