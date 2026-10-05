"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVehiclesForUser = listVehiclesForUser;
exports.getVehicleForUser = getVehicleForUser;
exports.createVehicleForUser = createVehicleForUser;
exports.updateVehicleForUser = updateVehicleForUser;
exports.deleteVehicleForUser = deleteVehicleForUser;
const vehicleRepository_js_1 = require("../repositories/vehicleRepository.js");
async function listVehiclesForUser(userId) {
    return (0, vehicleRepository_js_1.getVehiclesByUserId)(userId);
}
async function getVehicleForUser(vehicleId, userId) {
    const vehicle = await (0, vehicleRepository_js_1.getVehicleByIdAndUserId)(vehicleId, userId);
    if (!vehicle) {
        throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }
    return vehicle;
}
async function createVehicleForUser(userId, payload) {
    const vehicle = await (0, vehicleRepository_js_1.createVehicle)({ ...payload, user_id: userId });
    return vehicle;
}
async function updateVehicleForUser(vehicleId, userId, payload) {
    const existing = await (0, vehicleRepository_js_1.getVehicleByIdAndUserId)(vehicleId, userId);
    if (!existing) {
        throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }
    return (0, vehicleRepository_js_1.updateVehicleById)(vehicleId, userId, payload);
}
async function deleteVehicleForUser(vehicleId, userId) {
    const existing = await (0, vehicleRepository_js_1.getVehicleByIdAndUserId)(vehicleId, userId);
    if (!existing) {
        throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
    }
    await (0, vehicleRepository_js_1.deleteVehicleById)(vehicleId, userId);
    return true;
}
