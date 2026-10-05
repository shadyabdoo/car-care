import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import env from './config/env.js';

async function seed() {
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });
  const passwordHash = await bcrypt.hash('Demo1234!', 10);

  const [existingUser] = await connection.execute('SELECT id FROM users WHERE email = ?', ['demo@carcare.local']);
  if ((existingUser as any[]).length > 0) {
    console.log('Demo user already exists.');
    await connection.end();
    return;
  }

  const [result] = await connection.execute(
    'INSERT INTO users (name, email, phone, password_hash, language, theme, accent_color) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Shady', 'demo@carcare.local', '+966500000000', passwordHash, 'en', 'dark', 'blue'],
  );

  const userId = (result as any).insertId;

  await connection.execute(
    `INSERT INTO vehicles (user_id, type, brand, model, year, trim, engine, transmission, fuel_type, color, vin, plate_number, mileage, ownership_type, purchase_date, purchase_price, purchase_mileage, primary_photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      'Car',
      'BMW',
      '320i',
      2023,
      'M Sport',
      '2.0L Turbo',
      'Automatic',
      'Petrol',
      'Blue',
      'WBA1234567890',
      'ABC-1234',
      78400,
      'Used',
      '2023-05-12',
      42000,
      15000,
      'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=900&q=80',
    ],
  );

  await connection.execute(
    `INSERT INTO vehicles (user_id, type, brand, model, year, trim, engine, transmission, fuel_type, color, vin, plate_number, mileage, ownership_type, purchase_date, purchase_price, purchase_mileage, primary_photo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      'Motorcycle',
      'Yamaha',
      'R6',
      2022,
      'Standard',
      '599cc',
      'Manual',
      'Petrol',
      'Black',
      'YAM1234567890',
      'XYZ-7777',
      18000,
      'Used',
      '2022-08-10',
      15600,
      6000,
      'https://images.unsplash.com/photo-1558980664-10e7170b5df9?auto=format&fit=crop&w=900&q=80',
    ],
  );

  await connection.execute(
    `INSERT INTO maintenance_records (vehicle_id, title, category, description, service_date, mileage, cost, workshop, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 'Oil change', 'Engine Oil', 'Routine oil and filter service.', '2024-02-01', 76000, 240, 'Nexus Auto', 'Used premium synthetic oil'],
  );

  await connection.execute(
    `INSERT INTO expenses (vehicle_id, category, title, amount, expense_date, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1, 'Maintenance', 'Oil change', 240, '2024-02-01', 'Routine service'],
  );

  await connection.execute(
    `INSERT INTO notifications (user_id, vehicle_id, title, body, type, is_read)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, 1, 'Oil service due', 'Your BMW 320i requires an oil change soon.', 'reminder', false],
  );

  console.log('Seed applied successfully.');
  await connection.end();
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
