"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const auth_1 = require("../services/auth");
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Missing or invalid authorization header' });
        return;
    }
    const token = authHeader.substring(7);
    const payload = auth_1.AuthService.verifyToken(token);
    if (!payload) {
        res.status(401).json({ error: 'Invalid token' });
        return;
    }
    req.user = payload;
    next();
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.js.map