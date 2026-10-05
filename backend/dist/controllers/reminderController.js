"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRemindersController = listRemindersController;
exports.createReminderController = createReminderController;
exports.updateReminderController = updateReminderController;
exports.deleteReminderController = deleteReminderController;
const db_js_1 = require("../config/db.js");
async function listRemindersController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM reminders WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY due_date ASC', [vehicleId, req.user.id]);
        return res.json({ success: true, reminders: rows });
    }
    catch (error) {
        return next(error);
    }
}
async function createReminderController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const { title, type, due_date, due_mileage, reminder_days_before } = req.body;
        const [result] = await db_js_1.pool.execute('INSERT INTO reminders (vehicle_id, title, type, due_date, due_mileage, reminder_days_before, completed) VALUES (?, ?, ?, ?, ?, ?, false)', [vehicleId, title, type, due_date ?? null, due_mileage ?? null, reminder_days_before ?? 0]);
        const id = result.insertId;
        const [rows] = await db_js_1.pool.execute('SELECT * FROM reminders WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.status(201).json({ success: true, reminder: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function updateReminderController(req, res, next) {
    try {
        const id = Number(req.params.id);
        const settings = req.body;
        const fields = Object.entries(settings).map(([key]) => `${key} = ?`);
        await db_js_1.pool.execute(`UPDATE reminders SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`, [...Object.values(settings), id, req.user.id]);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM reminders WHERE id = ?', [id]);
        return res.json({ success: true, reminder: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function deleteReminderController(req, res, next) {
    try {
        const id = Number(req.params.id);
        await db_js_1.pool.execute('DELETE FROM reminders WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.json({ success: true, message: 'Reminder deleted' });
    }
    catch (error) {
        return next(error);
    }
}
