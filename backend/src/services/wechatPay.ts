import WechatPay from 'wechatpay-node-v3';
import fs from 'fs';
import path from 'path';

const WECHAT_MCHID = process.env.WECHAT_MCHID || '';
const WECHAT_MCH_KEY = process.env.WECHAT_MCH_KEY || '';
const WECHAT_SERIAL_NO = process.env.WECHAT_SERIAL_NO || '';
const WECHAT_PRIVATE_KEY_PATH = process.env.WECHAT_PRIVATE_KEY_PATH || '';
const WECHAT_NOTIFY_URL = process.env.WECHAT_NOTIFY_URL || '';

// 是否启用真实支付
const PAY_ENABLED = process.env.WECHAT_PAY_ENABLED === 'true';

// 初始化微信支付（仅在启用真实支付时）
let wechatPay: WechatPay | null = null;

if (PAY_ENABLED && WECHAT_MCHID && WECHAT_MCH_KEY && WECHAT_PRIVATE_KEY_PATH) {
  try {
    const privateKey = fs.readFileSync(path.resolve(WECHAT_PRIVATE_KEY_PATH), 'utf8');
    wechatPay = new WechatPay({
      appid: process.env.WX_APPID || '',
      mchid: WECHAT_MCHID,
      publicKey: privateKey,
      privateKey: privateKey,
      serial: WECHAT_SERIAL_NO,
    });
    console.log('[WeChatPay] 微信支付服务已初始化');
  } catch (error) {
    console.error('[WeChatPay] 初始化失败:', error);
  }
}

/**
 * 判断是否启用真实支付
 */
export function isPayEnabled(): boolean {
  return PAY_ENABLED && wechatPay !== null;
}

/**
 * 创建Native支付订单（扫码支付）
 * @param orderId 商户订单号
 * @param amount 金额（分）
 * @param description 商品描述
 * @returns 支付二维码链接
 */
export async function createNativeOrder(
  orderId: string,
  amount: number,
  description: string
): Promise<{ codeUrl: string; orderId: string }> {
  if (!isPayEnabled()) {
    throw new Error('微信支付未启用或未正确配置');
  }

  const result = await wechatPay!.transactions_native({
    appid: process.env.WX_APPID,
    mchid: WECHAT_MCHID,
    description,
    out_trade_no: orderId,
    notify_url: WECHAT_NOTIFY_URL,
    amount: {
      total: amount,
      currency: 'CNY',
    },
  });

  return {
    codeUrl: result.code_url,
    orderId,
  };
}

/**
 * 查询订单状态
 * @param orderId 商户订单号
 */
export async function queryOrder(orderId: string): Promise<any> {
  if (!isPayEnabled()) {
    return { trade_state: 'SUCCESS' }; // 模拟
  }

  return await wechatPay!.transactions_query({
    appid: process.env.WX_APPID,
    mchid: WECHAT_MCHID,
    out_trade_no: orderId,
  });
}

/**
 * 验证支付回调签名
 * @param body 回调请求体
 * @param headers 请求头
 */
export async function verifyCallback(body: any, headers: any): Promise<boolean> {
  if (!isPayEnabled()) {
    return true; // 模拟模式跳过验证
  }

  try {
    const signature = headers['wechatpay-signature'];
    const timestamp = headers['wechatpay-timestamp'];
    const nonce = headers['wechatpay-nonce'];
    const serial = headers['wechatpay-serial'];

    return await wechatPay!.verify(signature, timestamp, nonce, JSON.stringify(body));
  } catch (error) {
    console.error('[WeChatPay] 验签失败:', error);
    return false;
  }
}

/**
 * 转账到用户微信零钱
 * @param orderId 商户订单号
 * @param openId 用户openid
 * @param amount 金额（分）
 * @param description 描述
 */
export async function transferToUser(
  orderId: string,
  openId: string,
  amount: number,
  description: string
): Promise<{ success: boolean; paymentId: string }> {
  if (!isPayEnabled()) {
    return { success: true, paymentId: orderId }; // 模拟
  }

  try {
    const result = await wechatPay!.transfers({
      appid: process.env.WX_APPID,
      mchid: WECHAT_MCHID,
      out_batch_no: orderId,
      batch_name: description,
      batch_amt: amount,
      total_num: 1,
      transfer_detail_list: [
        {
          out_detail_no: orderId,
          transfer_amt: amount,
          transfer_desc: description,
          user: {
            openid: openId,
          },
        },
      ],
    });

    return {
      success: result.result_code === 'SUCCESS',
      paymentId: result.payment_id || orderId,
    };
  } catch (error: any) {
    console.error('[WeChatPay] 转账失败:', error);
    return { success: false, paymentId: '' };
  }
}

export default {
  isPayEnabled,
  createNativeOrder,
  queryOrder,
  verifyCallback,
  transferToUser,
};
