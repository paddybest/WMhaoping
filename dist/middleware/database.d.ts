import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/connection';
declare global {
    namespace Express {
        interface Request {
            db: {
                getPool: () => typeof pool;
                getRedis: () => Promise<any>;
            };
        }
    }
}
export declare const withDatabase: (req: Request, res: Response, next: NextFunction) => void;
export declare const checkDatabaseHealth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const withTransaction: (req: Request, res: Response, next: NextFunction) => void;
export declare const cleanupDatabaseConnection: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=database.d.ts.map