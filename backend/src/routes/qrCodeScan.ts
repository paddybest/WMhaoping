import { Router } from 'express';
import { QrCodeScanController } from '../controllers/qrCodeScan';
import { authenticateMerchant } from '../middleware/auth';

const router = Router();

// 所有路由都需要JWT认证（商家端）
router.use(authenticateMerchant);

// ============================================
// 扫码记录端点（小程序调用）
// ============================================

/**
 * POST /api/merchant/scan/record
 * 记录扫码事件
 *
 * 认证：商家JWT
 * 请求体：{ merchantId, qrCodeUrl, userOpenid }
 */
router.post('/record', QrCodeScanController.recordScan);

// ============================================
// 统计查询端点（商家端调用）
// ============================================

/**
 * GET /api/merchant/scan/statistics
 * 获取商家扫码统计
 *
 * 认证：商家JWT
 * 查询参数：
 *   - startDate: 开始日期（可选）
 *   - endDate: 结束日期（可选）
 *   - period: 时间范围（today/week/month）
 */
router.get('/statistics', QrCodeScanController.getScanStatistics);

/**
 * GET /api/merchant/scan/trends
 * 获取扫码趋势数据
 *
 * 认证：商家JWT
 * 查询参数：
 *   - days: 天数（默认7）
 */
router.get('/trends', QrCodeScanController.getScanTrends);

/**
 * GET /api/merchant/scan/hot-hours
 * 获取热门扫描时间段
 *
 * 认证：商家JWT
 */
router.get('/hot-hours', QrCodeScanController.getHotScanHours);

// ============================================
// 历史查询端点
// ============================================

/**
 * GET /api/merchant/scan/history
 * 获取扫码历史记录
 *
 * 认证：商家JWT
 * 查询参数：
 *   - page: 页码（默认1）
 *   - limit: 每页数量（默认50）
 */
router.get('/history', QrCodeScanController.getScanHistory);

// ============================================
// 数据管理端点
// ============================================

/**
 * GET /api/merchant/scan/export
 * 导出扫码统计数据（CSV）
 *
 * 认证：商家JWT
 * 查询参数：
 *   - startDate: 开始日期
 *   - endDate: 结束日期
 *   - format: 格式（默认csv）
 */
router.get('/export', QrCodeScanController.exportScanData);

/**
 * DELETE /api/merchant/scan/cleanup
 * 清理旧扫码数据
 *
 * 认证：商家JWT
 * 请求体：{ days: 天数（默认30）}
 */
router.delete('/cleanup', QrCodeScanController.cleanupOldScans);

export default router;
