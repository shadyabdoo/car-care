import type { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';

export async function listNotificationsController(req: Request, res: Response, next: NextFunction) {
  try {
    const [rows] = await pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user!.id] as any);
    return res.json({ success: true, notifications: rows });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationReadController(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await pool.execute('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?', [id, req.user!.id] as any);
    return res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsReadController(req: Request, res: Response, next: NextFunction) {
  try {
    await pool.execute('UPDATE notifications SET is_read = true WHERE user_id = ?', [req.user!.id] as any);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
}
