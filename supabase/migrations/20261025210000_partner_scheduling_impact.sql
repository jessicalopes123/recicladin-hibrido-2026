alter table public.collections
  add column if not exists notes text;

alter table public.oil_collections
  add column if not exists requested_date date,
  add column if not exists requested_period text,
  add column if not exists notes text;

alter table public.benefits
  add column if not exists retail_value numeric(12,2) not null default 0;

alter table public.benefit_redemptions
  add column if not exists benefit_value numeric(12,2) not null default 0;

update public.benefit_redemptions redemption
set benefit_value = benefit.retail_value
from public.benefits benefit
where benefit.id = redemption.benefit_id
  and redemption.benefit_value = 0
  and benefit.retail_value > 0;

create or replace function public.redeem_benefit(p_benefit_id bigint)
returns table (redemption_id bigint, points_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
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
  if public.my_role() is distinct from 'partner' then
    raise exception 'Somente parceiros podem resgatar benefícios.';
  end if;

  select b.points_cost, b.retail_value into v_cost, v_value
  from public.benefits b
  where b.id = p_benefit_id and b.active = true
  for share;
  if not found then
    raise exception 'Benefício não encontrado ou indisponível.';
  end if;

  insert into public.green_wallet(partner_id)
  values (v_user_id)
  on conflict (partner_id) do nothing;

  select w.points_balance into v_balance
  from public.green_wallet w
  where w.partner_id = v_user_id
  for update;
  if v_balance < v_cost then
    raise exception 'Saldo insuficiente para resgatar este benefício.';
  end if;

  update public.green_wallet
  set points_balance = points_balance - v_cost, updated_at = now()
  where partner_id = v_user_id;

  insert into public.benefit_redemptions(partner_id, benefit_id, points_used, benefit_value, status)
  values (v_user_id, p_benefit_id, v_cost, v_value, 'solicitado')
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance - v_cost;
end;
$$;

revoke all on function public.redeem_benefit(bigint) from public, anon;
grant execute on function public.redeem_benefit(bigint) to authenticated;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['oil_collections', 'benefit_redemptions'] loop
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
