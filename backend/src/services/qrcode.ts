import QRCode from 'qrcode';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import OSS = require('ali-oss');
import { pool } from '../database/connection';
import { MerchantModel } from '../database/models/Merchant';

/**
 * QRCode Service
 * 处理商家二维码的生成、上传和管理
 */

/**
 * QR Code Anti-Forgery Configuration
 * 二维码防伪造配置
 */
const QR_CODE_SECRET = process.env.QR_CODE_SECRET || 'your-secret-key-change-in-production';

/**
 * Generate signature for merchant_id (and optional product_id) using HMAC-SHA256
 * 使用HMAC-SHA256生成签名
 *
 * @param merchantId - 商家ID
 * @param productId - 商品ID（可选）
 * @returns Base64编码的签名
 */
function generateQRCodeSignature(merchantId: number, productId?: number): string {
  const hmac = createHmac('sha256', QR_CODE_SECRET);
  const data = productId ? `${merchantId}:${productId}` : merchantId.toString();
  hmac.update(data);
  return hmac.digest('base64').replace(/[+/=]/g, '').substring(0, 16);
}

/**
 * Verify QR code signature
 * 验证二维码签名
 *
 * @param merchantId - 商家ID
 * @param signature - 签名
 * @param productId - 商品ID（可选）
 * @returns 是否有效
 */
function verifyQRCodeSignature(merchantId: number, signature: string, productId?: number): boolean {
  try {
    const expectedSignature = generateQRCodeSignature(merchantId, productId);
    return expectedSignature === signature;
  } catch {
    return false;
  }
}

// OSS客户端配置
const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_QR_BUCKET || 'haopingbao-qrcodes'
});

/**
 * 二维码生成选项
 */
interface QRCodeOptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * 生成商家专属二维码
 *
 * @param merchantId - 商家ID
 * @param options - 二维码生成选项
 * @returns 二维码图片Buffer
 */
async function generateMerchantQRCode(
  merchantId: number,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  // 生成防伪签名
  const signature = generateQRCodeSignature(merchantId);

  // 构建小程序URL Scheme（带签名）
  // 格式: pages/index/index?merchant_id={merchantId}&sig={signature}
  const qrUrl = `pages/index/index?merchant_id=${merchantId}&sig=${signature}`;

  // 默认选项
  const defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  // 生成二维码（Buffer格式）
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: finalOptions.width,
    margin: finalOptions.margin,
    color: {
      dark: finalOptions.color?.dark || '#000000',
      light: finalOptions.color?.light || '#FFFFFF'
    }
  });

  return qrBuffer;
}

/**
 * 上传二维码到OSS
 *
 * @param merchantId - 商家ID
 * @param qrBuffer - 二维码图片Buffer
 * @returns OSS上传结果
 */
async function uploadQRCodeToOSS(
  merchantId: number,
  qrBuffer: Buffer
): Promise<{ url: string; name: string }> {
  // 生成唯一的文件名
  const fileName = `merchant-qrcode/${merchantId}/${Date.now()}-${randomUUID()}.png`;

  // 上传到OSS
  const result = await ossClient.put(fileName, qrBuffer);

  return {
    url: result.url,
    name: result.name
  };
}

/**
 * 生成并上传商家二维码
 *
 * @param merchantId - 商家ID
 * @returns 二维码URL
 */
