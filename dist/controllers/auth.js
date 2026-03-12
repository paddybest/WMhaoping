"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_1 = require("../services/auth");
class AuthController {
    static async wechatLogin(req, res) {
        try {
            const { code } = req.body;
            if (!code) {
                res.status(400).json({ error: 'Wechat code is required' });
                return;
            }
            const result = await auth_1.AuthService.loginWithWechat(code);
            res.json({
                success: true,
                data: {
                    user: result.user,
                    token: result.token
                }
            });
        }
        catch (error) {
            console.error('Wechat login error:', error);
            res.status(500).json({ error: 'Login failed' });
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=auth.js.map