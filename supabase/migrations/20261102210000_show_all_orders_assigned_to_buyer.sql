drop policy if exists orders_buyer_read on public.orders;

create policy orders_buyer_read on public.orders
  for select to authenticated
  using (buyer_id = auth.uid());

notify pgrst, 'reload schema';
