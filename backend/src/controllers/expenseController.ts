import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function listExpensesController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const [rows] = await pool.execute(
      'SELECT * FROM expenses WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY expense_date DESC',
      [vehicleId, req.user!.id] as any,
    );
    return res.json({ success: true, expenses: rows });
  } catch (error) {
    return next(error);
  }
}

export async function createExpenseController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const { category, title, amount, expense_date, description } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO expenses (vehicle_id, category, title, amount, expense_date, description) VALUES (?, ?, ?, ?, ?, ?)',
      [vehicleId, category, title, amount, expense_date ?? new Date().toISOString(), description ?? ''] as any,
    );
    const id = (result as { insertId: number }).insertId;
    const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.status(201).json({ success: true, expense: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function updateExpenseController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const values = req.body;
    const fields = Object.entries(values).map(([key]) => `${key} = ?`);
    await pool.execute(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`,
      [...Object.values(values), id, req.user!.id] as any,
    );
    const [rows] = await pool.execute('SELECT * FROM expenses WHERE id = ?', [id] as any);
    return res.json({ success: true, expense: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function deleteExpenseController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM expenses WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.json({ success: true, message: 'Expense deleted' });
  } catch (error) {
    return next(error);
  }
}
