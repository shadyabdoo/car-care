"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotificationsController = listNotificationsController;
exports.markNotificationReadController = markNotificationReadController;
exports.markAllNotificationsReadController = markAllNotificationsReadController;
const db_js_1 = require("../config/db.js");
async function listNotificationsController(req, res, next) {
    try {
        const [rows] = await db_js_1.pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        return res.json({ success: true, notifications: rows });
    }
    catch (error) {
        return next(error);
    }
}
async function markNotificationReadController(req, res, next) {
    try {
        const id = Number(req.params.id);
        await db_js_1.pool.execute('UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?', [id, req.user.id]);
        return res.json({ success: true, message: 'Notification marked as read' });
    }
    catch (error) {
        return next(error);
    }
}
async function markAllNotificationsReadController(req, res, next) {
    try {
        await db_js_1.pool.execute('UPDATE notifications SET is_read = true WHERE user_id = ?', [req.user.id]);
        return res.json({ success: true, message: 'All notifications marked as read' });
    }
    catch (error) {
        return next(error);
    }
}
