import { getVehicleByIdAndUserId, getVehiclesByUserId, createVehicle, updateVehicleById, deleteVehicleById } from '../repositories/vehicleRepository.js';

export async function listVehiclesForUser(userId: number) {
  return getVehiclesByUserId(userId);
}

export async function getVehicleForUser(vehicleId: number, userId: number) {
  const vehicle = await getVehicleByIdAndUserId(vehicleId, userId);
  if (!vehicle) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
  }
  return vehicle;
}

export async function createVehicleForUser(userId: number, payload: Record<string, unknown>) {
  const vehicle = await createVehicle({ ...payload, user_id: userId });
  return vehicle;
}

export async function updateVehicleForUser(vehicleId: number, userId: number, payload: Record<string, unknown>) {
  const existing = await getVehicleByIdAndUserId(vehicleId, userId);
  if (!existing) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
  }

  return updateVehicleById(vehicleId, userId, payload);
}

export async function deleteVehicleForUser(vehicleId: number, userId: number) {
  const existing = await getVehicleByIdAndUserId(vehicleId, userId);
  if (!existing) {
    throw Object.assign(new Error('Vehicle not found'), { statusCode: 404, code: 'VEHICLE_NOT_FOUND' });
  }

  await deleteVehicleById(vehicleId, userId);
  return true;
}
