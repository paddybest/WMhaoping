import { Router } from 'express';
import { MiniprogramProductController } from '../controllers/miniprogramProduct';
import { miniprogramRateLimit } from '../middleware/rateLimit';
import { requireMerchantId } from '../middleware/merchantContext';
import { optionalValidateQRCodeSignature } from '../middleware/qrCodeAuth';

const router = Router();

// 测试路由 - 不使用中间件
router.get('/test', (req, res) => {
  console.log('[TEST] Route reached!');
  res.json({ success: true, message: 'Test route works!' });
});

// 应用限流中间件到所有路由
// router.use(miniprogramRateLimit);

// 公开接口，无需认证，但有限流和merchant验证
// 可选二维码签名验证: ?merchantId=123&sig=xxx
router.get('/categories', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramProductController.getCategories);
router.get('/products', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramProductController.getProducts);
router.get('/products/batch', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramProductController.getProductsBatch);
router.get('/products/:productId', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramProductController.getProductById);
router.get('/tags', requireMerchantId, MiniprogramProductController.getTags);

export default router;
