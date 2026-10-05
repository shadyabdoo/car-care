import type { NextFunction, Request, Response } from 'express';
import { pool } from '../config/db.js';

export async function listMaintenanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const [rows] = await pool.execute(
      'SELECT * FROM maintenance_records WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY service_date DESC',
      [vehicleId, req.user!.id] as any,
    );
    return res.json({ success: true, maintenance: rows });
  } catch (error) {
    return next(error);
  }
}

export async function createMaintenanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicleId = Number(req.params.id);
    const { title, category, description, service_date, mileage, cost, workshop, notes } = req.body;
    const [result] = await pool.execute(
      'INSERT INTO maintenance_records (vehicle_id, title, category, description, service_date, mileage, cost, workshop, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [vehicleId, title, category, description ?? '', service_date ?? new Date().toISOString(), mileage ?? 0, cost ?? 0, workshop ?? '', notes ?? ''] as any,
    );

    const id = (result as { insertId: number }).insertId;
    const [rows] = await pool.execute('SELECT * FROM maintenance_records WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.status(201).json({ success: true, maintenance: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function updateMaintenanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const fields = Object.entries(updates).map(([key]) => `${key} = ?`);
    const values = Object.values(updates);
    await pool.execute(
      `UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`,
      [...values, id, req.user!.id] as any,
    );
    const [rows] = await pool.execute('SELECT * FROM maintenance_records WHERE id = ?', [id] as any);
    return res.json({ success: true, maintenance: (rows as any[])[0] });
  } catch (error) {
    return next(error);
  }
}

export async function deleteMaintenanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await pool.execute('DELETE FROM maintenance_records WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user!.id] as any);
    return res.json({ success: true, message: 'Maintenance record deleted' });
  } catch (error) {
    return next(error);
  }
}
