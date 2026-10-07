create table if not exists public.vehicle_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null check (
    document_type in (
      'vehicle_registration',
      'insurance',
      'inspection',
      'driving_license',
      'warranty',
      'service_contract',
      'road_assistance',
      'other'
    )
  ),
  title text not null check (length(trim(title)) > 0),
  document_number text,
  issue_date date,
  expiry_date date,
  provider text,
  notes text,
  file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicle_documents_date_order_check
    check (
      issue_date is null
      or expiry_date is null
      or expiry_date >= issue_date
    ),
  constraint vehicle_documents_vehicle_owner_fkey
    foreign key (vehicle_id, user_id)
    references public.vehicles (id, user_id)
    on delete cascade
);

create index if not exists vehicle_documents_vehicle_expiry_idx
  on public.vehicle_documents (vehicle_id, expiry_date desc nulls last);

create index if not exists vehicle_documents_user_id_idx
  on public.vehicle_documents (user_id);

create index if not exists vehicle_documents_vehicle_type_idx
  on public.vehicle_documents (vehicle_id, document_type);

create or replace function public.set_vehicle_document_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicle_documents_set_updated_at
  on public.vehicle_documents;
create trigger vehicle_documents_set_updated_at
before update on public.vehicle_documents
for each row execute function public.set_vehicle_document_updated_at();

alter table public.vehicle_documents enable row level security;

drop policy if exists "Users can read their own vehicle documents"
  on public.vehicle_documents;
create policy "Users can read their own vehicle documents"
  on public.vehicle_documents for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = vehicle_documents.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can add vehicle documents for their own vehicles"
  on public.vehicle_documents;
create policy "Users can add vehicle documents for their own vehicles"
  on public.vehicle_documents for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = vehicle_documents.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update their own vehicle documents"
  on public.vehicle_documents;
create policy "Users can update their own vehicle documents"
  on public.vehicle_documents for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = vehicle_documents.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = vehicle_documents.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can delete their own vehicle documents"
  on public.vehicle_documents;
create policy "Users can delete their own vehicle documents"
  on public.vehicle_documents for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.vehicles
      where vehicles.id = vehicle_documents.vehicle_id
        and vehicles.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.vehicle_documents to authenticated;
