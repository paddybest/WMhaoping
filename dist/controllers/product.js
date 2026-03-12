"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const Product_1 = require("../database/models/Product");
class ProductController {
    static async getProducts(req, res) {
        try {
            const products = await Product_1.ProductModel.findAll();
            res.json({
                success: true,
                data: products,
                total: products.length
            });
        }
        catch (error) {
            console.error('Get products error:', error);
            res.status(500).json({ error: 'Failed to get products' });
        }
    }
    static async getProduct(req, res) {
        try {
            const { id } = req.params;
            const productId = parseInt(id);
            if (isNaN(productId)) {
                res.status(400).json({ error: 'Invalid product ID' });
                return;
            }
            const product = await Product_1.ProductModel.findById(productId);
            if (!product) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            res.json({
                success: true,
                data: product
            });
        }
        catch (error) {
            console.error('Get product error:', error);
            res.status(500).json({ error: 'Failed to get product' });
        }
    }
    static async createProduct(req, res) {
        try {
            const { name, tags } = req.body;
            if (!name || typeof name !== 'string') {
                res.status(400).json({ error: 'Product name is required and must be a string' });
                return;
            }
            if (!tags || !Array.isArray(tags)) {
                res.status(400).json({ error: 'Product tags are required and must be an array' });
                return;
            }
            for (const tag of tags) {
                if (typeof tag !== 'string') {
                    res.status(400).json({ error: 'All tags must be strings' });
                    return;
                }
            }
            const productData = {
                name,
                tags
            };
            const product = await Product_1.ProductModel.create(productData);
            res.status(201).json({
                success: true,
                data: product,
                message: 'Product created successfully'
            });
        }
        catch (error) {
            console.error('Create product error:', error);
            res.status(500).json({ error: 'Failed to create product' });
        }
    }
    static async updateProduct(req, res) {
        try {
            const { id } = req.params;
            const productId = parseInt(id);
            if (isNaN(productId)) {
                res.status(400).json({ error: 'Invalid product ID' });
                return;
            }
            const existingProduct = await Product_1.ProductModel.findById(productId);
            if (!existingProduct) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            const allowedUpdates = ['name', 'tags'];
            const updates = {};
            for (const key of allowedUpdates) {
                if (req.body[key] !== undefined) {
                    updates[key] = req.body[key];
                }
            }
            if (updates.name && typeof updates.name !== 'string') {
                res.status(400).json({ error: 'Product name must be a string' });
                return;
            }
            if (updates.tags && !Array.isArray(updates.tags)) {
                res.status(400).json({ error: 'Product tags must be an array' });
                return;
            }
            if (updates.tags) {
                for (const tag of updates.tags) {
                    if (typeof tag !== 'string') {
                        res.status(400).json({ error: 'All tags must be strings' });
                        return;
                    }
                }
            }
            if (Object.keys(updates).length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }
            const updatedProduct = await Product_1.ProductModel.update(productId, updates);
            if (!updatedProduct) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            res.json({
                success: true,
                data: updatedProduct,
                message: 'Product updated successfully'
            });
        }
        catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ error: 'Failed to update product' });
        }
    }
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const productId = parseInt(id);
            if (isNaN(productId)) {
                res.status(400).json({ error: 'Invalid product ID' });
                return;
            }
            const existingProduct = await Product_1.ProductModel.findById(productId);
            if (!existingProduct) {
                res.status(404).json({ error: 'Product not found' });
                return;
            }
            const deleted = await Product_1.ProductModel.delete(productId);
            if (!deleted) {
                res.status(500).json({ error: 'Failed to delete product' });
                return;
            }
            res.json({
                success: true,
                message: 'Product deleted successfully'
            });
        }
        catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ error: 'Failed to delete product' });
        }
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=product.js.map