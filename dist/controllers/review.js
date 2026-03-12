"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const ai_1 = require("../services/ai");
const Review_1 = require("../database/models/Review");
class ReviewController {
    static async generateReview(req, res, next) {
        try {
            const { productName, tags, rating } = req.body;
            const userId = req.user.id;
            if (!productName || !tags || !rating) {
                res.status(400).json({ error: 'Product name, tags and rating are required' });
                return;
            }
            if (rating < 1 || rating > 5) {
                res.status(400).json({ error: 'Rating must be between 1 and 5' });
                return;
            }
            const aiResult = await ai_1.AIService.generateReview({
                productName,
                tags,
                rating,
                userId
            });
            const review = await Review_1.ReviewModel.create({
                user_id: userId,
                product_id: 1,
                content: aiResult.content,
                rating,
                tags,
                image_url: aiResult.imageUrl
            });
            res.json({
                success: true,
                data: {
                    review,
                    ...aiResult
                }
            });
        }
        catch (error) {
            console.error('Generate review error:', error);
            next(error);
        }
    }
    static async getMyReviews(req, res, next) {
        try {
            const userId = req.user.id;
            const reviews = await Review_1.ReviewModel.findByUserId(userId);
            res.json({
                success: true,
                data: reviews
            });
        }
        catch (error) {
            console.error('Get my reviews error:', error);
            next(error);
        }
    }
}
exports.ReviewController = ReviewController;
//# sourceMappingURL=review.js.map