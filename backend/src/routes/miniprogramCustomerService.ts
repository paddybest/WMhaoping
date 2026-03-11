import { Router } from 'express';
import { MiniprogramCustomerServiceController } from '../controllers/miniprogramCustomerService';
import { miniprogramRateLimit } from '../middleware/rateLimit';

const router = Router();

// 应用限流中间件到所有路由
router.use(miniprogramRateLimit);

// 公开接口，无需认证，但有限流
// 注意：客服二维码通过商家ID获取，不需要二维码签名验证
// 因为用户只能通过扫描商家的正确二维码获取商家ID

// 获取商家客服二维码
router.get('/:merchantId', MiniprogramCustomerServiceController.getCustomerServiceQR);

export default router;
