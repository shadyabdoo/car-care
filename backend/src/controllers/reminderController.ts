import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function listRemindersController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const [rows] = await pool.execute(
      'SELECT * FROM reminders WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY due_date ASC',
      [vehicleId, req.user!.id] as any,
    );
    return res.json({ success: true, reminders: rows });
  } catch (error) {
    return next(error);
  }
}

export async function createReminderController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const { title, type, due_date, due_mileage, reminder_days_before } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO reminders (vehicle_id, title, type, due_date, due_mileage, reminder_days_before, completed) VALUES (?, ?, ?, ?, ?, ?, false)',
      [vehicleId, title, type, due_date ?? null, due_mileage ?? null, reminder_days_before ?? 0] as any,
    );
    const id = (result as { insertId: number }).insertId;
    const [rows] = await pool.execute('SELECT * FROM reminders WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.status(201).json({ success: true, reminder: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function updateReminderController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const settings = req.body;
    const fields = Object.entries(settings).map(([key]) => `${key} = ?`);
    await pool.execute(
      `UPDATE reminders SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`,
      [...Object.values(settings), id, req.user!.id] as any,
    );
    const [rows] = await pool.execute('SELECT * FROM reminders WHERE id = ?', [id] as any);
    return res.json({ success: true, reminder: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function deleteReminderController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM reminders WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    return next(error);
  }
}
