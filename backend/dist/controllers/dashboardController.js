"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = dashboardController;
const db_js_1 = require("../config/db.js");
const authService_js_1 = require("../services/authService.js");
async function dashboardController(req, res, next) {
    try {
        const userId = req.user.id;
        const user = await (0, authService_js_1.getCurrentUser)(userId);
        const [vehicleRows] = await db_js_1.pool.execute('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1', [userId]);
        const primaryVehicle = vehicleRows[0] ?? null;
        const [maintenanceRows] = await db_js_1.pool.execute('SELECT * FROM maintenance_records WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY service_date DESC LIMIT 5', [userId]);
        const [expenseRows] = await db_js_1.pool.execute('SELECT * FROM expenses WHERE vehicle_id IN (SELECT id FROM vehicles WHERE user_id = ?) ORDER BY expense_date DESC LIMIT 5', [userId]);
        const [notificationRows] = await db_js_1.pool.execute('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 5', [userId]);
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
    }
    catch (error) {
        return next(error);
    }
}
