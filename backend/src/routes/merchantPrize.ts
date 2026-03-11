import { Router } from 'express';
import { MerchantPrizeController } from '../controllers/merchantPrize';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import { validateMerchantAccess } from '../middleware/merchantContext';
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

// 所有路由都需要JWT认证
router.use(authenticateMerchant);

// 自动注入merchant_id到所有请求
router.use(injectMerchantId);

// GET /api/merchant/prizes - 获取当前商家的所有奖品
router.get('/', MerchantPrizeController.getPrizes);

// GET /api/merchant/prizes/:id - 获取指定奖品
router.get('/:id', MerchantPrizeController.getPrizeById);

// POST /api/merchant/prizes - 创建新奖品
router.post('/', MerchantPrizeController.createPrize);

// PATCH /api/merchant/prizes/:id - 更新奖品
router.patch('/:id', validateMerchantAccess, MerchantPrizeController.updatePrize); // 更新奖品 - 添加权限验证

// DELETE /api/merchant/prizes/:id - 删除奖品
router.delete('/:id', validateMerchantAccess, MerchantPrizeController.deletePrize); // 删除奖品 - 添加权限验证

// POST /api/merchant/prizes/:id/increment - 增加库存
router.post('/:id/increment', MerchantPrizeController.incrementStock);

// POST /api/merchant/prizes/:id/image - 上传奖品图片
router.post('/:id/image', validateMerchantAccess, upload.single('image'), MerchantPrizeController.uploadImage);

export default router;
