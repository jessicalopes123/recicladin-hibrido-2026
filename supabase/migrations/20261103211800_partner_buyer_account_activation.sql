alter table public.profiles
  add column if not exists is_active boolean not null default true;

create or replace function public.my_account_is_active() returns boolean
language sql stable security definer set search_path=public,pg_temp
as $$
  select coalesce((select is_active from public.profiles where id=auth.uid()),false);
$$;
grant execute on function public.my_account_is_active() to authenticated;

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles for update to authenticated
  using (public.my_role()='admin') with check (public.my_role()='admin');

drop policy if exists profiles_active_update_guard on public.profiles;
create policy profiles_active_update_guard on public.profiles as restrictive
  for update to authenticated
  using (public.my_account_is_active())
  with check (public.my_account_is_active() or (auth.uid()=id and is_active=false));

revoke update on public.profiles from public, anon, authenticated;
grant update (full_name,cpf,avatar_url,background_url,channel_email,channel_whatsapp,notification_frequency,is_active)
  on public.profiles to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'materials','collections','weighings','oil_collections',
    'green_wallet','benefits','benefit_redemptions','orders'
  ] loop
    execute format('drop policy if exists active_account_required on public.%I',table_name);
    execute format(
      'create policy active_account_required on public.%I as restrictive for all to authenticated using (public.my_account_is_active()) with check (public.my_account_is_active())',
      table_name
    );
  end loop;
end;
$$;

create or replace function public.redeem_benefit(p_benefit_id bigint)
returns table (redemption_id bigint, points_balance numeric)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_cost numeric(12,2);
  v_value numeric(12,2);
  v_balance numeric(12,2);
  v_redemption_id bigint;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta para resgatar benefícios.';
  end if;
  if not public.my_account_is_active() then
    raise exception 'Esta conta está desativada. Fale com o administrador para solicitar a reativação.';
  end if;
  if public.my_role() is distinct from 'partner' then
    raise exception 'Somente parceiros podem resgatar benefícios.';
  end if;

  select b.points_cost, b.retail_value into v_cost, v_value
  from public.benefits b
  where b.id=p_benefit_id and b.active=true
  for share;
  if not found then
    raise exception 'Benefício não encontrado ou indisponível.';
  end if;

  insert into public.green_wallet(partner_id)
  values(v_user_id)
  on conflict(partner_id) do nothing;

  select w.points_balance into v_balance
  from public.green_wallet w
  where w.partner_id=v_user_id
  for update;
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente para resgatar este benefício.';
  end if;

  update public.green_wallet
  set points_balance=points_balance-v_cost, updated_at=now()
  where partner_id=v_user_id;

  insert into public.benefit_redemptions(partner_id,profile_id,benefit_id,points_used,benefit_value)
  values(v_user_id,v_user_id,p_benefit_id,v_cost,v_value)
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance-v_cost;
end;
$$;
revoke all on function public.redeem_benefit(bigint) from public;
grant execute on function public.redeem_benefit(bigint) to authenticated;

drop policy if exists storage_active_account_required on storage.objects;
create policy storage_active_account_required on storage.objects as restrictive
  for all to authenticated
  using (public.my_account_is_active())
  with check (public.my_account_is_active());

notify pgrst, 'reload schema';
