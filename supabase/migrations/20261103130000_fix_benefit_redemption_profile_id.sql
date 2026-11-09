alter table public.benefit_redemptions
  add column if not exists profile_id uuid
    references public.profiles(id) on delete cascade;

update public.benefit_redemptions
set profile_id = partner_id
where profile_id is null;

alter table public.benefit_redemptions
  alter column profile_id set not null;

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

  select benefit.points_cost, benefit.retail_value
  into v_cost, v_value
  from public.benefits benefit
  where benefit.id = p_benefit_id
    and benefit.active = true
  for share;

  if not found then
    raise exception 'Benefício não encontrado ou indisponível.';
  end if;

  insert into public.green_wallet(partner_id, profile_id)
  values (v_user_id, v_user_id)
  on conflict (partner_id) do nothing;

  update public.green_wallet wallet
  set points_balance = wallet.points_balance - v_cost,
      updated_at = now()
  where wallet.partner_id = v_user_id
    and wallet.profile_id = v_user_id
    and wallet.points_balance >= v_cost
  returning wallet.points_balance into v_balance;

  if not found then
    raise exception 'Saldo insuficiente ou carteira não inicializada.';
  end if;

  insert into public.benefit_redemptions(
    partner_id, profile_id, benefit_id, points_used, benefit_value, status
  )
  values (
    v_user_id, v_user_id, p_benefit_id, v_cost, coalesce(v_value, 0), 'solicitado'
  )
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance;
end;
$$;

revoke all on function public.redeem_benefit(bigint) from public, anon;
grant execute on function public.redeem_benefit(bigint) to authenticated;

notify pgrst, 'reload schema';
