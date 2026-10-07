create unique index if not exists vehicles_id_user_id_uidx
  on public.vehicles (id, user_id);

create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  odometer_km integer not null check (odometer_km >= 0),
  liters numeric(8, 3) not null check (liters > 0),
  price_per_liter numeric(8, 4) not null check (price_per_liter > 0),
  total_cost numeric(12, 2) generated always as (
    round(liters * price_per_liter, 2)
  ) stored,
  fuel_type text not null check (
    fuel_type in ('gasoline_92', 'gasoline_95', 'gasoline_80', 'diesel', 'other')
  ),
  station text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fuel_records_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists fuel_records_vehicle_date_idx
  on public.fuel_records (vehicle_id, date desc, created_at desc);

create index if not exists fuel_records_user_id_idx
  on public.fuel_records (user_id);

create or replace function public.set_fuel_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fuel_records_set_updated_at
  on public.fuel_records;
create trigger fuel_records_set_updated_at
before update on public.fuel_records
for each row execute function public.set_fuel_record_updated_at();

alter table public.fuel_records enable row level security;

drop policy if exists "Users can read their own fuel records"
  on public.fuel_records;
create policy "Users can read their own fuel records"
  on public.fuel_records for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = fuel_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add fuel records for their own vehicles"
  on public.fuel_records;
create policy "Users can add fuel records for their own vehicles"
  on public.fuel_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = fuel_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own fuel records"
  on public.fuel_records;
create policy "Users can update their own fuel records"
  on public.fuel_records for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = fuel_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = fuel_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own fuel records"
  on public.fuel_records;
create policy "Users can delete their own fuel records"
  on public.fuel_records for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = fuel_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.fuel_records to authenticated;
