import { pool } from '../connection';

export interface Review {
  id?: number;
  user_id: number | null;
  product_id: number;
  merchant_id?: number | null;
  content: string;
  rating: number;
  tags: string[];
  image_url?: string;
  screenshot_url?: string;
  verify_status?: 'pending' | 'approved' | 'rejected';
  verify_reason?: string;
  reward_amount?: number;
  created_at?: Date;
  verified_at?: Date;
}

export class ReviewModel {
  static async create(review: Omit<Review, 'id' | 'created_at'>): Promise<Review> {
    const result = await pool.query(
      'INSERT INTO reviews (user_id, product_id, merchant_id, content, rating, tags, image_url) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [review.user_id, review.product_id, review.merchant_id || null, review.content, review.rating, JSON.stringify(review.tags), review.image_url || null]
    );
    return { ...review, id: result.rows[0].id };
  }

  static async findByUserId(userId: number, limit: number = 20, offset: number = 0): Promise<Review[]> {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return result.rows as Review[];
  }

  static async findByProductId(productId: number, limit: number = 20, offset: number = 0): Promise<Review[]> {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [productId, limit, offset]
    );
    return result.rows as Review[];
  }

  static async findById(id: number): Promise<Review | null> {
    const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByRating(rating: number): Promise<Review[]> {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE rating = $1 ORDER BY created_at DESC',
      [rating]
    );
    return result.rows as Review[];
  }

  static async findByTag(tag: string): Promise<Review[]> {
    const result = await pool.query(
      'SELECT r.* FROM reviews r WHERE r.tags @> $1 ORDER BY r.created_at DESC',
      [JSON.stringify(tag)]
    );
    return result.rows as Review[];
  }

  static async update(id: number, updates: Partial<Review>): Promise<Review | null> {
    const fields = Object.keys(updates).map(key => {
      if (key === 'tags') return `${key} = $${Object.keys(updates).indexOf(key) + 1}`;
      return `${key} = $${Object.keys(updates).indexOf(key) + 1}`;
    }).join(', ');

    const values = Object.entries(updates).map(([key, value]) => {
      if (key === 'tags') return JSON.stringify(value);
      return value;
    });

    await pool.query(
      `UPDATE reviews SET ${fields} WHERE id = $${values.length + 1}`,
      [...values, id]
    );

    const result = await pool.query('SELECT * FROM reviews WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM reviews WHERE id = $1', [id]);
    return Boolean(result.rowCount || 0);
  }

  static async countByUserId(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  static async countByProductId(productId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM reviews WHERE product_id = $1',
      [productId]
    );
    return parseInt(result.rows[0].count);
  }

  static async getAverageRatingByProductId(productId: number): Promise<number> {
    const result = await pool.query(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = $1',
      [productId]
    );
    const avgRating = result.rows[0].avg_rating;
    return avgRating ? parseFloat(avgRating.toFixed(1)) : 0;
  }

  static async updateScreenshot(id: number, screenshotUrl: string): Promise<Review | null> {
    await pool.query(
      'UPDATE reviews SET screenshot_url = $1, verify_status = $2 WHERE id = $3',
      [screenshotUrl, 'pending', id]
    );
    return this.findById(id);
  }

  static async updateVerifyStatus(id: number, status: 'approved' | 'rejected', reason?: string, rewardAmount?: number): Promise<Review | null> {
    const sql = status === 'approved'
      ? 'UPDATE reviews SET verify_status = $1, reward_amount = $2, verified_at = NOW() WHERE id = $3'
      : 'UPDATE reviews SET verify_status = $1, verify_reason = $2 WHERE id = $3';

    const params = status === 'approved'
      ? [status, rewardAmount || 0.5, id]
      : [status, reason || '', id];

    await pool.query(sql, params);
    return this.findById(id);
  }
}
