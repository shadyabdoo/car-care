import { pool } from '../config/db.js';

export type VehicleRow = {
  id: number;
  user_id: number;
  type: string;
  brand: string;
  model: string;
  year: number;
  trim: string | null;
  engine: string | null;
  transmission: string | null;
  fuel_type: string | null;
  color: string | null;
  vin: string | null;
  plate_number: string | null;
  mileage: number;
  ownership_type: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  purchase_mileage: number | null;
  primary_photo: string | null;
  created_at: string;
  updated_at: string;
};

export async function getVehiclesByUserId(userId: number) {
  const [rows] = await pool.execute('SELECT * FROM vehicles WHERE user_id = ? ORDER BY created_at DESC', [userId] as any);
  return rows as VehicleRow[];
}

export async function getVehicleByIdAndUserId(vehicleId: number, userId: number) {
  const [rows] = await pool.execute('SELECT * FROM vehicles WHERE id = ? AND user_id = ? LIMIT 1', [vehicleId, userId] as any);
  return (rows as VehicleRow[])[0] ?? null;
}

export async function createVehicle(data: Record<string, unknown> & { user_id: number }) {
  const [result] = await pool.execute(
    `INSERT INTO vehicles (
      user_id, type, brand, model, year, trim, engine, transmission, fuel_type, color, vin,
      plate_number, mileage, ownership_type, purchase_date, purchase_price, purchase_mileage, primary_photo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ] as any,
  );

  const insertId = (result as { insertId: number }).insertId;
  return getVehicleByIdAndUserId(insertId, data.user_id);
}

export async function updateVehicleById(vehicleId: number, userId: number, updates: Record<string, unknown>) {
  const fields: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return getVehicleByIdAndUserId(vehicleId, userId);

  values.push(vehicleId, userId);
  await pool.execute(`UPDATE vehicles SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values as any);
  return getVehicleByIdAndUserId(vehicleId, userId);
}

export async function deleteVehicleById(vehicleId: number, userId: number) {
  await pool.execute('DELETE FROM vehicles WHERE id = ? AND user_id = ?', [vehicleId, userId] as any);
}
