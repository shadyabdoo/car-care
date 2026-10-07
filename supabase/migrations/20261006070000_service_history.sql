create unique index if not exists vehicles_id_user_id_uidx
  on public.vehicles (id, user_id);

create table if not exists public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  service_date date not null,
  odometer_km integer not null check (odometer_km >= 0),
  service_type text not null check (
    service_type in (
      'oil_change',
      'inspection',
      'brake_service',
      'tire_service',
      'battery',
      'cooling_system',
      'ac_service',
      'electrical',
      'engine',
      'transmission',
      'suspension',
      'scheduled_service',
      'repair',
      'other'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  description text,
  workshop text,
  technician text,
  parts_cost numeric(12, 2) not null default 0 check (parts_cost >= 0),
  labor_cost numeric(12, 2) not null default 0 check (labor_cost >= 0),
  total_cost numeric(13, 2) generated always as (
    parts_cost + labor_cost
  ) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_records_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists service_records_vehicle_date_idx
  on public.service_records (vehicle_id, service_date desc, created_at desc);

create index if not exists service_records_user_id_idx
  on public.service_records (user_id);

create or replace function public.set_service_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists service_records_set_updated_at
  on public.service_records;
create trigger service_records_set_updated_at
before update on public.service_records
for each row execute function public.set_service_record_updated_at();

alter table public.service_records enable row level security;

drop policy if exists "Users can read their own service records"
  on public.service_records;
create policy "Users can read their own service records"
  on public.service_records for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = service_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add service records for their own vehicles"
  on public.service_records;
create policy "Users can add service records for their own vehicles"
  on public.service_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = service_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own service records"
  on public.service_records;
create policy "Users can update their own service records"
  on public.service_records for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = service_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = service_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own service records"
  on public.service_records;
create policy "Users can delete their own service records"
  on public.service_records for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = service_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.service_records to authenticated;
