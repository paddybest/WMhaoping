export interface JWTPayload {
    id: number;
    openid: string;
}
export declare class AuthService {
    private static getJwtSecret;
    static generateToken(payload: JWTPayload): string;
    static verifyToken(token: string): JWTPayload | null;
    static loginWithWechat(code: string): Promise<{
        user: import("../database/models/User").User;
        token: string;
    }>;
}
//# sourceMappingURL=auth.d.ts.map