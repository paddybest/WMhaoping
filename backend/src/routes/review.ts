import { Router } from 'express';
import { ReviewController } from '../controllers/review';
import { authenticate, authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';

const router = Router();

router.post('/generate', ReviewController.generateReview);

router.get('/my-reviews', authenticate, ReviewController.getMyReviews);

router.post('/upload-screenshot', ReviewController.uploadMiddleware, ReviewController.uploadScreenshot);

router.post('/verify-screenshot', ReviewController.verifyScreenshot);

router.get('/merchant/all', authenticateMerchant, injectMerchantId, ReviewController.getMerchantReviews);

export default router;