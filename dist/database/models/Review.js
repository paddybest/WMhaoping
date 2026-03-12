"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewModel = void 0;
const connection_1 = require("../connection");
class ReviewModel {
    static async create(review) {
        const [result] = await connection_1.pool.execute('INSERT INTO reviews (user_id, product_id, content, rating, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)', [review.user_id, review.product_id, review.content, review.rating, JSON.stringify(review.tags), review.image_url]);
        return { ...review, id: result.insertId };
    }
    static async findByUserId(userId, limit = 20, offset = 0) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
        return rows;
    }
    static async findByProductId(productId, limit = 20, offset = 0) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [productId, limit, offset]);
        return rows;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async findByRating(rating) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM reviews WHERE rating = ? ORDER BY created_at DESC', [rating]);
        return rows;
    }
    static async findByTag(tag) {
        const [rows] = await connection_1.pool.execute('SELECT r.* FROM reviews r WHERE JSON_CONTAINS(r.tags, ?) ORDER BY r.created_at DESC', [JSON.stringify(tag)]);
        return rows;
    }
    static async update(id, updates) {
        const fields = Object.keys(updates).map(key => {
            if (key === 'tags')
                return `${key} = ?`;
            return `${key} = ?`;
        }).join(', ');
        const values = Object.entries(updates).map(([key, value]) => {
            if (key === 'tags')
                return JSON.stringify(value);
            return value;
        });
        await connection_1.pool.execute(`UPDATE reviews SET ${fields} WHERE id = ?`, [...values, id]);
        const [rows] = await connection_1.pool.execute('SELECT * FROM reviews WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async delete(id) {
        const [result] = await connection_1.pool.execute('DELETE FROM reviews WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    static async countByUserId(userId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM reviews WHERE user_id = ?', [userId]);
        return rows[0].count;
    }
    static async countByProductId(productId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM reviews WHERE product_id = ?', [productId]);
        return rows[0].count;
    }
    static async getAverageRatingByProductId(productId) {
        const [rows] = await connection_1.pool.execute('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?', [productId]);
        const avgRating = rows[0].avg_rating;
        return avgRating ? parseFloat(avgRating.toFixed(1)) : 0;
    }
}
exports.ReviewModel = ReviewModel;
//# sourceMappingURL=Review.js.map