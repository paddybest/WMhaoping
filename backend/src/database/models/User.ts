import { pool } from '../connection';

export interface User {
  id?: number;
  openid: string;
  nickname?: string;
  avatar?: string;
  created_at?: Date;
  updated_at?: Date;
}

export class UserModel {
  static async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const result = await pool.query(
      'INSERT INTO users (openid, nickname, avatar) VALUES ($1, $2, $3) RETURNING id',
      [user.openid, user.nickname, user.avatar]
    );
    return { ...user, id: result.rows[0].id };
  }

  static async findByOpenid(openid: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE openid = $1', [openid]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async update(id: number, updates: Partial<User>): Promise<User | null> {
    const fields = Object.keys(updates).map(key => `${key} = $${Object.keys(updates).indexOf(key) + 1}`).join(', ');
    const values = Object.values(updates);

    await pool.query(
      `UPDATE users SET ${fields} WHERE id = $${values.length + 1}`,
      [...values, id]
    );

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    const result = await pool.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    return result.rows as User[];
  }
}
