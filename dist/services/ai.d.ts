export interface ReviewRequest {
    productName: string;
    tags: string[];
    rating: number;
    userId: number;
}
export interface ReviewResponse {
    content: string;
    imageUrl: string;
}
export declare class AIService {
    private static readonly API_URL;
    private static readonly MODEL;
    static generateReview(request: ReviewRequest): Promise<ReviewResponse>;
    static buildPrompt(request: ReviewRequest): string;
    private static getRandomImageUrl;
    static getFallbackReview(request: ReviewRequest): ReviewResponse;
}
//# sourceMappingURL=ai.d.ts.map