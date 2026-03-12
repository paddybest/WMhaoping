export interface User {
    id?: number;
    openid: string;
    nickname?: string;
    avatar?: string;
    created_at?: Date;
    updated_at?: Date;
}
export declare class UserModel {
    static create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User>;
    static findByOpenid(openid: string): Promise<User | null>;
    static findById(id: number): Promise<User | null>;
    static update(id: number, updates: Partial<User>): Promise<User | null>;
    static findAll(limit?: number, offset?: number): Promise<User[]>;
}
//# sourceMappingURL=User.d.ts.map