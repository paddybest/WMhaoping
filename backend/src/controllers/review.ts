import { AIService } from '../services/ai';
import { ReviewModel } from '../database/models/Review';
import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../database/connection';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/screenshots');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'screenshot-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export class ReviewController {
  static uploadMiddleware = upload.single('screenshot');

  static async generateReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId, productName, tags, rating, merchantId, requestId } = req.body;
      const userId = req.user?.id;

      if (!tags || tags.length === 0) {
        res.status(400).json({ error: 'Tags are required' });
        return;
      }

      if (!rating) {
        res.status(400).json({ error: 'Rating is required' });
        return;
      }

      if (rating < 1 || rating > 5) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
      }

      const aiResult = await AIService.generateReview({
        productId: productId ? parseInt(productId) : undefined,
        productName: productName || '商品',
        tags,
        rating,
        userId: userId || 0,
        requestId: requestId || undefined
      });

      const mainImageUrl = aiResult.imageUrls && aiResult.imageUrls.length > 0 ? aiResult.imageUrls[0] : undefined;
      const review = await ReviewModel.create({
        user_id: userId || null,
        product_id: productId || 1,
        merchant_id: merchantId || null,
        content: aiResult.content,
        rating,
        tags,
        image_url: mainImageUrl
      });

      res.json({
        success: true,
        data: {
          review,
          ...aiResult
        }
      });
    } catch (error) {
      console.error('Generate review error:', error);
      next(error);
    }
  }

  static async getMyReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const reviews = await ReviewModel.findByUserId(userId);

      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Get my reviews error:', error);
      next(error);
    }
  }

  static async getMerchantReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchantId = req.merchant!.id;
      const { productId, rating, limit = 20, offset = 0 } = req.query;

      let sql = `
        SELECT r.*, p.name as product_name, u.nickname as user_nickname
        FROM reviews r
        JOIN product_items p ON r.product_id = p.id
        JOIN merchants m ON p.merchant_id = m.id
        LEFT JOIN users u ON r.user_id = u.id
        WHERE m.id = ?
      `;
      const params: any[] = [merchantId];

      if (productId) {
        sql += ' AND r.product_id = ?';
        params.push(parseInt(productId as string));
      }
      if (rating) {
        sql += ' AND r.rating = ?';
        params.push(parseInt(rating as string));
      }

      sql += ' ORDER BY r.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
      // pool.query() 使用预处理语句，PostgreSQL 参数为数字不需要转换
      params.push(limit, offset);

      const result = await pool.query(sql, params);
      const rows = result.rows;

      let countSql = `
        SELECT COUNT(*) as total
        FROM reviews r
        JOIN product_items p ON r.product_id = p.id
        WHERE p.merchant_id = ?
      `;
      const countParams: any[] = [merchantId];
      if (productId) {
        countSql += ' AND r.product_id = ?';
        countParams.push(parseInt(productId as string));
      }
      if (rating) {
        countSql += ' AND r.rating = ?';
        countParams.push(parseInt(rating as string));
      }
      const countResult = await pool.query(countSql, countParams);

      res.json({
        success: true,
        data: rows,
        total: countResult.rows[0]?.total || 0
      });
    } catch (error) {
      console.error('Get merchant reviews error:', error);
      next(error);
    }
  }

  static async uploadScreenshot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ code: 1, message: '请上传截图文件' });
        return;
      }

      const { reviewId } = req.body;
      const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;

      if (reviewId) {
        await ReviewModel.updateScreenshot(parseInt(reviewId), screenshotUrl);
      }

      res.json({
        code: 0,
        message: '上传成功',
        data: { url: screenshotUrl }
      });
    } catch (error) {
      console.error('Upload screenshot error:', error);
      res.status(500).json({ code: 1, message: '上传失败' });
    }
  }

  static async verifyScreenshot(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { screenshotUrl, reviewId, expectedText } = req.body;

      if (!screenshotUrl) {
        res.status(400).json({ code: 1, message: '缺少截图URL' });
        return;
      }

      const verifyResult = await ReviewController.performOCRVerify(screenshotUrl, expectedText);

      if (verifyResult.success) {
        if (reviewId) {
          await ReviewModel.updateVerifyStatus(parseInt(reviewId), 'approved', undefined, 0.5);
        }
        
        res.json({
          code: 0,
          data: {
            success: true,
            rewardAmount: 0.5
          }
        });
      } else {
        if (reviewId) {
          await ReviewModel.updateVerifyStatus(parseInt(reviewId), 'rejected', verifyResult.reason);
        }
        
        res.json({
          code: 0,
          data: {
            success: false,
            reason: verifyResult.reason
          }
        });
      }
    } catch (error) {
      console.error('Verify screenshot error:', error);
      res.status(500).json({ code: 1, message: '审核失败' });
    }
  }

  static async performOCRVerify(screenshotUrl: string, expectedText?: string): Promise<{ success: boolean; reason?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const random = Math.random();
        
        if (random > 0.3) {
          resolve({ success: true });
        } else {
          const reasons = [
            '截图内容不清晰，请重新上传',
            '未检测到评价内容，请确保截图包含完整评价',
            '评价内容与生成内容不符',
            '截图显示评价未成功提交'
          ];
          resolve({ 
            success: false, 
            reason: reasons[Math.floor(Math.random() * reasons.length)]
          });
        }
      }, 1500);
    });
  }
}