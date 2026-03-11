import { pool } from '../connection';

export interface ProductImage {
  id?: number;
  productId: number;
  imageUrl: string;
  ossFileId?: string;
  orderIndex: number;
  created_at?: Date;
}

export class ProductImageModel {
  // 获取产品的所有图片
  static async findByProduct(productId: number): Promise<ProductImage[]> {
    const result = await pool.query(
      `SELECT
        id,
        product_id as "productId",
        image_url as "imageUrl",
        oss_file_id as "ossFileId",
        order_index as "orderIndex",
        created_at
      FROM product_images
      WHERE product_id = $1
      ORDER BY order_index`,
      [productId]
    );
    return result.rows as ProductImage[];
  }

  // 创建图片记录
  static async create(image: Omit<ProductImage, 'id' | 'created_at'>): Promise<ProductImage> {
    const result = await pool.query(
      'INSERT INTO product_images (product_id, image_url, oss_file_id, order_index) VALUES ($1, $2, $3, $4) RETURNING id',
      [image.productId, image.imageUrl, image.ossFileId || null, image.orderIndex]
    );

    return {
      ...image,
      id: result.rows[0].id
    };
  }

  // 删除图片
  static async delete(id: number, productId: number): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM product_images WHERE id = $1 AND product_id = $2',
      [id, productId]
    );
    return Boolean(result.rowCount || 0);
  }

  // 更新图片顺序
  static async updateOrder(productId: number, imageIds: number[]): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (let i = 0; i < imageIds.length; i++) {
        await client.query(
          'UPDATE product_images SET order_index = $1 WHERE id = $2 AND product_id = $3',
          [i, imageIds[i], productId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // 获取产品图片数量
  static async countByProduct(productId: number): Promise<number> {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
      [productId]
    );
    return parseInt(result.rows[0].count);
  }
}
