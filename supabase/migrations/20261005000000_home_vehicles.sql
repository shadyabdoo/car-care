create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('car', 'motorcycle')),
  make text not null check (length(trim(make)) > 0),
  model text not null check (length(trim(model)) > 0),
  year integer not null check (year between 1886 and 2200),
  mileage integer not null default 0 check (mileage >= 0),
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vehicles_user_created_at_idx
  on public.vehicles (user_id, created_at desc);

create or replace function public.set_vehicle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_vehicle_updated_at();

alter table public.vehicles enable row level security;

drop policy if exists "Users can read their own vehicles" on public.vehicles;
create policy "Users can read their own vehicles"
  on public.vehicles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can add their own vehicles" on public.vehicles;
create policy "Users can add their own vehicles"
  on public.vehicles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own vehicles" on public.vehicles;
create policy "Users can update their own vehicles"
  on public.vehicles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own vehicles" on public.vehicles;
create policy "Users can delete their own vehicles"
  on public.vehicles for delete to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.vehicles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-images',
  'vehicle-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own vehicle images" on storage.objects;
create policy "Users can view their own vehicle images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own vehicle images" on storage.objects;
create policy "Users can upload their own vehicle images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own vehicle images" on storage.objects;
create policy "Users can update their own vehicle images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own vehicle images" on storage.objects;
create policy "Users can delete their own vehicle images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vehicle-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
