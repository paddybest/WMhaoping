import { Router } from 'express';
import { ProductController } from '../controllers/product';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import { validateMerchantAccess } from '../middleware/merchantContext';

const router = Router();

// 公开路由 - 不需要认证
router.get('/', ProductController.getProducts); // 获取所有商品
router.get('/:id', ProductController.getProduct); // 根据ID获取商品

// 认证路由 - 需要商家认证
router.use(authenticateMerchant); // 商家认证
router.use(injectMerchantId); // 自动注入merchant_id

router.post('/', ProductController.createProduct); // 创建商品
router.put('/:id', validateMerchantAccess, ProductController.updateProduct); // 更新商品 - 添加权限验证
router.delete('/:id', validateMerchantAccess, ProductController.deleteProduct); // 删除商品 - 添加权限验证

export default router;