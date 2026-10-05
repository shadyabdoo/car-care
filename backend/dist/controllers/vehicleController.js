"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listVehiclesController = listVehiclesController;
exports.createVehicleController = createVehicleController;
exports.getVehicleController = getVehicleController;
exports.updateVehicleController = updateVehicleController;
exports.deleteVehicleController = deleteVehicleController;
exports.updateMileageController = updateMileageController;
const vehicleService_js_1 = require("../services/vehicleService.js");
async function listVehiclesController(req, res, next) {
    try {
        const userId = req.user?.id;
        const vehicles = await (0, vehicleService_js_1.listVehiclesForUser)(userId);
        return res.json({ success: true, vehicles });
    }
    catch (error) {
        return next(error);
    }
}
async function createVehicleController(req, res, next) {
    try {
        const userId = req.user?.id;
        const vehicle = await (0, vehicleService_js_1.createVehicleForUser)(userId, req.body);
        return res.status(201).json({ success: true, vehicle });
    }
    catch (error) {
        return next(error);
    }
}
async function getVehicleController(req, res, next) {
    try {
        const vehicle = await (0, vehicleService_js_1.getVehicleForUser)(Number(req.params.id), req.user.id);
        return res.json({ success: true, vehicle });
    }
    catch (error) {
        return next(error);
    }
}
async function updateVehicleController(req, res, next) {
    try {
        const vehicle = await (0, vehicleService_js_1.updateVehicleForUser)(Number(req.params.id), req.user.id, req.body);
        return res.json({ success: true, vehicle });
    }
    catch (error) {
        return next(error);
    }
}
async function deleteVehicleController(req, res, next) {
    try {
        await (0, vehicleService_js_1.deleteVehicleForUser)(Number(req.params.id), req.user.id);
        return res.json({ success: true, message: 'Vehicle deleted' });
    }
    catch (error) {
        return next(error);
    }
}
async function updateMileageController(req, res, next) {
    try {
        const mileage = Number(req.body.mileage);
        if (!Number.isFinite(mileage) || mileage < 0) {
            return res.status(400).json({ success: false, message: 'Mileage must be a valid non-negative number', code: 'INVALID_MILEAGE' });
        }
        const vehicle = await (0, vehicleService_js_1.getVehicleForUser)(Number(req.params.id), req.user.id);
        if (mileage < Number(vehicle.mileage)) {
            return res.status(400).json({ success: false, message: 'Mileage cannot be lower than current value', code: 'INVALID_MILEAGE' });
        }
        const updated = await (0, vehicleService_js_1.updateVehicleForUser)(Number(req.params.id), req.user.id, { mileage });
        return res.json({ success: true, vehicle: updated });
    }
    catch (error) {
        return next(error);
    }
}
