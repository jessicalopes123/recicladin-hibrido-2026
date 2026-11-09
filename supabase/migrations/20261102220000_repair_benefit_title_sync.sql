alter table public.benefits
  add column if not exists title text not null default '';

update public.benefits
set title = coalesce(nullif(btrim(title), ''), nullif(btrim(name), ''), 'Benefício'),
    name = coalesce(nullif(btrim(name), ''), nullif(btrim(title), ''), 'Benefício');

create or replace function public.sync_benefit_title_and_name()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_product_name text;
begin
  if tg_op = 'INSERT' then
    v_product_name := coalesce(nullif(btrim(new.title), ''), nullif(btrim(new.name), ''), 'Benefício');
  elsif new.name is distinct from old.name and new.title is not distinct from old.title then
    v_product_name := coalesce(nullif(btrim(new.name), ''), nullif(btrim(new.title), ''), 'Benefício');
  else
    v_product_name := coalesce(nullif(btrim(new.title), ''), nullif(btrim(new.name), ''), 'Benefício');
  end if;

  new.title := v_product_name;
  new.name := v_product_name;
  return new;
end;
$$;

drop trigger if exists benefits_sync_title_and_name on public.benefits;
create trigger benefits_sync_title_and_name
before insert or update on public.benefits
for each row execute function public.sync_benefit_title_and_name();

notify pgrst, 'reload schema';
