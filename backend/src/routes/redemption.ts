import { Router, Request, Response } from 'express';
import { RedemptionRecordModel } from '../database/models/RedemptionRecord';
import { MerchantBalanceModel } from '../database/models/MerchantBalance';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';

const router = Router();

// 商家相关路由需要认证
router.use(authenticateMerchant);
router.use(injectMerchantId);

// 获取用户的返现记录
router.get('/my', async (req: Request, res: Response): Promise<void> => {
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).json({ success: false, error: 'userId required' });
    return;
  }
  const records = await RedemptionRecordModel.findByUser(parseInt(userId as string));
  res.json({ success: true, data: records });
});

// 根据兑换码获取返现记录详情
router.get('/by-code/:code', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.params;
  const record = await RedemptionRecordModel.findByRewardCode(code);
  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }
  res.json({ success: true, data: record });
});

// 上传截图
router.post('/upload-screenshot', async (req: Request, res: Response): Promise<void> => {
  const { rewardCode, screenshotUrl } = req.body;
  if (!rewardCode || !screenshotUrl) {
    res.status(400).json({ success: false, error: 'rewardCode and screenshotUrl required' });
    return;
  }
  const record = await RedemptionRecordModel.findByRewardCode(rewardCode);
  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }
  await RedemptionRecordModel.uploadScreenshot(record.id!, screenshotUrl);
  res.json({ success: true });
});

// 创建返现记录（由抽奖后自动创建，也可以手动创建）
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  const { merchantId, userId, prizeId, lotteryRecordId, rewardCode, cashAmount } = req.body;

  if (!merchantId || !userId || !prizeId || !rewardCode || !cashAmount) {
    res.status(400).json({ success: false, error: 'Missing required fields' });
    return;
  }

  // 检查是否已存在该兑换码的记录
  const existing = await RedemptionRecordModel.findByRewardCode(rewardCode);
  if (existing) {
    res.json({ success: true, data: existing });
    return;
  }

  const record = await RedemptionRecordModel.create({
    merchant_id: parseInt(merchantId),
    user_id: parseInt(userId),
    prize_id: parseInt(prizeId),
    lottery_record_id: lotteryRecordId ? parseInt(lotteryRecordId) : undefined,
    reward_code: rewardCode,
    cash_amount: parseFloat(cashAmount),
    status: 'pending'
  });

  res.json({ success: true, data: record });
});

// ===== 商家端API =====

// 商家获取返现记录列表
router.get('/merchant/list', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;
  const status = req.query.status as string | undefined;

  const records = await RedemptionRecordModel.findByMerchant(merchantId, status);
  res.json({ success: true, data: records });
});

// 商家审核返现
router.post('/merchant/verify', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;
  const { recordId, approved } = req.body;

  if (!recordId || approved === undefined) {
    res.status(400).json({ success: false, error: 'recordId and approved required' });
    return;
  }

  const record = await RedemptionRecordModel.findById(parseInt(recordId));
  if (!record) {
    res.status(404).json({ success: false, error: 'Record not found' });
    return;
  }

  // 验证商家权限
  if (record.merchant_id !== merchantId) {
    res.status(403).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const newStatus = approved ? 'verified' : 'failed';

  // 如果审核通过，扣除商家余额
  if (approved) {
    const balance = await MerchantBalanceModel.findByMerchantId(merchantId);
    if (!balance || balance.balance < record.cash_amount) {
      res.status(400).json({ success: false, error: '商家余额不足，无法返现' });
      return;
    }
    // 扣除余额
    await MerchantBalanceModel.deduct(merchantId, record.cash_amount);
  }

  await RedemptionRecordModel.updateStatus(parseInt(recordId), newStatus, merchantId);

  res.json({ success: true });
});

// 商家获取余额
router.get('/merchant/balance', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;

  const balance = await MerchantBalanceModel.findByMerchantId(merchantId);
  if (!balance) {
    // 自动创建
    const newBalance = await MerchantBalanceModel.getOrCreate(merchantId);
    res.json({ success: true, data: newBalance });
    return;
  }

  res.json({ success: true, data: balance });
});

// 商家充值
router.post('/merchant/recharge', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, error: 'positive amount required' });
    return;
  }

  const balance = await MerchantBalanceModel.recharge(merchantId, parseFloat(amount));
  res.json({ success: true, data: balance });
});

export default router;
