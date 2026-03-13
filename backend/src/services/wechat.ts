import { randomUUID } from 'crypto';
import OSS = require('ali-oss');

/**
 * WeChat Mini Program Service
 * 处理小程序码的生成和管理
 */

const WX_APPID = process.env.WX_APPID;
const WX_APPSECRET = process.env.WX_APPSECRET;

const WX_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/token';
const WX_WXACODE_URL = 'https://api.weixin.qq.com/wxa/getwxacodeunlimit';

// 内存缓存 access_token（生产环境建议使用 Redis）
let cachedAccessToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取微信 access_token
 * 凭证有效期为 2 小时
 */
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // 检查缓存的 token 是否有效
  if (cachedAccessToken && now < tokenExpireTime) {
    return cachedAccessToken;
  }

  if (!WX_APPID || !WX_APPSECRET) {
    throw new Error('WeChat AppID or AppSecret not configured');
  }

  const url = `${WX_TOKEN_URL}?grant_type=client_credential&appid=${WX_APPID}&secret=${WX_APPSECRET}`;

  const response = await fetch(url);
  const data = await response.json() as any;

  if (data.errcode) {
    throw new Error(`Failed to get access_token: ${data.errmsg}`);
  }

  // 缓存 token，过期时间提前 5 分钟
  cachedAccessToken = data.access_token;
  tokenExpireTime = now + (data.expires_in - 300) * 1000;

  console.log('[WeChat] Access token obtained successfully');

  return cachedAccessToken!;
}

// 微信小程序页面路径配置
// 开发环境使用未发布的页面，生产环境使用已发布的页面
const DEFAULT_PAGE_DEV = 'pages/index/index';  // 开发版页面
const DEFAULT_PAGE_PROD = 'pages/index/index'; // 正式版页面

function getDefaultPage(): string {
  // 可以通过环境变量控制使用哪个页面
  // 设置 WX_PAGE_DEV_MODE=1 使用开发版页面
  if (process.env.WX_PAGE_DEV_MODE === '1') {
    return DEFAULT_PAGE_DEV;
  }
  return DEFAULT_PAGE_PROD;
}

// 获取小程序版本（开发版/体验版/正式版）
function getEnvVersion(): 'develop' | 'trial' | 'release' {
  if (process.env.WX_PAGE_DEV_MODE === '1') {
    return 'develop';  // 开发版
  }
  return 'release';   // 正式版
}

/**
 * 生成小程序码（无限量）
 *
 * @param scene - 场景参数，最大32个字符
 * @param page - 页面路径，默认根据环境配置
 * @param width - 二维码宽度，默认 430
 * @param isHyaline - 是否透明背景，默认 false
 * @returns 小程序码图片 Buffer
 */
