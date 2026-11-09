create or replace function public.calculate_weighing_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.points := round(coalesce(new.total_kg, 0) * 10, 2);
  return new;
end;
$$;

drop trigger if exists weighings_calculate_points on public.weighings;
create trigger weighings_calculate_points
before insert or update on public.weighings
for each row execute function public.calculate_weighing_points();

update public.weighings
set points = round(coalesce(total_kg, 0) * 10, 2)
where points is distinct from round(coalesce(total_kg, 0) * 10, 2);

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['weighings', 'green_wallet', 'benefits'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;

notify pgrst, 'reload schema';
