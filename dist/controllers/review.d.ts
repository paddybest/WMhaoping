import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ReviewController {
    static generateReview(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
    static getMyReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
}
//# sourceMappingURL=review.d.ts.map