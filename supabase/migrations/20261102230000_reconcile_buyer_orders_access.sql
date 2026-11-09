alter table public.orders
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists price_per_kg numeric(12,2),
  add column if not exists total_value numeric(12,2);

alter table public.orders enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'orders'
  loop
    execute format('drop policy %I on public.orders', existing_policy.policyname);
  end loop;
end;
$$;

create policy orders_buyer_read on public.orders
  for select to authenticated
  using (buyer_id = auth.uid());

create policy orders_admin_read on public.orders
  for select to authenticated
  using (public.my_role() = 'admin');

create policy orders_admin_insert on public.orders
  for insert to authenticated
  with check (
    public.my_role() = 'admin'
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = orders.buyer_id and buyer.role = 'buyer'
    )
    and exists (
      select 1 from public.materials material
      where material.id = orders.material_id and material.active = true
    )
    and quantity_kg > 0
    and price_per_kg is not null
    and price_per_kg >= 0
    and total_value is not null
    and total_value >= 0
  );

create policy orders_admin_update on public.orders
  for update to authenticated
  using (public.my_role() = 'admin')
  with check (public.my_role() = 'admin');

create policy orders_admin_delete on public.orders
  for delete to authenticated
  using (public.my_role() = 'admin');

revoke all on public.orders from anon, public;
grant select, insert, update, delete on public.orders to authenticated;
grant usage, select on sequence public.orders_id_seq to authenticated;

notify pgrst, 'reload schema';
