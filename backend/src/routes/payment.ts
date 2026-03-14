import { Router, Request, Response } from 'express';
import { authenticateMerchant } from '../middleware/auth';
import { injectMerchantId } from '../middleware/merchantContext';
import * as wechatPay from '../services/wechatPay';
import { MerchantBalanceModel } from '../database/models/MerchantBalance';
import { RedemptionRecordModel } from '../database/models/RedemptionRecord';

const router = Router();

// 商家认证
router.use(authenticateMerchant);
router.use(injectMerchantId);

/**
 * POST /api/payment/create-recharge-order
 * 创建充值订单，返回支付二维码
 */
router.post('/create-recharge-order', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;
  const { amount } = req.body; // 金额（元）

  if (!amount || amount <= 0) {
    res.status(400).json({ success: false, error: '请输入正确的充值金额' });
    return;
  }

  const amountInFen = Math.round(amount * 100); // 转换为分
  const orderId = `RC${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

  try {
    if (wechatPay.isPayEnabled()) {
      const result = await wechatPay.createNativeOrder(
        orderId,
        amountInFen,
        '商家充值'
      );

      // 保存订单到数据库（状态：pending）
      // TODO: 创建 payment_orders 表记录订单

      res.json({
        success: true,
        data: {
          orderId,
          codeUrl: result.codeUrl,
          amount,
        },
      });
    } else {
      // 模拟支付：直接更新余额（仅用于测试）
      const balance = await MerchantBalanceModel.recharge(merchantId, amount);

      res.json({
        success: true,
        data: {
          orderId,
          codeUrl: '', // 模拟模式为空
          amount,
          simulate: true,
        },
      });
    }
  } catch (error: any) {
    console.error('创建充值订单失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payment/callback
 * 支付回调通知
 */
router.post('/callback', async (req: Request, res: Response): Promise<void> => {
  const body = req.body;
  const headers = req.headers as any;

  try {
    // 验证签名
    const verified = await wechatPay.verifyCallback(body, headers);
    if (!verified) {
      res.status(400).json({ code: 'FAIL', message: '签名验证失败' });
      return;
    }

    // 处理回调
    const resultCode = body.result_code;
    const orderId = body.out_trade_no;

    if (resultCode === 'SUCCESS') {
      // 支付成功，更新订单状态
      // TODO: 更新 payment_orders 表状态为 paid
      console.log(`订单 ${orderId} 支付成功`);
    }

    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error: any) {
    console.error('支付回调处理失败:', error);
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
});

/**
 * POST /api/payment/withdraw
 * 申请提现（用户）
 */
router.post('/withdraw', async (req: Request, res: Response): Promise<void> => {
  const merchantId = (req as any).merchantId;
  const { recordId, openId } = req.body;

  if (!recordId || !openId) {
    res.status(400).json({ success: false, error: '参数不完整' });
    return;
  }

  try {
    // 获取返现记录
    const record = await RedemptionRecordModel.findById(recordId);
    if (!record || record.merchant_id !== merchantId) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }

    if (record.status !== 'verified') {
      res.status(400).json({ success: false, error: '记录状态不正确' });
      return;
    }

    // 检查余额
    const balance = await MerchantBalanceModel.findByMerchantId(merchantId);
    if (!balance || balance.balance < record.cash_amount) {
      res.status(400).json({ success: false, error: '余额不足' });
      return;
    }

    // 执行转账
    const amountInFen = Math.round(record.cash_amount * 100);
    const transferResult = await wechatPay.transferToUser(
      `WD${Date.now()}`,
      openId,
      amountInFen,
      '好评宝提现'
    );

    if (transferResult.success) {
      // 更新记录状态为已完成
      await RedemptionRecordModel.updateStatus(recordId, 'completed', merchantId);

      res.json({
        success: true,
        data: { paymentId: transferResult.paymentId },
      });
    } else {
      res.status(500).json({ success: false, error: '转账失败' });
    }
  } catch (error: any) {
    console.error('提现处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/payment/status/:orderId
 * 查询订单状态
 */
router.get('/status/:orderId', async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;

  try {
    const result = await wechatPay.queryOrder(orderId);
    res.json({
      success: true,
      data: {
        orderId,
        tradeState: result.trade_state,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
