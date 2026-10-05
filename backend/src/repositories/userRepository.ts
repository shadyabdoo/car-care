import { pool } from '../config/db.js';

export type UserRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  profile_photo: string | null;
  language: string | null;
  theme: string | null;
  accent_color: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export async function findUserByEmail(email: string) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email] as any);
  return (rows as UserRow[])[0] ?? null;
}

export async function findUserById(id: number) {
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id] as any);
  return (rows as UserRow[])[0] ?? null;
}

export async function createUser(data: {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
}) {
  const [result] = await pool.execute(
    'INSERT INTO users (name, email, phone, password_hash, language, theme, accent_color) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.name, data.email, data.phone, data.passwordHash, 'en', 'dark', 'blue'],
  );

  const insertId = (result as { insertId: number }).insertId;
  return findUserById(insertId);
}
