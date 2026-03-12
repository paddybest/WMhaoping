export declare class CacheService {
    static get(key: string): Promise<any | null>;
    static set(key: string, value: any, ttl?: number): Promise<void>;
    static del(key: string): Promise<void>;
    static exists(key: string): Promise<boolean>;
}
//# sourceMappingURL=cache.d.ts.map