import { Router } from 'express';
import { MiniprogramMerchantController } from '../controllers/miniprogramMerchant';
import { miniprogramRateLimit } from '../middleware/rateLimit';
import { validateQRCodeSignature, optionalValidateQRCodeSignature } from '../middleware/qrCodeAuth';

const router = Router();

// 应用限流中间件到所有路由
router.use(miniprogramRateLimit);

// 公开接口，无需认证，但有限流

// 验证二维码签名（防伪造）
// GET /api/miniprogram/merchants/validate?merchant_id=1&sig=xxx
router.get('/validate', validateQRCodeSignature, MiniprogramMerchantController.validateQRCode);

// 获取所有活跃商家列表
router.get('/', MiniprogramMerchantController.getActiveMerchants);

// 获取商家客服二维码（必须放在 /:id 之前，避免路由冲突）
router.get('/customer-service/:merchantId', MiniprogramMerchantController.getCustomerServiceQR);

// 获取指定商家详情（可选签名验证，用于向后兼容）
router.get('/:id', optionalValidateQRCodeSignature, MiniprogramMerchantController.getMerchantById);

export default router;
