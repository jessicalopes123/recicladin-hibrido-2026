-- Administradores podem gerenciar registros operacionais, sem permissao sobre perfis ou autenticacao.
drop policy if exists collections_admin_all on public.collections;
create policy collections_admin_all on public.collections for all to authenticated
  using(public.my_role()='admin') with check(public.my_role()='admin');

drop policy if exists oil_admin_all on public.oil_collections;
create policy oil_admin_all on public.oil_collections for all to authenticated
  using(public.my_role()='admin') with check(public.my_role()='admin');

drop policy if exists wallet_admin_all on public.green_wallet;
create policy wallet_admin_all on public.green_wallet for all to authenticated
  using(public.my_role()='admin') with check(public.my_role()='admin');

drop policy if exists redemption_admin_all on public.benefit_redemptions;
create policy redemption_admin_all on public.benefit_redemptions for all to authenticated
  using(public.my_role()='admin') with check(public.my_role()='admin');

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders for all to authenticated
  using(public.my_role()='admin') with check(public.my_role()='admin');

grant select, insert, update, delete on public.materials, public.collections, public.weighings,
  public.oil_collections, public.green_wallet, public.benefits, public.benefit_redemptions,
  public.orders to authenticated;

grant usage, select on sequence public.materials_id_seq, public.weighings_id_seq,
  public.green_wallet_id_seq, public.benefits_id_seq, public.benefit_redemptions_id_seq
  to authenticated;
