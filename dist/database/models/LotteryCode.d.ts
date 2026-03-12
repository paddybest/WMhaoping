export interface LotteryCode {
    id?: number;
    code: string;
    prize_id?: number;
    status: number;
    user_id?: number;
    created_at?: Date;
    claimed_at?: Date;
}
export declare class LotteryCodeModel {
    static create(code: Omit<LotteryCode, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryCode>;
    static findByCode(code: string): Promise<LotteryCode | null>;
    static findById(id: number): Promise<LotteryCode | null>;
    static findByUserId(userId: number): Promise<LotteryCode[]>;
    static findByPrizeId(prizeId: number): Promise<LotteryCode[]>;
    static updateStatus(code: string, status: number, userId?: number): Promise<boolean>;
    static delete(id: number): Promise<boolean>;
    static countByPrizeId(prizeId: number): Promise<number>;
    static countByStatus(status: number): Promise<number>;
    static getAvailableCodes(prizeId?: number): Promise<LotteryCode[]>;
    static generateUniqueCode(): Promise<string>;
    static batchCreate(codes: Array<{
        prize_id: number;
        user_id?: number;
    }>): Promise<LotteryCode[]>;
}
//# sourceMappingURL=LotteryCode.d.ts.map