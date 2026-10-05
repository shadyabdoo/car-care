# Car Care

A production-ready vehicle management mobile application built with React Native + Expo on the mobile front end and Express + MySQL on the backend.

## Requirements

- Node.js 18+
- npm 9+
- MySQL server (WAMP / local MySQL)
- Expo CLI

## Project structure

- `backend/` — Express + MySQL API
- `mobile/` — Expo React Native app

## MySQL setup

1. Open phpMyAdmin or MySQL client.
2. Create the database:

```sql
CREATE DATABASE car_care;
```

3. Import the schema from `backend/src/database/schema.sql`.

## Environment variables

Copy the example file:

```bash
cp backend/.env.example backend/.env
```

Then update the values if needed.

## Install dependencies

From the project root:

```bash
npm install
```

## Backend

```bash
npm --prefix backend run dev
```

Health check:

```bash
curl http://localhost:5000/api/health
```

Expected response:

```json
{ "ok": true, "service": "car-care-backend" }
```

## Demo seed

```bash
npm --prefix backend run seed
```

Seed user:

- Email: demo@carcare.local
- Password: Demo1234!

## Mobile

```bash
npm --prefix mobile run start
```

## API endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Vehicles

- `GET /api/vehicles`
- `POST /api/vehicles`
- `GET /api/vehicles/:id`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`
- `PATCH /api/vehicles/:id/mileage`

### Dashboard

- `GET /api/dashboard`

### Maintenance

- `GET /api/vehicles/:id/maintenance`
- `POST /api/vehicles/:id/maintenance`
- `PUT /api/maintenance/:id`
- `DELETE /api/maintenance/:id`

### Expenses

- `GET /api/vehicles/:id/expenses`
- `POST /api/vehicles/:id/expenses`
- `PUT /api/expenses/:id`
- `DELETE /api/expenses/:id`

### Reminders

- `GET /api/vehicles/:id/reminders`
- `POST /api/vehicles/:id/reminders`
- `PUT /api/reminders/:id`
- `DELETE /api/reminders/:id`

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`

## Notes

- The backend enforces authentication on protected routes.
- User data queries always verify ownership.
- The storage abstraction for documents is intentionally separated so it can later be connected to S3, Cloudinary, or local storage.
