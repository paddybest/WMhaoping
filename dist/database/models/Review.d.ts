export interface Review {
    id?: number;
    user_id: number;
    product_id: number;
    content: string;
    rating: number;
    tags: string[];
    image_url?: string;
    created_at?: Date;
}
export declare class ReviewModel {
    static create(review: Omit<Review, 'id' | 'created_at'>): Promise<Review>;
    static findByUserId(userId: number, limit?: number, offset?: number): Promise<Review[]>;
    static findByProductId(productId: number, limit?: number, offset?: number): Promise<Review[]>;
    static findById(id: number): Promise<Review | null>;
    static findByRating(rating: number): Promise<Review[]>;
    static findByTag(tag: string): Promise<Review[]>;
    static update(id: number, updates: Partial<Review>): Promise<Review | null>;
    static delete(id: number): Promise<boolean>;
    static countByUserId(userId: number): Promise<number>;
    static countByProductId(productId: number): Promise<number>;
    static getAverageRatingByProductId(productId: number): Promise<number>;
}
//# sourceMappingURL=Review.d.ts.map