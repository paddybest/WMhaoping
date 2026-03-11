import { Response } from 'express';
import { QrCodeScanModel } from '../database/models/QrCodeScan';
import { AuthRequest } from '../middleware/auth';

/**
 * 扫码统计API控制器
 *
 * 功能：
 * - 记录扫码事件
 * - 获取商家的扫码统计
 * - 支持时间范围查询
 * - 支持分页查询
 *
 * 支持任务17：扫码统计数据
 */

export class QrCodeScanController {
  /**
   * 记录扫码事件（小程序端调用）
   *
   * POST /api/miniprogram/scan/record
   * Body: { merchantId, qrCodeUrl, userOpenid }
   */
  static async recordScan(req: any, res: Response): Promise<void> {
    try {
      const { merchantId, qrCodeUrl, userOpenid } = req.body;

      // 验证必填参数
      if (!merchantId || !qrCodeUrl || !userOpenid) {
        res.status(400).json({
          success: false,
          error: '缺少必需参数',
          code: 'MISSING_REQUIRED_PARAMS'
        });
        return;
      }

      const merchantIdNum = parseInt(merchantId);
      if (isNaN(merchantIdNum)) {
        res.status(400).json({
          success: false,
          error: 'merchantId参数无效',
          code: 'INVALID_MERCHANT_ID'
        });
        return;
      }

      // 获取用户IP地址
      const ip = req.ip || req.socket.remoteAddress || req.connection.remoteAddress || '0.0.0.0';

      // 检查用户今天是否已扫描过该二维码（防重复统计）
      const hasScannedToday = await QrCodeScanModel.hasScannedToday(
        merchantIdNum,
        userOpenid,
        qrCodeUrl
      );

      // 记录扫码事件
      const scan = await QrCodeScanModel.create({
        merchant_id: merchantIdNum,
        user_openid: userOpenid,
        qr_code_url: qrCodeUrl,
        scan_time: new Date(),
        ip_address: ip
      });

      // 更新每日汇总统计
      await QrCodeScanModel.updateDailyStatistics(merchantIdNum);

      res.json({
        success: true,
        data: {
          scanId: scan.id,
          message: hasScannedToday ? '扫码已记录（今日已扫描过）' : '扫码成功记录',
          isNewScan: !hasScannedToday
        }
      });
    } catch (error) {
      console.error('记录扫码事件失败:', error);
      res.status(500).json({
        success: false,
        error: '记录扫码事件失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 获取商家扫码统计（商家端）
   *
   * GET /api/merchant/scan/statistics
   * Query: ?startDate, ?endDate, ?period
   */
  static async getScanStatistics(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;

      if (!merchantId) {
        res.status(401).json({
          success: false,
          error: '未授权：缺少商家认证信息',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const { startDate, endDate, period } = req.query as any;

      // 根据period参数计算日期范围
      let start: string;
      let end: string;

      if (period) {
        const now = new Date();
        switch (period) {
          case 'today':
            start = now.toISOString().split('T')[0];
            end = start;
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            start = weekAgo.toISOString().split('T')[0];
            end = start;
            break;
          case 'month':
            const monthAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            start = monthAgoDate.toISOString().split('T')[0];
            end = start;
            break;
          default:
            // 默认返回最近30天
            const defaultMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            start = defaultMonthAgo.toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
            break;
        }
      } else {
        start = startDate;
        end = endDate;
      }

      if (!start || !end) {
        // 如果没有指定日期范围，默认使用最近30天
        const now = new Date();
        const monthAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start = monthAgoDate.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
      }

      // 获取统计数据
      const statistics = await QrCodeScanModel.getScanStatistics(
        merchantId,
        start,
        end
      );

      // 获取总览数据
      const totalScans = await QrCodeScanModel.getTotalScans(merchantId);
      const uniqueUsers = await QrCodeScanModel.getUniqueUsersCount(merchantId);
      const todayStats = await QrCodeScanModel.getTodayStats(merchantId);

      res.json({
        success: true,
        data: {
          period: { start, end },
          summary: {
            totalScans,
            uniqueUsers,
            todayTotal: todayStats.totalScans,
            todayUnique: todayStats.uniqueUsers
          },
          dailyStats: statistics
        }
      });
    } catch (error) {
      console.error('获取扫码统计失败:', error);
      res.status(500).json({
        success: false,
        error: '获取扫码统计失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 获取扫码趋势数据（按小时）
   *
   * GET /api/merchant/scan/trends
   * Query: ?days (默认7天）
   */
  static async getScanTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;
      const days = parseInt(req.query.days as string) || 7;

      if (isNaN(days) || days < 1 || days > 30) {
        res.status(400).json({
          success: false,
          error: 'days参数无效，必须在1-30之间',
          code: 'INVALID_DAYS_PARAM'
        });
        return;
      }

      const hourlyData = await QrCodeScanModel.getScanByHour(merchantId);

      res.json({
        success: true,
        data: {
          period: `最近${days}天`,
          hourlyData: hourlyData
        }
      });
    } catch (error) {
      console.error('获取扫码趋势失败:', error);
      res.status(500).json({
        success: false,
        error: '获取扫码趋势失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 获取扫码历史记录（分页）
   *
   * GET /api/merchant/scan/history
   * Query: ?page (默认1), ?limit (默认50）
   */
  static async getScanHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (isNaN(page) || page < 1) {
        res.status(400).json({
          success: false,
          error: 'page参数无效',
          code: 'INVALID_PAGE_PARAM'
        });
        return;
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({
          success: false,
          error: 'limit参数无效，必须在1-100之间',
          code: 'INVALID_LIMIT_PARAM'
        });
        return;
      }

      const offset = (page - 1) * limit;

      const scans = await QrCodeScanModel.getScanHistory(merchantId, limit, offset);
      const totalScans = await QrCodeScanModel.getTotalScans(merchantId);

      res.json({
        success: true,
        data: {
          page,
          limit,
          total: totalScans,
          scans
        }
      });
    } catch (error) {
      console.error('获取扫码历史失败:', error);
      res.status(500).json({
        success: false,
        error: '获取扫码历史失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 获取热门扫描时间段（按小时统计）
   *
   * GET /api/merchant/scan/hot-hours
   */
  static async getHotScanHours(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;

      const hourlyData = await QrCodeScanModel.getScanByHour(merchantId);

      // 找出最热门的3个小时段
      const topHours = hourlyData
        .sort((a, b) => b.scan_count - a.scan_count)
        .slice(0, 3)
        .map(item => ({
          hour: item.hour,
          scanCount: item.scan_count
        }));

      res.json({
        success: true,
        data: {
          merchantId,
          hotHours: topHours
        }
      });
    } catch (error) {
      console.error('获取热门时段失败:', error);
      res.status(500).json({
        success: false,
        error: '获取热门时段失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 删除旧扫码数据（数据清理）
   *
   * DELETE /api/merchant/scan/cleanup
   * Body: { days (默认30天，删除30天之前的数据）}
   */
  static async cleanupOldScans(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;
      const days = parseInt(req.body.days as string) || 30;

      if (isNaN(days) || days < 1 || days > 90) {
        res.status(400).json({
          success: false,
          error: 'days参数无效，必须在1-90之间',
          code: 'INVALID_DAYS_PARAM'
        });
        return;
      }

      const beforeDate = new Date();
      beforeDate.setDate(beforeDate.getDate() - days);

      const deletedCount = await QrCodeScanModel.deleteOldScans(
        merchantId,
        beforeDate.toISOString().split('T')[0]
      );

      res.json({
        success: true,
        data: {
          message: `已删除${deletedCount}条${days}天之前的扫码记录`,
          deletedCount,
          deletedBefore: beforeDate.toISOString().split('T')[0]
        }
      });
    } catch (error) {
      console.error('清理旧数据失败:', error);
      res.status(500).json({
        success: false,
        error: '清理旧数据失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }

  /**
   * 导出扫码统计数据（CSV）
   *
   * GET /api/merchant/scan/export
   * Query: ?startDate, ?endDate, ?format (默认csv）
   */
  static async exportScanData(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = (req as any).merchant?.id;
      const { startDate, endDate, format = 'csv' } = req.query as any;

      // 获取统计数据
      const statistics = await QrCodeScanModel.getScanStatistics(
        merchantId,
        startDate as string,
        endDate as string
      );

      // 设置响应头
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="scan_stats_${startDate}_to_${endDate}.csv"`);
      }

      // 转换为CSV格式
      const csvHeader = '日期,总扫码次数,独立用户数\n';
      const csvRows = statistics.map(stat =>
        `${stat.date},${stat.total_scans},${stat.unique_users}`
      ).join('\n');
      const csvContent = csvHeader + '\n' + csvRows;

      res.send(csvContent);
    } catch (error) {
      console.error('导出数据失败:', error);
      res.status(500).json({
        success: false,
        error: '导出数据失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }
}
