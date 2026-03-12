"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const product_1 = require("../controllers/product");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', product_1.ProductController.getProducts);
router.get('/:id', product_1.ProductController.getProduct);
router.post('/', auth_1.authenticate, product_1.ProductController.createProduct);
router.put('/:id', auth_1.authenticate, product_1.ProductController.updateProduct);
router.delete('/:id', auth_1.authenticate, product_1.ProductController.deleteProduct);
exports.default = router;
//# sourceMappingURL=product.js.map