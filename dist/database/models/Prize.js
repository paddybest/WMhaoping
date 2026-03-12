"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrizeModel = void 0;
const connection_1 = require("../connection");
class PrizeModel {
    static async findAll() {
        const [rows] = await connection_1.pool.execute('SELECT * FROM prizes ORDER BY created_at DESC');
        return rows;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM prizes WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async create(prize) {
        const [result] = await connection_1.pool.execute('INSERT INTO prizes (name, description, probability, stock, image_url) VALUES (?, ?, ?, ?, ?)', [prize.name, prize.description, prize.probability, prize.stock, prize.image_url]);
        return { ...prize, id: result.insertId };
    }
    static async update(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await connection_1.pool.execute(`UPDATE prizes SET ${fields} WHERE id = ?`, [...values, id]);
        const [rows] = await connection_1.pool.execute('SELECT * FROM prizes WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async delete(id) {
        const [result] = await connection_1.pool.execute('DELETE FROM prizes WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    static async updateStock(id, stockChange) {
        const [rows] = await connection_1.pool.execute('UPDATE prizes SET stock = stock + ? WHERE id = ?', [stockChange, id]);
        if (rows.affectedRows === 0) {
            return null;
        }
        const [prizeRows] = await connection_1.pool.execute('SELECT * FROM prizes WHERE id = ?', [id]);
        return prizeRows[0] || null;
    }
    static async getAvailablePrizes() {
        const [rows] = await connection_1.pool.execute('SELECT * FROM prizes WHERE stock > 0 ORDER BY created_at DESC');
        return rows;
    }
    static async getTotalProbability() {
        const [rows] = await connection_1.pool.execute('SELECT SUM(probability) as total FROM prizes WHERE stock > 0');
        const total = rows[0].total;
        return total || 0;
    }
}
exports.PrizeModel = PrizeModel;
//# sourceMappingURL=Prize.js.map