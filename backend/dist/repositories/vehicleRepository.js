"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVehiclesByUserId = getVehiclesByUserId;
exports.getVehicleByIdAndUserId = getVehicleByIdAndUserId;
exports.createVehicle = createVehicle;
exports.updateVehicleById = updateVehicleById;
exports.deleteVehicleById = deleteVehicleById;
const db_js_1 = require("../config/db.js");
async function getVehiclesByUserId(userId) {
    const [rows] = await db_js_1.pool.execute('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    return rows;
}
async function getVehicleByIdAndUserId(vehicleId, userId) {
    const [rows] = await db_js_1.pool.execute('SELECT * FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1', [vehicleId, userId]);
    return rows[0] ?? null;
}
async function createVehicle(data) {
    const [result] = await db_js_1.pool.execute(`INSERT INTO vehicles (
      user_id, type, brand, model, year, trim, engine, transmission, fuel_type, color, vin,
      plate_number, mileage, ownership_type, purchase_date, purchase_price, purchase_mileage, primary_photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        data.user_id,
        data.type,
        data.brand,
        data.model,
        data.year,
        data.trim ?? null,
        data.engine ?? null,
        data.transmission ?? null,
        data.fuel_type ?? null,
        data.color ?? null,
        data.vin ?? null,
        data.plate_number ?? null,
        data.mileage,
        data.ownership_type ?? null,
        data.purchase_date ?? null,
        data.purchase_price ?? null,
        data.purchase_mileage ?? null,
        data.primary_photo ?? null,
    ]);
    const insertId = result.insertId;
    return getVehicleByIdAndUserId(insertId, data.user_id);
}
async function updateVehicleById(vehicleId, userId, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            fields.push(`${key} = ?`);
            values.push(value);
        }
    }
    if (fields.length === 0)
        return getVehicleByIdAndUserId(vehicleId, userId);
    values.push(vehicleId, userId);
    await db_js_1.pool.execute(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return getVehicleByIdAndUserId(vehicleId, userId);
}
async function deleteVehicleById(vehicleId, userId) {
    await db_js_1.pool.execute('DELETE FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId]);
}
