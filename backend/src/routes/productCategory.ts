import { Router } from 'express';
import { ProductCategoryController } from '../controllers/productCategory';
import { authenticateMerchant, AuthRequest } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import { validateMerchantAccess } from '../middleware/merchantContext';
import { generateAndUploadCategoryQRCode } from '../services/qrcode';

const router = Router();

// 所有路由需要商家认证
router.use(authenticateMerchant); // 商家认证
router.use(injectMerchantId); // 自动注入merchant_id

// 特定路由必须在动态路由之前
router.get('/top-level', ProductCategoryController.getTopLevelCategories); // 获取顶级分类（带标签）
router.get('/level2', ProductCategoryController.getLevel2Categories); // 获取所有二级分类
router.get('/:id/tags', ProductCategoryController.getTags); // 获取分类标签
router.put('/:id/tags', validateMerchantAccess, ProductCategoryController.updateTags); // 更新分类标签
router.post('/:id/regenerate-tags', validateMerchantAccess, ProductCategoryController.regenerateTags); // AI重新生成标签

// 生成分类二维码
router.post('/:id/qrcode', validateMerchantAccess, async (req: AuthRequest, res) => {
  try {
    const merchantId = req.merchant!.id;
    const { id } = req.params;
    const categoryId = parseInt(id);

    // 验证分类存在且属于当前商家
    const { ProductCategoryModel } = await import('../database/models/ProductCategory');
    const category = await ProductCategoryModel.findById(categoryId);

    if (!category || category.merchantId !== merchantId) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    // 验证是二级分类（叶子节点）
    const isLeaf = await ProductCategoryModel.isLeafNode(categoryId);
    if (!isLeaf) {
      res.status(400).json({ error: 'Only leaf categories (level 2) can generate QR code' });
      return;
    }

    // 生成分类二维码
    const qrCodeUrl = await generateAndUploadCategoryQRCode(merchantId, categoryId, category.name);

    res.json({
      success: true,
      data: {
        categoryId,
        categoryName: category.name,
        qrCodeUrl
      }
    });
  } catch (error: any) {
    console.error('Generate category QR code error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate QR code' });
  }
});

router.get('/', ProductCategoryController.getTree);
router.post('/', ProductCategoryController.create);
router.put('/:id', validateMerchantAccess, ProductCategoryController.update); // 更新分类 - 添加权限验证
router.delete('/:id', validateMerchantAccess, ProductCategoryController.delete); // 删除分类 - 添加权限验证

export default router;
