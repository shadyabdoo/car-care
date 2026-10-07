create unique index if not exists vehicles_id_user_id_uidx
  on public.vehicles (id, user_id);

create table if not exists public.tire_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  position text not null check (
    position in ('front_left', 'front_right', 'rear_left', 'rear_right', 'spare')
  ),
  brand text not null check (length(trim(brand)) > 0),
  model text not null check (length(trim(model)) > 0),
  size text not null check (length(trim(size)) > 0),
  tire_type text check (
    tire_type is null or tire_type in ('summer', 'all_season', 'winter', 'performance', 'other')
  ),
  purchase_date date,
  installation_date date,
  odometer_at_installation integer check (
    odometer_at_installation is null or odometer_at_installation >= 0
  ),
  current_odometer integer check (
    current_odometer is null or current_odometer >= 0
  ),
  expected_life_km integer check (
    expected_life_km is null or expected_life_km > 0
  ),
  price numeric(12, 2) check (price is null or price > 0),
  vendor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tire_records_odometer_order_check check (
    odometer_at_installation is null
    or current_odometer is null
    or current_odometer >= odometer_at_installation
  ),
  constraint tire_records_date_order_check check (
    purchase_date is null
    or installation_date is null
    or installation_date >= purchase_date
  ),
  constraint tire_records_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists tire_records_vehicle_installation_idx
  on public.tire_records (vehicle_id, installation_date desc, created_at desc);

create index if not exists tire_records_user_id_idx
  on public.tire_records (user_id);

create index if not exists tire_records_vehicle_position_idx
  on public.tire_records (vehicle_id, position);

create or replace function public.set_tire_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tire_records_set_updated_at
  on public.tire_records;
create trigger tire_records_set_updated_at
before update on public.tire_records
for each row execute function public.set_tire_record_updated_at();

alter table public.tire_records enable row level security;

drop policy if exists "Users can read their own tire records"
  on public.tire_records;
create policy "Users can read their own tire records"
  on public.tire_records for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = tire_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add tire records for their own vehicles"
  on public.tire_records;
create policy "Users can add tire records for their own vehicles"
  on public.tire_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = tire_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own tire records"
  on public.tire_records;
create policy "Users can update their own tire records"
  on public.tire_records for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = tire_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = tire_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own tire records"
  on public.tire_records;
create policy "Users can delete their own tire records"
  on public.tire_records for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = tire_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.tire_records to authenticated;
