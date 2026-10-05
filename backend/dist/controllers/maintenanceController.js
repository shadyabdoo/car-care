"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMaintenanceController = listMaintenanceController;
exports.createMaintenanceController = createMaintenanceController;
exports.updateMaintenanceController = updateMaintenanceController;
exports.deleteMaintenanceController = deleteMaintenanceController;
const db_js_1 = require("../config/db.js");
async function listMaintenanceController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM maintenance_records WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY service_date DESC', [vehicleId, req.user.id]);
        return res.json({ success: true, maintenance: rows });
    }
    catch (error) {
        return next(error);
    }
}
async function createMaintenanceController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const { title, category, description, service_date, mileage, cost, workshop, notes } = req.body;
        const [result] = await db_js_1.pool.execute('INSERT INTO maintenance_records (vehicle_id, title, category, description, service_date, mileage, cost, workshop, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [vehicleId, title, category, description ?? '', service_date ?? new Date().toISOString(), mileage ?? 0, cost ?? 0, workshop ?? '', notes ?? '']);
        const id = result.insertId;
        const [rows] = await db_js_1.pool.execute('SELECT * FROM maintenance_records WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.status(201).json({ success: true, maintenance: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function updateMaintenanceController(req, res, next) {
    try {
        const id = Number(req.params.id);
        const updates = req.body;
        const fields = Object.entries(updates).map(([key]) => `${key} = ?`);
        const values = Object.values(updates);
        await db_js_1.pool.execute(`UPDATE maintenance_records SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`, [...values, id, req.user.id]);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM maintenance_records WHERE id = ?', [id]);
        return res.json({ success: true, maintenance: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function deleteMaintenanceController(req, res, next) {
    try {
        const id = Number(req.params.id);
        await db_js_1.pool.execute('DELETE FROM maintenance_records WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.json({ success: true, message: 'Maintenance record deleted' });
    }
    catch (error) {
        return next(error);
    }
}
