"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const auth_2 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/wechat-login', auth_1.AuthController.wechatLogin);
router.get('/me', auth_2.authenticate, (req, res) => {
    res.json({
        success: true,
        data: req.user
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map