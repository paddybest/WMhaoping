import { Router } from 'express';
import { ProductImageController } from '../controllers/productImage';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import multer from 'multer';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  }
});

const router = Router();

router.use(authenticateMerchant);
router.use(injectMerchantId);

router.post(':id/images', upload.single('image'), ProductImageController.upload);
router.get(':id/images', ProductImageController.getByProduct);
router.delete(':id/images/:imageId', ProductImageController.delete);
router.put(':id/images/order', ProductImageController.updateOrder);

export default router;
