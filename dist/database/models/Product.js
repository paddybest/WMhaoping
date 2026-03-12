"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductModel = void 0;
const connection_1 = require("../connection");
class ProductModel {
    static async findAll() {
        const [rows] = await connection_1.pool.execute('SELECT * FROM products ORDER BY created_at DESC');
        return rows;
    }
    static async findById(id) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async create(product) {
        const [result] = await connection_1.pool.execute('INSERT INTO products (name, tags) VALUES (?, ?)', [product.name, JSON.stringify(product.tags)]);
        return { ...product, id: result.insertId };
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
        await connection_1.pool.execute(`UPDATE products SET ${fields} WHERE id = ?`, [...values, id]);
        const [rows] = await connection_1.pool.execute('SELECT * FROM products WHERE id = ?', [id]);
        return rows[0] || null;
    }
    static async delete(id) {
        const [result] = await connection_1.pool.execute('DELETE FROM products WHERE id = ?', [id]);
        return result.affectedRows > 0;
    }
    static async findByTag(tag) {
        const [rows] = await connection_1.pool.execute('SELECT * FROM products WHERE JSON_CONTAINS(tags, ?) ORDER BY created_at DESC', [JSON.stringify(tag)]);
        return rows;
    }
}
exports.ProductModel = ProductModel;
//# sourceMappingURL=Product.js.map