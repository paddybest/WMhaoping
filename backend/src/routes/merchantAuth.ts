import { Router } from 'express';
import { MerchantAuthController } from '../controllers/merchantAuth';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';

const router = Router();

// 公开路由
router.post('/login', MerchantAuthController.login);
router.post('/register', MerchantAuthController.register);

// 需要认证的路由
router.use(authenticateMerchant); // 商家认证
router.use(injectMerchantId); // 自动注入merchant_id

router.get('/me', authenticateMerchant, MerchantAuthController.getMe);
router.get('/profile', authenticateMerchant, MerchantAuthController.getProfile);
router.put('/profile', authenticateMerchant, MerchantAuthController.updateProfile);

export default router;
