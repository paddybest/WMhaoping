"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LotteryRecordModel = void 0;
const connection_1 = require("../connection");
class LotteryRecordModel {
    static async create(record) {
        const [result] = await connection_1.pool.execute('INSERT INTO lottery_records (user_id, prize_id, prize_name, reward_code, is_claimed) VALUES (?, ?, ?, ?, ?)', [record.user_id, record.prize_id, record.prize_name, record.reward_code, record.is_claimed]);
        return { ...record, id: result.insertId };
    }
    static async findByUserId(userId, limit = 50, offset = 0) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_records WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, limit, offset]);
        return rows;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_records WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async findByRewardCode(rewardCode) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_records WHERE reward_code = ?', [rewardCode]);
        return rows[0] || null;
    }
    static async findByPrizeId(prizeId) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_records WHERE prize_id = ? ORDER BY created_at DESC', [prizeId]);
        return rows;
    }
    static async updateClaimed(rewardCode) {
        const [result] = await connection_1.pool.execute('UPDATE lottery_records SET is_claimed = 1, claimed_at = NOW() WHERE reward_code = ?', [rewardCode]);
        return result.affectedRows > 0;
    }
    static async updatePrizeInfo(id, prizeId, prizeName) {
        const [result] = await connection_1.pool.execute('UPDATE lottery_records SET prize_id = ?, prize_name = ? WHERE id = ?', [prizeId, prizeName, id]);
        return result.affectedRows > 0;
    }
    static async countByUserId(userId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_records WHERE user_id = ?', [userId]);
        return rows[0].count;
    }
    static async countByUserIdAndDate(userId, startDate, endDate) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_records WHERE user_id = ? AND created_at >= ? AND created_at < ?', [userId, startDate, endDate]);
        return rows[0].count;
    }
    static async getTodayDrawCount(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return await this.countByUserIdAndDate(userId, today, tomorrow);
    }
    static async getClaimedCount(userId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_records WHERE user_id = ? AND is_claimed = 1', [userId]);
        return rows[0].count;
    }
    static async getUnclaimedCount(userId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_records WHERE user_id = ? AND is_claimed = 0', [userId]);
        return rows[0].count;
    }
    static async delete(id) {
        const [result] = await connection_1.pool.execute('DELETE FROM lottery_records WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    static async getUserStatistics(userId) {
        const totalDraws = await this.countByUserId(userId);
        const claimedPrizes = await this.getClaimedCount(userId);
        const unclaimedPrizes = await this.getUnclaimedCount(userId);
        return {
            totalDraws,
            claimedPrizes,
            unclaimedPrizes
        };
    }
}
exports.LotteryRecordModel = LotteryRecordModel;
//# sourceMappingURL=LotteryRecord.js.map