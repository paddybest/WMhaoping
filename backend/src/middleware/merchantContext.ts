import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * 商家上下文中间件
 *
 * 功能：
 * 1. 防止商家访问其他商家的数据
 * 2. 验证请求中的merchantId参数是否与JWT中的merchant.id匹配
 * 3. 用于所有商家端API，确保数据隔离
 *
 * 使用示例：
 * router.patch('/products/:id',
 *   authenticateMerchant,    // 先进行JWT认证
 *   validateMerchantAccess,  // 再验证merchant权限
 *   updateProduct
 * );
 */

/**
 * 验证商家访问权限
 *
 * 从JWT中提取merchant.id，与请求中的merchantId参数进行对比
 * 如果不匹配，返回403 Forbidden
 *
 * @param req - Express请求对象（包含merchant信息）
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export function validateMerchantAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // 从JWT获取merchant_id
  const merchantId = req.merchant?.id;

  if (!merchantId) {
    res.status(401).json({
      success: false,
      error: '未授权：缺少商家认证信息'
    });
    return;
  }

  // 获取请求中的merchant_id
  // 可能来自：
  // 1. URL参数: req.query.merchantId
  // 2. 路径参数: req.params.merchantId
  // 3. 请求体: req.body.merchantId
  const targetMerchantId =
    req.query.merchantId as string | undefined ||
    req.params.merchantId as string | undefined ||
    req.body.merchantId as string | undefined;

  // 如果请求中包含merchant_id，验证权限
  if (targetMerchantId) {
    const requestedId = parseInt(targetMerchantId);

    if (requestedId !== merchantId) {
      // 记录潜在的安全问题
      console.warn(
        `⚠️  跨商家访问尝试被阻止: Merchant ${merchantId} 尝试访问 Merchant ${requestedId} 的数据`
      );

      res.status(403).json({
        success: false,
        error: '无权访问其他商家的数据',
        code: 'FORBIDDEN_CROSS_MERCHANT_ACCESS'
      });
      return;
    }
  }

  // 将merchant_id注入到请求中，供后续使用
  (req as any).merchantId = merchantId;

  next();
}

/**
 * 为小程序API验证merchantId
 *
 * 小程序端没有JWT token，merchantId来自URL参数
 * 此中间件仅验证merchantId参数存在
 *
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export function requireMerchantId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const merchantId = req.query.merchantId as string | undefined;

  if (!merchantId) {
    res.status(400).json({
      success: false,
      error: '缺少merchantId参数',
      code: 'MISSING_MERCHANT_ID'
    });
    return;
  }

  // 验证merchantId是数字
  const merchantIdNum = parseInt(merchantId);
  if (isNaN(merchantIdNum)) {
    res.status(400).json({
      success: false,
      error: 'merchantId参数无效',
      code: 'INVALID_MERCHANT_ID'
    });
    return;
  }

  // 将merchant_id注入到请求中
  (req as any).merchantId = merchantIdNum;

  next();
}

/**
 * 自动为商家端请求注入merchant_id
 *
 * 对于商家端API，自动从JWT中提取merchant_id
 * 无需客户端在请求中传递merchantId
 *
 * @param req - Express请求对象
 * @param res - Express响应对象
 * @param next - Express next函数
 */
export function injectMerchantId(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const merchantId = req.merchant?.id;

  if (!merchantId) {
    res.status(401).json({
      success: false,
      error: '未授权：缺少商家认证信息'
    });
    return;
  }

  // 将merchant_id注入到请求中，供服务层使用
  (req as any).merchantId = merchantId;

  next();
}
