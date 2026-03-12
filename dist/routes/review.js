"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const review_1 = require("../controllers/review");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/generate', auth_1.authenticate, review_1.ReviewController.generateReview);
router.get('/my-reviews', auth_1.authenticate, review_1.ReviewController.getMyReviews);
exports.default = router;
//# sourceMappingURL=review.js.map