"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const connection_1 = require("../connection");
class UserModel {
    static async create(user) {
        const [result] = await connection_1.pool.execute('INSERT INTO users (openid, nickname, avatar) VALUES (?, ?, ?)', [user.openid, user.nickname, user.avatar]);
        return { ...user, id: result.insertId };
    }
    static async findByOpenid(openid) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM users WHERE openid = ?', [openid]);
        return rows[0] || null;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async update(id, updates) {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        await connection_1.pool.execute(`UPDATE users SET ${fields} WHERE id = ?`, [...values, id]);
        const [rows] = await connection_1.pool.execute('SELECT * FROM users WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async findAll(limit = 50, offset = 0) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
        return rows;
    }
}
exports.UserModel = UserModel;
//# sourceMappingURL=User.js.map