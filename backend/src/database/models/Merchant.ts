import { pool } from '../connection';
import bcrypt from 'bcryptjs';

export interface Merchant {
  id?: number;
  username: string;
  password: string;
  shopName: string;
  name: string;
  description?: string;
  contact_phone?: string;
  address?: string;
  is_active?: boolean;
  customerServiceQrUrl?: string;
  qrCodeUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class MerchantModel {
  // 根据用户名查找商家
  static async findByUsername(username: string): Promise<Merchant | null> {
    const result = await pool.query(
      `SELECT
        id,
        username,
        password,
        shop_name as "shopName",
        name,
        description,
        contact_phone as "contactPhone",
        address,
        is_active as "isActive",
        customer_service_qr_url as "customerServiceQrUrl",
        qr_code_url as "qrCodeUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM merchants
      WHERE username = $1`,
      [username]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as Merchant;
  }

  // 根据 ID 查找商家
  static async findById(id: number): Promise<Merchant | null> {
    const result = await pool.query(
      `SELECT
        id,
        username,
        password,
        shop_name as "shopName",
        name,
        description,
        contact_phone as "contactPhone",
        address,
        is_active as "isActive",
        customer_service_qr_url as "customerServiceQrUrl",
        qr_code_url as "qrCodeUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM merchants
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as Merchant;
  }

  // 创建商家
  static async create(merchant: Omit<Merchant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Merchant> {
    const hashedPassword = await bcrypt.hash(merchant.password, 10);

    const result = await pool.query(
      `INSERT INTO merchants (username, password, shop_name, name, description, is_active, customer_service_qr_url, qr_code_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, shop_name as "shopName", name, created_at as "createdAt"`,
      [
        merchant.username,
        hashedPassword,
        merchant.shopName,
        merchant.name || null,
        merchant.description || null,
        merchant.is_active ? true : false,
        merchant.customerServiceQrUrl || null,
        merchant.qrCodeUrl || null
      ]
    );

    return {
      ...merchant,
      password: hashedPassword,
      id: result.rows[0].id
    };
  }

  // 验证密码
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // 获取所有活跃商家
  static async getActiveMerchants(): Promise<Merchant[]> {
    const result = await pool.query(
      `SELECT
        id,
        username,
        shop_name as "shopName",
        name,
        description,
        contact_phone as "contactPhone",
        address,
        is_active as "isActive",
        customer_service_qr_url as "customerServiceQrUrl",
        qr_code_url as "qrCodeUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM merchants
      WHERE is_active = true
      ORDER BY created_at DESC`
    );

    return result.rows as Merchant[];
  }

  // 更新商家信息
  static async update(id: number, updates: Partial<Merchant>): Promise<Merchant | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.contact_phone !== undefined) {
      fields.push(`contact_phone = $${paramIndex++}`);
      values.push(updates.contact_phone);
    }
    if (updates.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(updates.address);
    }
    if (updates.customerServiceQrUrl !== undefined) {
      fields.push(`customer_service_qr_url = $${paramIndex++}`);
      values.push(updates.customerServiceQrUrl);
    }
    if (updates.qrCodeUrl !== undefined) {
      fields.push(`qr_code_url = $${paramIndex++}`);
      values.push(updates.qrCodeUrl);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE merchants SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return null;

    return await this.findById(id);
  }
}
