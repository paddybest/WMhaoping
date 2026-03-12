"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../database/models/User");
class AuthService {
    static getJwtSecret() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return secret;
    }
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.getJwtSecret(), {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.getJwtSecret());
        }
        catch (error) {
            return null;
        }
    }
    static async loginWithWechat(code) {
        const openid = `mock_openid_${code}`;
        let user = await User_1.UserModel.findByOpenid(openid);
        if (!user) {
            user = await User_1.UserModel.create({ openid });
        }
        const token = this.generateToken({
            id: user.id,
            openid: user.openid
        });
        return { user, token };
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=auth.js.map