async function generateMiniProgramCode(
  scene: string,
  page?: string,
  width: number = 430,
  isHyaline: boolean = false
): Promise<Buffer> {
  // 如果没有指定页面，使用默认页面
  const targetPage = page || getDefaultPage();

  const accessToken = await getAccessToken();

  const url = `${WX_WXACODE_URL}?access_token=${accessToken}`;

  const requestBody = {
    scene,
    page: targetPage,
    width,
    is_hyaline: isHyaline,
    env_version: getEnvVersion() // 根据环境变量决定版本
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  const contentType = response.headers.get('content-type');

  // 检查是否返回错误
  if (contentType?.includes('application/json')) {
    const errorData = await response.json() as any;
    if (errorData.errcode) {
      // 如果是 access_token 过期，清除缓存并重试
      if (errorData.errcode === 40001) {
        cachedAccessToken = null;
        tokenExpireTime = 0;
        return generateMiniProgramCode(scene, targetPage, width, isHyaline);
      }
      throw new Error(`WeChat API error: ${errorData.errmsg} (code: ${errorData.errcode})`);
    }
  }

  // 返回图片 Buffer
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// OSS客户端配置
const ossClient = new OSS({
  region: process.env.OSS_REGION || 'oss-cn-hangzhou',
  accessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET!,
  bucket: process.env.OSS_BUCKET || 'wmhaopingbao'
});

/**
 * 上传小程序码到 OSS
 *
 * @param merchantId - 商家ID
 * @param type - 类型 (merchant/product/category)
 * @param id - 商品/分类ID（可选）
 * @param buffer - 小程序码图片 Buffer
 * @returns OSS 上传结果
 */
async function uploadMiniProgramCodeToOSS(
  merchantId: number,
  type: string,
  id?: number,
  buffer?: Buffer
): Promise<{ url: string; name: string }> {
  const qrBuffer = buffer || Buffer.alloc(0);
  const fileName = `miniprogram-${type}/${merchantId}/${id || 'main'}/${Date.now()}-${randomUUID()}.png`;

  const result = await ossClient.put(fileName, qrBuffer);

  return {
    url: result.url,
    name: result.name
  };
}

/**
 * 生成商家小程序码
 *
 * @param merchantId - 商家ID
 * @returns 小程序码 URL
 */
export async function generateMerchantMiniProgramCode(merchantId: number): Promise<string> {
  try {
    console.log(`[WeChat] 生成商家小程序码，merchantId: ${merchantId}`);

    // scene 参数格式: m{merchantId}
    const scene = `m${merchantId}`;

    const buffer = await generateMiniProgramCode(scene);

    try {
      const { url } = await uploadMiniProgramCodeToOSS(merchantId, 'merchant', undefined, buffer);
      console.log(`[WeChat] 商家小程序码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      console.warn('[WeChat] OSS上传失败，使用data URL:', ossError.message);
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('[WeChat] 生成商家小程序码失败:', error);
    throw new Error('Failed to generate merchant mini program code');
  }
}

/**
 * 生成商品小程序码
 *
 * @param merchantId - 商家ID
 * @param productId - 商品ID
 * @returns 小程序码 URL
 */
export async function generateProductMiniProgramCode(
  merchantId: number,
  productId: number
): Promise<string> {
  try {
    console.log(`[WeChat] 生成商品小程序码，merchantId: ${merchantId}, productId: ${productId}`);

    // scene 参数格式: m{merchantId}_p{productId}
    const scene = `m${merchantId}_p${productId}`;

    const buffer = await generateMiniProgramCode(scene);

    try {
      const { url } = await uploadMiniProgramCodeToOSS(merchantId, 'product', productId, buffer);
      console.log(`[WeChat] 商品小程序码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      console.warn('[WeChat] OSS上传失败，使用data URL:', ossError.message);
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('[WeChat] 生成商品小程序码失败:', error);
    throw new Error('Failed to generate product mini program code');
  }
}

/**
 * 生成分类小程序码
 *
 * @param merchantId - 商家ID
 * @param categoryId - 分类ID
 * @returns 小程序码 URL
 */
export async function generateCategoryMiniProgramCode(
  merchantId: number,
  categoryId: number
): Promise<string> {
  try {
    console.log(`[WeChat] 生成分类小程序码，merchantId: ${merchantId}, categoryId: ${categoryId}`);

    // scene 参数格式: m{merchantId}_c{categoryId}
    const scene = `m${merchantId}_c${categoryId}`;

    const buffer = await generateMiniProgramCode(scene);

    try {
      const { url } = await uploadMiniProgramCodeToOSS(merchantId, 'category', categoryId, buffer);
      console.log(`[WeChat] 分类小程序码上传成功，URL: ${url}`);
      return url;
    } catch (ossError: any) {
      console.warn('[WeChat] OSS上传失败，使用data URL:', ossError.message);
      const base64 = buffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }
  } catch (error) {
    console.error('[WeChat] 生成分类小程序码失败:', error);
    throw new Error('Failed to generate category mini program code');
  }
}

/**
 * 清除 access_token 缓存（用于调试或强制刷新）
 */
export function clearAccessTokenCache(): void {
  cachedAccessToken = null;
  tokenExpireTime = 0;
  console.log('[WeChat] Access token cache cleared');
}