export async function generateAndUploadMerchantQRCode(
  merchantId: number
): Promise<string> {
  try {
    console.log(`[QRCode] 开始生成商家二维码，merchantId: ${merchantId}`);

    // 1. 生成二维码
    const qrBuffer = await generateMerchantQRCode(merchantId);

    // 2. 尝试上传到OSS，如果失败则使用data URL
    try {
      const { url } = await uploadQRCodeToOSS(merchantId, qrBuffer);
      console.log(`[QRCode] 二维码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      // OSS上传失败，使用data URL作为后备方案
      console.warn('[QRCode] OSS上传失败，使用data URL:', ossError.message);
      const base64 = qrBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return dataUrl;
    }
  } catch (error) {
    console.error('[QRCode] 生成或上传二维码失败:', error);
    throw new Error('Failed to generate or upload QR code');
  }
}

/**
 * 重新生成商家二维码（删除旧的，生成新的）
 *
 * @param merchantId - 商家ID
 * @returns 新二维码URL
 */
export async function regenerateMerchantQRCode(merchantId: number): Promise<string> {
  try {
    console.log(`[QRCode] 开始重新生成商家二维码，merchantId: ${merchantId}`);

    // 1. 获取当前二维码的OSS文件路径
    const merchant = await MerchantModel.findById(merchantId);
    if (!merchant) {
      throw new Error('Merchant not found');
    }

    // 2. 如果有旧二维码，删除它
    if (merchant.qrCodeUrl) {
      try {
        // 从URL中提取OSS文件名
        const urlParts = merchant.qrCodeUrl.split('/');
        const oldFileName = urlParts.slice(-2).join('/'); // 获取最后两段路径（merchant-qrcode/{merchantId}/xxx.png）

        await ossClient.delete(oldFileName);
        console.log(`[QRCode] 已删除旧二维码: ${oldFileName}`);
      } catch (error) {
        // 删除失败不影响重新生成，记录警告即可
        console.warn('[QRCode] 删除旧二维码失败，继续生成新的:', error);
      }
    }

    // 3. 生成并上传新二维码
    const newQRUrl = await generateAndUploadMerchantQRCode(merchantId);

    // 4. 更新数据库
    await pool.query(
      'UPDATE merchants SET qr_code_url = $1 WHERE id = $2',
      [newQRUrl, merchantId]
    );

    console.log(`[QRCode] 二维码重新生成成功，merchantId: ${merchantId}`);

    return newQRUrl;
  } catch (error) {
    console.error('[QRCode] 重新生成二维码失败:', error);
    throw new Error('Failed to regenerate QR code');
  }
}

/**
 * 商家注册时自动生成二维码
 *
 * @param merchantId - 新注册的商家ID
 */
export async function autoGenerateQRCodeOnRegistration(
  merchantId: number
): Promise<void> {
  try {
    console.log(`[QRCode] 商家注册自动生成二维码，merchantId: ${merchantId}`);

    // 生成并上传二维码
    const qrUrl = await generateAndUploadMerchantQRCode(merchantId);

    // 更新数据库
    await pool.query(
      'UPDATE merchants SET qr_code_url = $1 WHERE id = $2',
      [qrUrl, merchantId]
    );

    console.log(`[QRCode] 商家注册二维码生成完成，merchantId: ${merchantId}`);
  } catch (error) {
    console.error('[QRCode] 商家注册自动生成二维码失败:', error);
    // 注册失败不阻断流程，只记录错误
    // 商家可以在后台重新生成
  }
}

/**
 * 验证二维码URL是否有效
 *
 * @param qrCodeUrl - 二维码URL
 * @returns 是否有效
 */
export async function validateQRCodeUrl(qrCodeUrl: string): Promise<boolean> {
  if (!qrCodeUrl) {
    return false;
  }

  // 简单验证URL格式
  try {
    const url = new URL(qrCodeUrl);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * 批量生成二维码（管理员功能）
 *
 * @param merchantIds - 商家ID列表
 * @returns 生成结果数组
 */
export async function batchGenerateQRCodes(
  merchantIds: number[]
): Promise<{ merchantId: number; url: string; success: boolean }[]> {
  const results: { merchantId: number; url: string; success: boolean }[] = [];

  for (const merchantId of merchantIds) {
    try {
      const url = await generateAndUploadMerchantQRCode(merchantId);

      // 更新数据库
      await pool.query(
        'UPDATE merchants SET qr_code_url = $1 WHERE id = $2',
        [url, merchantId]
      );

      results.push({ merchantId, url, success: true });
    } catch (error) {
      console.error(`[QRCode] 批量生成失败，merchantId: ${merchantId}:`, error);
      results.push({ merchantId, url: '', success: false });
    }
  }

  return results;
}

/**
 * Export signature verification function for external use
 * 导出签名验证函数供外部使用
 */
export { verifyQRCodeSignature, generateQRCodeSignature };

/**
 * 生成分类专属二维码
 *
 * @param merchantId - 商家ID
 * @param categoryId - 分类ID（二级分类）
 * @param categoryName - 分类名称（用于URL参数）
 * @param options - 二维码生成选项
 * @returns 二维码图片Buffer
 */
async function generateCategoryQRCode(
  merchantId: number,
  categoryId: number,
  categoryName: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  // 生成防伪签名
  const signature = generateQRCodeSignature(merchantId);

  // 构建小程序URL（带分类ID）
  // 格式: pages/index/index?merchantId={merchantId}&categoryId={categoryId}&sig={signature}
  const qrUrl = `pages/index/index?merchantId=${merchantId}&categoryId=${categoryId}&sig=${signature}`;

  // 默认选项
  const defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  // 生成二维码（Buffer格式）
  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: finalOptions.width,
    margin: finalOptions.margin,
    color: {
      dark: finalOptions.color?.dark || '#000000',
      light: finalOptions.color?.light || '#FFFFFF'
    }
  });

  return qrBuffer;
}

/**
 * 上传分类二维码到OSS
 *
 * @param merchantId - 商家ID
 * @param categoryId - 分类ID
 * @param qrBuffer - 二维码图片Buffer
 * @returns OSS上传结果
 */
async function uploadCategoryQRCodeToOSS(
  merchantId: number,
  categoryId: number,
  qrBuffer: Buffer
): Promise<{ url: string; name: string }> {
  // 生成唯一的文件名
  const fileName = `category-qrcode/${merchantId}/${categoryId}/${Date.now()}-${randomUUID()}.png`;

  // 上传到OSS
  const result = await ossClient.put(fileName, qrBuffer);

  return {
    url: result.url,
    name: result.name
  };
}

/**
 * 生成并上传分类二维码
 *
 * @param merchantId - 商家ID
 * @param categoryId - 分类ID
 * @param categoryName - 分类名称
 * @returns 二维码URL
 */
export async function generateAndUploadCategoryQRCode(
  merchantId: number,
  categoryId: number,
  categoryName: string
): Promise<string> {
  try {
    console.log(`[QRCode] 开始生成分类二维码，merchantId: ${merchantId}, categoryId: ${categoryId}`);

    // 1. 生成二维码
    const qrBuffer = await generateCategoryQRCode(merchantId, categoryId, categoryName);

    // 2. 尝试上传到OSS，如果失败则使用data URL
    try {
      const { url } = await uploadCategoryQRCodeToOSS(merchantId, categoryId, qrBuffer);
      console.log(`[QRCode] 分类二维码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      console.warn('[QRCode] OSS上传失败，使用data URL:', ossError.message);
      const base64 = qrBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return dataUrl;
    }
  } catch (error) {
    console.error('[QRCode] 生成分类二维码失败:', error);
    throw new Error('Failed to generate category QR code');
  }
}

/**
 * 生成商品专属二维码
 * 二维码绑定商家+商品，扫码直接跳转到该商品的评价页面
 *
 * @param merchantId - 商家ID
 * @param productId - 商品ID
 * @param options - 二维码生成选项
 * @returns 二维码图片Buffer
 */
async function generateProductQRCode(
  merchantId: number,
  productId: number,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const signature = generateQRCodeSignature(merchantId, productId);

  const qrUrl = `pages/index/index?merchant_id=${merchantId}&product_id=${productId}&sig=${signature}`;

  const defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  };

  const finalOptions = { ...defaultOptions, ...options };

  const qrBuffer = await QRCode.toBuffer(qrUrl, {
    width: finalOptions.width,
    margin: finalOptions.margin,
    color: {
      dark: finalOptions.color?.dark || '#000000',
      light: finalOptions.color?.light || '#FFFFFF'
    }
  });

  return qrBuffer;
}

