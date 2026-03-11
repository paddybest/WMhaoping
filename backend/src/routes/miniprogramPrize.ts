import { Router } from 'express';
import { MiniprogramPrizeController } from '../controllers/miniprogramPrize';
import { miniprogramRateLimit } from '../middleware/rateLimit';
import { requireMerchantId } from '../middleware/merchantContext';
import { optionalValidateQRCodeSignature } from '../middleware/qrCodeAuth';

const router = Router();

// 应用限流中间件到所有路由
router.use(miniprogramRateLimit);

// 公开接口，无需JWT认证，但需要merchantId参数
// GET /api/miniprogram/prizes?merchantId=123
// 可选二维码签名验证: GET /api/miniprogram/prizes?merchantId=123&sig=xxx
router.get('/', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramPrizeController.getPrizes);

// GET /api/miniprogram/prizes/:id?merchantId=123
// 可选二维码签名验证: GET /api/miniprogram/prizes/:id?merchantId=123&sig=xxx
router.get('/:id', requireMerchantId, optionalValidateQRCodeSignature, MiniprogramPrizeController.getPrizeById);

export default router;
