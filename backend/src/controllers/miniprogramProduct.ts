import { Response } from 'express';
import { ProductCategoryModel } from '../database/models/ProductCategory';
import { ProductItemModel } from '../database/models/ProductItem';
import { ProductImageModel } from '../database/models/ProductImage';
import { pool } from '../database/connection';

export class MiniprogramProductController {
  // 验证商家是否存在
  private static async validateMerchant(merchantId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        'SELECT id FROM merchants WHERE id = $1 AND is_active = TRUE',
        [merchantId]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Validate merchant error:', error);
      return false;
    }
  }

  // 获取所有分类树（公开接口）
  static async getCategories(req: any, res: Response): Promise<void> {
    console.log('[getCategories] Starting, merchantId:', req.query.merchantId);
    try {
      const { merchantId } = req.query;

      if (!merchantId) {
        res.status(400).json({ success: false, error: 'Merchant ID is required' });
        return;
      }

      const merchantIdNum = parseInt(merchantId as string);
      if (isNaN(merchantIdNum)) {
        res.status(400).json({ success: false, error: 'Invalid Merchant ID' });
        return;
      }

      console.log('[getCategories] Validating merchant:', merchantIdNum);
      // 验证商家是否存在
      const isValidMerchant = await MiniprogramProductController.validateMerchant(merchantIdNum);
      if (!isValidMerchant) {
        res.status(404).json({ success: false, error: 'Merchant not found or inactive' });
        return;
      }

      console.log('[getCategories] Fetching categories for merchant:', merchantIdNum);
      const categories = await ProductCategoryModel.findTreeByMerchant(merchantIdNum);

      console.log('[getCategories] Got categories:', categories.length);

      // 一次性查询所有有产品的分类ID - 解决N+1问题
      const categoryIdsResult = await pool.query(
        'SELECT DISTINCT category_id FROM product_items WHERE merchant_id = $1 AND is_active = TRUE',
        [merchantIdNum]
      );
      const categoryIdSet = new Set(categoryIdsResult.rows.map(row => row.category_id));

      // 获取所有顶级分类的标签（存储在 product_categories 表的 tags 字段）
      const topLevelCategoryResult = await pool.query(
        'SELECT id, tags FROM product_categories WHERE merchant_id = $1 AND level = 0',
        [merchantIdNum]
      );
      const topLevelCategoryRows = topLevelCategoryResult.rows;

      // 按顶级分类ID分组标签
      const tagsByTopLevelId = new Map<number, string[]>();
      topLevelCategoryRows.forEach(cat => {
        if (cat.tags) {
          try {
            const tags = typeof cat.tags === 'string' ? JSON.parse(cat.tags) : cat.tags;
            if (Array.isArray(tags) && tags.length > 0) {
              tagsByTopLevelId.set(cat.id, tags.filter((t: string) => t && t.trim()));
            }
          } catch (e) {
            console.error('Parse tags error:', e);
          }
        }
      });

      // 创建一个辅助函数来获取分类的顶级祖先ID
      const getTopLevelId = (category: any): number => {
        // 从 path 中提取顶级分类 ID (path 格式如 /1/3/5/)
        const pathParts = category.path.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          return parseInt(pathParts[0]);
        }
        return category.id;
      };

      // 递归标记分类是否有产品和标签（标签来自顶级分类）
      const markHasProductsAndTags = (categories: any[]): any[] => {
        return categories.map(cat => {
          const topLevelId = getTopLevelId(cat);
          const topLevelTags = tagsByTopLevelId.get(topLevelId) || [];
          return {
            ...cat,
            hasProducts: categoryIdSet.has(cat.id),
            tags: topLevelTags,
            children: cat.children ? markHasProductsAndTags(cat.children) : []
          };
        });
      };

      const categoriesWithProductFlag = markHasProductsAndTags(categories);

      res.json({
        success: true,
        data: categoriesWithProductFlag
      });
    } catch (error) {
      console.error('Get categories error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      res.status(500).json({ success: false, error: 'Failed to get categories' });
    }
  }

  // 根据分类获取产品（公开接口）
  static async getProducts(req: any, res: Response): Promise<void> {
    try {
      const { categoryId, merchantId } = req.query;

      if (!categoryId || !merchantId) {
        res.status(400).json({ success: false, error: 'Category ID and Merchant ID are required' });
        return;
      }

      const categoryIdNum = parseInt(categoryId as string);
      const merchantIdNum = parseInt(merchantId as string);

      if (isNaN(categoryIdNum) || isNaN(merchantIdNum)) {
        res.status(400).json({ success: false, error: 'Invalid IDs' });
        return;
      }

      const products = await ProductItemModel.findByCategory(categoryIdNum, merchantIdNum);

      if (products.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      // 批量获取所有产品的图片 - 解决N+1问题
      const productIds = products.map(p => p.id);
      // PostgreSQL 使用 $1, $2, ... 参数占位符
      const imageResult = await pool.query(
        `SELECT product_id as "productId", image_url as "imageUrl"
         FROM product_images
         WHERE product_id = ANY($1)
         ORDER BY product_id, order_index`,
        [productIds]
      );
      const imageRows = imageResult.rows;

      // 按产品ID分组图片
      const imageMap = new Map<number, string[]>();
      imageRows.forEach(img => {
        if (!imageMap.has(img.productId)) {
          imageMap.set(img.productId, []);
        }
        imageMap.get(img.productId)!.push(img.imageUrl);
      });

      // 组装产品和图片数据
      const productsWithImages = products.map(product => ({
        id: product.id,
        name: product.name,
        tags: product.tags,
        categoryId: product.categoryId,
        images: imageMap.get(product.id!) || []
      }));

      res.json({
        success: true,
        data: productsWithImages
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ success: false, error: 'Failed to get products' });
    }
  }

  // 批量获取产品（最多20个）
  static async getProductsBatch(req: any, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids) {
        res.status(400).json({ success: false, error: 'Product IDs are required' });
        return;
      }

      const idArray = (ids as string).split(',').map(id => parseInt(id));

      // 限制批量查询数量，防止滥用
      if (idArray.length > 20) {
        res.status(400).json({ success: false, error: 'Maximum 20 products allowed per request' });
        return;
      }

      // 过滤无效ID
      const validIds = idArray.filter(id => !isNaN(id) && id > 0);
      if (validIds.length === 0) {
        res.status(400).json({ success: false, error: 'No valid product IDs' });
        return;
      }

      // 批量获取产品 (PostgreSQL)
      const productsResult = await pool.query(
        `SELECT id, name, tags, category_id as "categoryId"
         FROM product_items
         WHERE id = ANY($1) AND is_active = TRUE`,
        [validIds]
      );
      const products = productsResult.rows;

      if (products.length === 0) {
        res.json({ success: true, data: [] });
        return;
      }

      // 批量获取图片 (PostgreSQL)
      const imageResult = await pool.query(
        `SELECT product_id as "productId", image_url as "imageUrl"
         FROM product_images
         WHERE product_id = ANY($1)
         ORDER BY product_id, order_index`,
        [validIds]
      );
      const imageRows = imageResult.rows;

      // 按产品ID分组图片
      const imageMap = new Map<number, string[]>();
      imageRows.forEach(img => {
        if (!imageMap.has(img.productId)) {
          imageMap.set(img.productId, []);
        }
        imageMap.get(img.productId)!.push(img.imageUrl);
      });

      // 组装数据
      const result = products.map(product => ({
        id: product.id,
        name: product.name,
        tags: Array.isArray(product.tags) ? product.tags : JSON.parse(product.tags || '[]'),
        categoryId: product.categoryId,
        images: imageMap.get(product.id) || []
      }));

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Get products batch error:', error);
      res.status(500).json({ success: false, error: 'Failed to get products' });
    }
  }

  // 获取商家所有标签（公开接口）
  static async getTags(req: any, res: Response): Promise<void> {
    console.log('[getTags] Starting, merchantId:', req.query.merchantId);
    try {
      const { merchantId } = req.query;

      if (!merchantId) {
        res.status(400).json({ success: false, error: 'Merchant ID is required' });
        return;
      }

      const merchantIdNum = parseInt(merchantId as string);
      if (isNaN(merchantIdNum)) {
        res.status(400).json({ success: false, error: 'Invalid Merchant ID' });
        return;
      }

      // 验证商家是否存在
      const isValidMerchant = await MiniprogramProductController.validateMerchant(merchantIdNum);
      if (!isValidMerchant) {
        res.status(404).json({ success: false, error: 'Merchant not found or inactive' });
        return;
      }

      // 获取商家所有标签
      const tagsResult = await pool.query(
        `SELECT id, name, category_id as "categoryId"
         FROM product_tag_labels
         WHERE merchant_id = $1
         ORDER BY category_id, order_index, name`,
        [merchantIdNum]
      );
      const tags = tagsResult.rows;

      res.json({
        success: true,
        data: tags
      });
    } catch (error) {
      console.error('Get tags error:', error);
      res.status(500).json({ success: false, error: 'Failed to get tags' });
    }
  }

  // 根据ID获取单个商品（公开接口）
  static async getProductById(req: any, res: Response): Promise<void> {
    console.log('[getProductById] Starting, productId:', req.params.productId);
    try {
      const { productId } = req.params;
      const { merchantId } = req.query;

      if (!productId) {
        res.status(400).json({ success: false, error: 'Product ID is required' });
        return;
      }

      const productIdNum = parseInt(productId as string);
      if (isNaN(productIdNum)) {
        res.status(400).json({ success: false, error: 'Invalid Product ID' });
        return;
      }

      const productsResult = await pool.query(
        `SELECT id, name, tags, category_id as "categoryId", merchant_id as "merchantId"
         FROM product_items
         WHERE id = $1 AND is_active = TRUE`,
        [productIdNum]
      );
      const products = productsResult.rows;

      if (products.length === 0) {
        res.status(404).json({ success: false, error: 'Product not found' });
        return;
      }

      const product = products[0];

      if (merchantId) {
        const merchantIdNum = parseInt(merchantId as string);
        if (!isNaN(merchantIdNum) && product.merchantId !== merchantIdNum) {
          res.status(404).json({ success: false, error: 'Product not found for this merchant' });
          return;
        }
      }

      const imageResult = await pool.query(
        `SELECT image_url as "imageUrl"
         FROM product_images
         WHERE product_id = $1
         ORDER BY order_index`,
        [productIdNum]
      );
      const imageRows = imageResult.rows;

      res.json({
        success: true,
        data: {
          id: product.id,
          name: product.name,
          tags: typeof product.tags === 'string' ? JSON.parse(product.tags || '[]') : (product.tags || []),
          categoryId: product.categoryId,
          merchantId: product.merchantId,
          images: imageRows.map((img: any) => img.imageUrl)
        }
      });
    } catch (error) {
      console.error('Get product by id error:', error);
      res.status(500).json({ success: false, error: 'Failed to get product' });
    }
  }
}
