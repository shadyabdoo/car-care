alter table public.vehicles
  add column if not exists image_path text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'vehicles'
      and column_name = 'image_url'
  ) then
    execute '
      update public.vehicles
      set image_path = image_url
      where image_path is null
        and image_url is not null
    ';
  end if;
end;
$$;
