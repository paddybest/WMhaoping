export interface LotteryRecord {
    id?: number;
    user_id: number;
    prize_id?: number;
    prize_name?: string;
    reward_code?: string;
    is_claimed: boolean;
    created_at?: Date;
    claimed_at?: Date;
}
export declare class LotteryRecordModel {
    static create(record: Omit<LotteryRecord, 'id' | 'created_at' | 'claimed_at'>): Promise<LotteryRecord>;
    static findByUserId(userId: number, limit?: number, offset?: number): Promise<LotteryRecord[]>;
    static findById(id: number): Promise<LotteryRecord | null>;
    static findByRewardCode(rewardCode: string): Promise<LotteryRecord | null>;
    static findByPrizeId(prizeId: number): Promise<LotteryRecord[]>;
    static updateClaimed(rewardCode: string): Promise<boolean>;
    static updatePrizeInfo(id: number, prizeId: number, prizeName: string): Promise<boolean>;
    static countByUserId(userId: number): Promise<number>;
    static countByUserIdAndDate(userId: number, startDate: Date, endDate: Date): Promise<number>;
    static getTodayDrawCount(userId: number): Promise<number>;
    static getClaimedCount(userId: number): Promise<number>;
    static getUnclaimedCount(userId: number): Promise<number>;
    static delete(id: number): Promise<boolean>;
    static getUserStatistics(userId: number): Promise<{
        totalDraws: number;
        claimedPrizes: number;
        unclaimedPrizes: number;
    }>;
}
//# sourceMappingURL=LotteryRecord.d.ts.map