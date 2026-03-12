import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare class ProductController {
    static getProducts(req: Request, res: Response): Promise<void>;
    static getProduct(req: Request, res: Response): Promise<void>;
    static createProduct(req: AuthRequest, res: Response): Promise<void>;
    static updateProduct(req: AuthRequest, res: Response): Promise<void>;
    static deleteProduct(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=product.d.ts.map