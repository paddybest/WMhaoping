"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get('/test', (req, res) => {
    res.json({ message: 'Upload API working' });
});
exports.default = router;
//# sourceMappingURL=upload.js.map