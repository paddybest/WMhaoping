"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const connection_1 = require("../database/connection");
class CacheService {
    static async get(key) {
        try {
            const value = await connection_1.redisClient.get(key);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    static async set(key, value, ttl = 3600) {
        try {
            await connection_1.redisClient.setEx(key, ttl, JSON.stringify(value));
        }
        catch (error) {
            console.error('Cache set error:', error);
        }
    }
    static async del(key) {
        try {
            await connection_1.redisClient.del(key);
        }
        catch (error) {
            console.error('Cache del error:', error);
        }
    }
    static async exists(key) {
        try {
            const result = await connection_1.redisClient.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache.js.map