export type MaintenanceRecord = {
  id: string;
  vehicle_id: string;
  user_id: string;
  service_type: string;
  description: string | null;
  service_date: string;
  mileage: number;
  cost: number | null;
  workshop: string | null;
  notes: string | null;
  next_service_date: string | null;
  next_service_mileage: number | null;
  created_at: string;
  updated_at: string;
};

export type MaintenanceStatus = 'overdue' | 'dueSoon' | 'onTrack';

export const MAINTENANCE_DUE_SOON_DAYS = 30;
export const MAINTENANCE_DUE_SOON_KILOMETRES = 1000;

function currentLocalDate(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMaintenanceStatus(
  record: Pick<MaintenanceRecord, 'next_service_date' | 'next_service_mileage'>,
  currentMileage: number,
  now = new Date(),
): MaintenanceStatus | null {
  const nextDate = record.next_service_date;
  const nextMileage = record.next_service_mileage;

  if (nextDate === null && nextMileage === null) return null;

  const overdueByDate = nextDate !== null && nextDate < currentLocalDate(now);
  const overdueByMileage = nextMileage !== null && currentMileage >= nextMileage;
  if (overdueByDate || overdueByMileage) return 'overdue';

  const today = Date.parse(`${currentLocalDate(now)}T00:00:00.000Z`);
  const dueDate = nextDate === null ? null : Date.parse(`${nextDate}T00:00:00.000Z`);
  const dueInDays =
    dueDate === null || !Number.isFinite(dueDate)
      ? null
      : Math.ceil((dueDate - today) / 86_400_000);
  const dueInKilometres =
    nextMileage === null ? null : nextMileage - currentMileage;

  if (
    (dueInDays !== null && dueInDays <= MAINTENANCE_DUE_SOON_DAYS) ||
    (dueInKilometres !== null &&
      dueInKilometres <= MAINTENANCE_DUE_SOON_KILOMETRES)
  ) {
    return 'dueSoon';
  }

  return 'onTrack';
}
