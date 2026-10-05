import type { NextFunction, Request, Response } from 'express';
import { createVehicleForUser, deleteVehicleForUser, getVehicleForUser, listVehiclesForUser, updateVehicleForUser } from '../services/vehicleService.js';

export async function listVehiclesController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const vehicles = await listVehiclesForUser(userId!);
    return res.json({ success: true, vehicles });
  } catch (error) {
    return next(error);
  }
}

export async function createVehicleController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user?.id;
    const vehicle = await createVehicleForUser(userId!, req.body);
    return res.status(201).json({ success: true, vehicle });
  } catch (error) {
    return next(error);
  }
}

export async function getVehicleController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicle = await getVehicleForUser(Number(req.params.id), req.user!.id);
    return res.json({ success: true, vehicle });
  } catch (error) {
    return next(error);
  }
}

export async function updateVehicleController(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicle = await updateVehicleForUser(Number(req.params.id), req.user!.id, req.body);
    return res.json({ success: true, vehicle });
  } catch (error) {
    return next(error);
  }
}

export async function deleteVehicleController(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteVehicleForUser(Number(req.params.id), req.user!.id);
    return res.json({ success: true, message: 'Vehicle deleted' });
  } catch (error) {
    return next(error);
  }
}

export async function updateMileageController(req: Request, res: Response, next: NextFunction) {
  try {
    const mileage = Number(req.body.mileage);
    if (!Number.isFinite(mileage) || mileage < 0) {
      return res.status(400).json({ success: false, message: 'Mileage must be a valid non-negative number', code: 'INVALID_MILEAGE' });
    }

    const vehicle = await getVehicleForUser(Number(req.params.id), req.user!.id);
    if (mileage < Number(vehicle.mileage)) {
      return res.status(400).json({ success: false, message: 'Mileage cannot be lower than current value', code: 'INVALID_MILEAGE' });
    }

    const updated = await updateVehicleForUser(Number(req.params.id), req.user!.id, { mileage });
    return res.json({ success: true, vehicle: updated });
  } catch (error) {
    return next(error);
  }
}
