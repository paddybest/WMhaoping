"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LotteryCodeModel = void 0;
const connection_1 = require("../connection");
class LotteryCodeModel {
    static async create(code) {
        const [result] = await connection_1.pool.execute('INSERT INTO lottery_codes (code, prize_id, status, user_id) VALUES (?, ?, ?, ?)', [code.code, code.prize_id, code.status, code.user_id]);
        return { ...code, id: result.insertId };
    }
    static async findByCode(code) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_codes WHERE code = ?', [code]);
        return rows[0] || null;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_codes WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async findByUserId(userId) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_codes WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        return rows;
    }
    static async findByPrizeId(prizeId) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM lottery_codes WHERE prize_id = ? ORDER BY created_at DESC', [prizeId]);
        return rows;
    }
    static async updateStatus(code, status, userId) {
        if (status === 1 && userId) {
            const [result] = await connection_1.pool.execute('UPDATE lottery_codes SET status = ?, user_id = ?, claimed_at = NOW() WHERE code = ?', [status, userId, code]);
            return result.affectedRows > 0;
        }
        else {
            const [result] = await connection_1.pool.execute('UPDATE lottery_codes SET status = ? WHERE code = ?', [status, code]);
            return result.affectedRows > 0;
        }
    }
    static async delete(id) {
        const [result] = await connection_1.pool.execute('DELETE FROM lottery_codes WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    static async countByPrizeId(prizeId) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_codes WHERE prize_id = ?', [prizeId]);
        return rows[0].count;
    }
    static async countByStatus(status) {
        const [rows] = await connection_1.pool.execute('SELECT COUNT(*) as count FROM lottery_codes WHERE status = ?', [status]);
        return rows[0].count;
    }
    static async getAvailableCodes(prizeId) {
        let query = 'SELECT * FROM lottery_codes WHERE status = 0';
        let params = [];
        if (prizeId) {
            query += ' AND prize_id = ?';
            params.push(prizeId);
        }
        query += ' ORDER BY created_at ASC';
        const [rows] = await connection_1.pool.execute(query, params);
        return rows;
    }
    static async generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code;
        let exists;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const existingCode = await this.findByCode(code);
            exists = existingCode !== null;
        } while (exists);
        return code;
    }
    static async batchCreate(codes) {
        const createdCodes = [];
        for (const codeData of codes) {
            const code = await this.generateUniqueCode();
            const created = await this.create({
                code,
                prize_id: codeData.prize_id,
                status: 0,
                user_id: codeData.user_id
            });
            createdCodes.push(created);
        }
        return createdCodes;
    }
}
exports.LotteryCodeModel = LotteryCodeModel;
//# sourceMappingURL=LotteryCode.js.map