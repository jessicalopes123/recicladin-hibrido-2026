alter table public.green_wallet
  add column if not exists profile_id uuid;

update public.green_wallet
set profile_id = partner_id
where profile_id is distinct from partner_id;

create or replace function public.sync_green_wallet_profile_id()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.partner_id is not null
     and new.profile_id is not null
     and new.partner_id is distinct from new.profile_id then
    raise exception 'green_wallet.partner_id and profile_id must refer to the same profile';
  end if;

  new.partner_id := coalesce(new.partner_id, new.profile_id);
  new.profile_id := coalesce(new.profile_id, new.partner_id);
  return new;
end;
$$;

drop trigger if exists green_wallet_sync_profile_id on public.green_wallet;
create trigger green_wallet_sync_profile_id
before insert or update on public.green_wallet
for each row execute function public.sync_green_wallet_profile_id();

alter table public.green_wallet
  alter column profile_id set not null;

create unique index if not exists green_wallet_partner_id_uidx
  on public.green_wallet(partner_id);

alter table public.benefit_redemptions
  add column if not exists benefit_value numeric(12,2) not null default 0,
  add column if not exists status text not null default 'solicitado';

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
    partner_id, benefit_id, points_used, benefit_value, status
  )
  values (v_user_id, p_benefit_id, v_cost, coalesce(v_value, 0), 'solicitado')
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance;
end;
$$;

revoke all on function public.redeem_benefit(bigint) from public, anon;
grant execute on function public.redeem_benefit(bigint) to authenticated;

notify pgrst, 'reload schema';
