create unique index if not exists vehicles_id_user_id_uidx
  on public.vehicles (id, user_id);

create table if not exists public.expense_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  expense_date date not null,
  category text not null check (
    category in (
      'fuel',
      'maintenance',
      'service',
      'repair',
      'parts',
      'tires',
      'car_wash',
      'insurance',
      'registration',
      'fines',
      'parking',
      'tolls',
      'accessories',
      'other'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  odometer_km integer check (odometer_km is null or odometer_km >= 0),
  vendor text,
  payment_method text check (
    payment_method is null or payment_method in (
      'cash',
      'visa',
      'mastercard',
      'wallet',
      'bank_transfer',
      'other'
    )
  ),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_records_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists expense_records_vehicle_date_idx
  on public.expense_records (vehicle_id, expense_date desc, created_at desc);

create index if not exists expense_records_user_id_idx
  on public.expense_records (user_id);

create index if not exists expense_records_category_idx
  on public.expense_records (vehicle_id, category);

create or replace function public.set_expense_record_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists expense_records_set_updated_at
  on public.expense_records;
create trigger expense_records_set_updated_at
before update on public.expense_records
for each row execute function public.set_expense_record_updated_at();

alter table public.expense_records enable row level security;

drop policy if exists "Users can read their own expense records"
  on public.expense_records;
create policy "Users can read their own expense records"
  on public.expense_records for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = expense_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add expense records for their own vehicles"
  on public.expense_records;
create policy "Users can add expense records for their own vehicles"
  on public.expense_records for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = expense_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own expense records"
  on public.expense_records;
create policy "Users can update their own expense records"
  on public.expense_records for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = expense_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = expense_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own expense records"
  on public.expense_records;
create policy "Users can delete their own expense records"
  on public.expense_records for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = expense_records.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.expense_records to authenticated;
