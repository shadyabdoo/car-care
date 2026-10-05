import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { getCurrentUser } from '../services/authService.js';

export async function dashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const user = await getCurrentUser(userId);

    const [vehicleRows] = await pool.execute(
      'SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId],
    );
    const primaryVehicle = (vehicleRows as any[])[0] ?? null;

    const [maintenanceRows] = await pool.execute(
      'SELECT * FROM maintenance_records WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY service_date DESC LIMIT 5',
      [userId],
    );

    const [expenseRows] = await pool.execute(
      'SELECT * FROM expenses WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY expense_date DESC LIMIT 5',
      [userId],
    );

    const [notificationRows] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5',
      [userId],
    );

    const healthScore = primaryVehicle ? 92 : 0;

    return res.json({
      success: true,
      user,
      primaryVehicle,
      healthScore,
      upcomingMaintenance: maintenanceRows,
      recentExpenses: expenseRows,
      notifications: notificationRows,
    });
  } catch (error) {
    return next(error);
  }
}
