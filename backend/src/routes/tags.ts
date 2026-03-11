import { Router } from 'express';
import { TagsController } from '../controllers/tags';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';

const router = Router();
// 所有路由需要商家认证
router.use(authenticateMerchant);
router.use(injectMerchantId);

router.get('/', TagsController.getAllTags);
router.get('/by-category/:categoryId', TagsController.getTagsByCategory);
router.get('/stats', TagsController.getTagStats);
router.post('/', TagsController.createTag);
router.post('/rename', TagsController.renameTag);
router.delete('/', TagsController.deleteTag);

export default router;