/**
 * 上传商品二维码到OSS
 *
 * @param merchantId - 商家ID
 * @param productId - 商品ID
 * @param qrBuffer - 二维码图片Buffer
 * @returns OSS上传结果
 */
async function uploadProductQRCodeToOSS(
  merchantId: number,
  productId: number,
  qrBuffer: Buffer
): Promise<{ url: string; name: string }> {
  const fileName = `product-qrcode/${merchantId}/${productId}/${Date.now()}-${randomUUID()}.png`;

  const result = await ossClient.put(fileName, qrBuffer);

  return {
    url: result.url,
    name: result.name
  };
}

/**
 * 生成并上传商品二维码
 *
 * @param merchantId - 商家ID
 * @param productId - 商品ID
 * @returns 二维码URL
 */
export async function generateAndUploadProductQRCode(
  merchantId: number,
  productId: number
): Promise<string> {
  try {
    console.log(`[QRCode] 开始生成商品二维码，merchantId: ${merchantId}, productId: ${productId}`);

    const qrBuffer = await generateProductQRCode(merchantId, productId);

    try {
      const { url } = await uploadProductQRCodeToOSS(merchantId, productId, qrBuffer);
      console.log(`[QRCode] 商品二维码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      console.warn('[QRCode] OSS上传失败，使用data URL:', ossError.message);
      const base64 = qrBuffer.toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;
      return dataUrl;
    }
  } catch (error) {
    console.error('[QRCode] 生成商品二维码失败:', error);
    throw new Error('Failed to generate product QR code');
  }
}

/**
 * 批量生成商品二维码
 *
 * @param merchantId - 商家ID
 * @param productIds - 商品ID列表
 * @returns 生成结果数组
 */
export async function batchGenerateProductQRCodes(
  merchantId: number,
  productIds: number[]
): Promise<{ productId: number; url: string; success: boolean }[]> {
  const results: { productId: number; url: string; success: boolean }[] = [];

  for (const productId of productIds) {
    try {
      const url = await generateAndUploadProductQRCode(merchantId, productId);
      results.push({ productId, url, success: true });
    } catch (error) {
      console.error(`[QRCode] 批量生成商品二维码失败，productId: ${productId}:`, error);
      results.push({ productId, url: '', success: false });
    }
  }

  return results;
}

