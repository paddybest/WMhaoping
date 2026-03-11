import { Router } from 'express';
import { ProductItemController } from '../controllers/productItem';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import { validateMerchantAccess } from '../middleware/merchantContext';

const router = Router();

router.use(authenticateMerchant);
router.use(injectMerchantId);

router.get('/', ProductItemController.getByCategory);
router.get('/:id', ProductItemController.getById);
router.post('/', ProductItemController.create);
router.post('/batch', ProductItemController.batchCreate);
router.put('/:id', validateMerchantAccess, ProductItemController.update);
router.put('/:id/tags', validateMerchantAccess, ProductItemController.updateTags);
router.post('/:id/regenerate-tags', validateMerchantAccess, ProductItemController.regenerateTags);
router.delete('/:id', validateMerchantAccess, ProductItemController.delete);

export default router;
