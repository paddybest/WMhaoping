import { pool } from '../connection';

export interface Product {
  id?: number;
  name: string;
  tags: string[];
  created_at?: Date;
  updated_at?: Date;
}

export class ProductModel {
  static async findAll(): Promise<Product[]> {
    const result = await pool.query('SELECT * FROM product_items ORDER BY created_at DESC');
    return result.rows as Product[];
  }

  static async findById(id: number): Promise<Product | null> {
    const result = await pool.query('SELECT * FROM product_items WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const result = await pool.query(
      'INSERT INTO product_items (name, tags) VALUES ($1, $2) RETURNING id',
      [product.name, JSON.stringify(product.tags)]
    );
    return { ...product, id: result.rows[0].id };
  }

  static async update(id: number, updates: Partial<Product>): Promise<Product | null> {
    const fields = Object.keys(updates).map(key => {
      if (key === 'tags') return `${key} = $${Object.keys(updates).indexOf(key) + 1}`;
      return `${key} = $${Object.keys(updates).indexOf(key) + 1}`;
    }).join(', ');

    const values = Object.entries(updates).map(([key, value]) => {
      if (key === 'tags') return JSON.stringify(value);
      return value;
    });

    await pool.query(
      `UPDATE product_items SET ${fields} WHERE id = $${values.length + 1}`,
      [...values, id]
    );

    const result = await pool.query('SELECT * FROM product_items WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async delete(id: number): Promise<boolean> {
    const result = await pool.query('DELETE FROM product_items WHERE id = $1', [id]);
    return Boolean(result.rowCount || 0);
  }

  static async findByTag(tag: string): Promise<Product[]> {
    const result = await pool.query(
      'SELECT * FROM product_items WHERE tags @> $1 ORDER BY created_at DESC',
      [JSON.stringify(tag)]
    );
    return result.rows as Product[];
  }
}
