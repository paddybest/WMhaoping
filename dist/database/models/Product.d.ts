export interface Product {
    id?: number;
    name: string;
    tags: string[];
    created_at?: Date;
    updated_at?: Date;
}
export declare class ProductModel {
    static findAll(): Promise<Product[]>;
    static findById(id: number): Promise<Product | null>;
    static create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product>;
    static update(id: number, updates: Partial<Product>): Promise<Product | null>;
    static delete(id: number): Promise<boolean>;
    static findByTag(tag: string): Promise<Product[]>;
}
//# sourceMappingURL=Product.d.ts.map