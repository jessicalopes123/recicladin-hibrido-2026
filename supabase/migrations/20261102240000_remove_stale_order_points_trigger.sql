do $$
declare
  stale_trigger record;
begin
  for stale_trigger in
    select trigger_row.tgname
    from pg_trigger trigger_row
    join pg_class target_table on target_table.oid = trigger_row.tgrelid
    join pg_namespace target_schema on target_schema.oid = target_table.relnamespace
    where target_schema.nspname = 'public'
      and target_table.relname = 'orders'
      and not trigger_row.tgisinternal
      and pg_get_functiondef(trigger_row.tgfoid) ilike '%balance_points%'
  loop
    execute format('drop trigger %I on public.orders', stale_trigger.tgname);
  end loop;
end;
$$;

notify pgrst, 'reload schema';
