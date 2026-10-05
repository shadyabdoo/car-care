"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpensesController = listExpensesController;
exports.createExpenseController = createExpenseController;
exports.updateExpenseController = updateExpenseController;
exports.deleteExpenseController = deleteExpenseController;
const db_js_1 = require("../config/db.js");
async function listExpensesController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM expenses WHERE vehicle_id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY expense_date DESC', [vehicleId, req.user.id]);
        return res.json({ success: true, expenses: rows });
    }
    catch (error) {
        return next(error);
    }
}
async function createExpenseController(req, res, next) {
    try {
        const vehicleId = Number(req.params.id);
        const { category, title, amount, expense_date, description } = req.body;
        const [result] = await db_js_1.pool.execute('INSERT INTO expenses (vehicle_id, category, title, amount, expense_date, description) VALUES (?, ?, ?, ?, ?, ?)', [vehicleId, category, title, amount, expense_date ?? new Date().toISOString(), description ?? '']);
        const id = result.insertId;
        const [rows] = await db_js_1.pool.execute('SELECT * FROM expenses WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.status(201).json({ success: true, expense: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function updateExpenseController(req, res, next) {
    try {
        const id = Number(req.params.id);
        const values = req.body;
        const fields = Object.entries(values).map(([key]) => `${key} = ?`);
        await db_js_1.pool.execute(`UPDATE expenses SET ${fields.join(', ')} WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)`, [...Object.values(values), id, req.user.id]);
        const [rows] = await db_js_1.pool.execute('SELECT * FROM expenses WHERE id = ?', [id]);
        return res.json({ success: true, expense: rows[0] });
    }
    catch (error) {
        return next(error);
    }
}
async function deleteExpenseController(req, res, next) {
    try {
        const id = Number(req.params.id);
        await db_js_1.pool.execute('DELETE FROM expenses WHERE id = ? AND vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?)', [id, req.user.id]);
        return res.json({ success: true, message: 'Expense deleted' });
    }
    catch (error) {
        return next(error);
    }
}
