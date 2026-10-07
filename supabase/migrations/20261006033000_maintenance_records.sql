create unique index if not exists vehicles_id_user_id_uidx
  on public.vehicles (id, user_id);

create table if not exists public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  service_type text not null check (length(trim(service_type)) > 0),
  description text,
  service_date date not null,
  mileage integer not null check (mileage >= 0),
  cost numeric(12, 2) check (cost is null or cost >= 0),
  workshop text,
  notes text,
  next_service_date date,
  next_service_mileage integer check (
    next_service_mileage is null or next_service_mileage >= 0
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint maintenance_records_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists maintenance_records_vehicle_service_date_idx
  on public.maintenance_records (vehicle_id, service_date desc, created_at desc);

create index if not exists maintenance_records_user_id_idx
  on public.maintenance_records (user_id);

create or replace function public.set_maintenance_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists maintenance_records_set_updated_at
  on public.maintenance_records;
create trigger maintenance_records_set_updated_at
before update on public.maintenance_records
for each row execute function public.set_maintenance_record_updated_at();

alter table public.maintenance_records enable row level security;

drop policy if exists "Users can read their own maintenance records"
  on public.maintenance_records;
create policy "Users can read their own maintenance records"
  on public.maintenance_records for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = maintenance_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add records for their own vehicles"
  on public.maintenance_records;
create policy "Users can add records for their own vehicles"
  on public.maintenance_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = maintenance_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own maintenance records"
  on public.maintenance_records;
create policy "Users can update their own maintenance records"
  on public.maintenance_records for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = maintenance_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = maintenance_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own maintenance records"
  on public.maintenance_records;
create policy "Users can delete their own maintenance records"
  on public.maintenance_records for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = maintenance_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete
  on public.maintenance_records to authenticated;
