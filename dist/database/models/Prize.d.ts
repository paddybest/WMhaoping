export interface Prize {
    id?: number;
    name: string;
    description?: string;
    probability: number;
    stock: number;
    image_url?: string;
    created_at?: Date;
}
export declare class PrizeModel {
    static findAll(): Promise<Prize[]>;
    static findById(id: number): Promise<Prize | null>;
    static create(prize: Omit<Prize, 'id' | 'created_at'>): Promise<Prize>;
    static update(id: number, updates: Partial<Prize>): Promise<Prize | null>;
    static delete(id: number): Promise<boolean>;
    static updateStock(id: number, stockChange: number): Promise<Prize | null>;
    static getAvailablePrizes(): Promise<Prize[]>;
    static getTotalProbability(): Promise<number>;
}
//# sourceMappingURL=Prize.d.ts.map