alter table public.green_wallet
  add column if not exists profile_id uuid references public.profiles(id) on delete cascade;

do $$
begin
  if exists (
    select 1
    from public.green_wallet
    where profile_id is not null
      and profile_id is distinct from partner_id
  ) then
    raise exception 'green_wallet.partner_id and profile_id must refer to the same profile';
  end if;
end;
$$;

update public.green_wallet
set profile_id = partner_id
where profile_id is null;

alter table public.green_wallet
  alter column profile_id set not null;

create unique index if not exists green_wallet_profile_id_uidx
  on public.green_wallet(profile_id);

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

with partner_ids as (
  select profile.id as partner_id
  from public.profiles profile
  where profile.role = 'partner'
  union
  select weighing.partner_id
  from public.weighings weighing
  where weighing.partner_id is not null
  union
  select redemption.partner_id
  from public.benefit_redemptions redemption
  where redemption.partner_id is not null
)
insert into public.green_wallet(partner_id, profile_id)
select partner_ids.partner_id, partner_ids.partner_id
from partner_ids
on conflict (partner_id) do nothing;

create or replace function public.calculate_weighing_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.total_kg < 0 then
    raise exception 'O peso da pesagem não pode ser negativo.';
  end if;

  new.points := round(coalesce(new.total_kg, 0) * 10, 2);
  return new;
end;
$$;

create or replace function public.sync_green_wallet_from_weighing()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.green_wallet(partner_id, profile_id)
    values (new.partner_id, new.partner_id)
    on conflict (partner_id) do nothing;

    update public.green_wallet
    set points_balance = points_balance + coalesce(new.points, 0),
        updated_at = now()
    where partner_id = new.partner_id;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.partner_id = new.partner_id then
      update public.green_wallet
      set points_balance = greatest(
            0,
            coalesce(points_balance, 0) + coalesce(new.points, 0) - coalesce(old.points, 0)
          ),
          updated_at = now()
      where partner_id = new.partner_id;
    else
      update public.green_wallet
      set points_balance = greatest(0, coalesce(points_balance, 0) - coalesce(old.points, 0)),
          updated_at = now()
      where partner_id = old.partner_id;

      insert into public.green_wallet(partner_id, profile_id, points_balance)
      values (new.partner_id, new.partner_id, greatest(0, coalesce(new.points, 0)))
      on conflict (partner_id) do update
      set points_balance = public.green_wallet.points_balance + excluded.points_balance,
          updated_at = now();
    end if;
    return new;
  else
    update public.green_wallet
    set points_balance = greatest(0, coalesce(points_balance, 0) - coalesce(old.points, 0)),
        updated_at = now()
    where partner_id = old.partner_id;
    return old;
  end if;
end;
$$;

revoke all on function public.calculate_weighing_points() from public, anon, authenticated;
revoke all on function public.sync_green_wallet_from_weighing() from public, anon, authenticated;

drop trigger if exists weighings_calculate_points on public.weighings;
create trigger weighings_calculate_points
before insert or update on public.weighings
for each row execute function public.calculate_weighing_points();

drop trigger if exists weighings_sync_green_wallet on public.weighings;
create trigger weighings_sync_green_wallet
after insert or update or delete on public.weighings
for each row execute function public.sync_green_wallet_from_weighing();

update public.weighings
set points = round(coalesce(total_kg, 0) * 10, 2)
where total_kg >= 0
  and points is distinct from round(coalesce(total_kg, 0) * 10, 2);

with weighing_totals as (
  select partner_id,
         sum(case when total_kg >= 0 then greatest(coalesce(points, 0), 0) else 0 end) as points
  from public.weighings
  group by partner_id
),
redemption_totals as (
  select partner_id, sum(greatest(coalesce(points_used, 0), 0)) as points
  from public.benefit_redemptions
  group by partner_id
),
expected_balances as (
  select wallet.partner_id,
         greatest(
           0,
           coalesce(weighing_totals.points, 0) - coalesce(redemption_totals.points, 0)
         ) as points_balance
  from public.green_wallet wallet
  left join weighing_totals using (partner_id)
  left join redemption_totals using (partner_id)
)
update public.green_wallet wallet
set points_balance = expected_balances.points_balance,
    updated_at = now()
from expected_balances
where wallet.partner_id = expected_balances.partner_id
  and wallet.points_balance is distinct from expected_balances.points_balance;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.green_wallet'::regclass
      and conname = 'green_wallet_points_balance_nonnegative'
  ) then
    alter table public.green_wallet
      add constraint green_wallet_points_balance_nonnegative
      check (points_balance >= 0);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.weighings'::regclass
      and conname = 'weighings_total_kg_nonnegative'
  ) then
    alter table public.weighings
      add constraint weighings_total_kg_nonnegative check (total_kg >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.weighings'::regclass
      and conname = 'weighings_points_nonnegative'
  ) then
    alter table public.weighings
      add constraint weighings_points_nonnegative check (points >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.benefits'::regclass
      and conname = 'benefits_points_cost_nonnegative'
  ) then
    alter table public.benefits
      add constraint benefits_points_cost_nonnegative check (points_cost >= 0) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.benefit_redemptions'::regclass
      and conname = 'benefit_redemptions_points_used_nonnegative'
  ) then
    alter table public.benefit_redemptions
      add constraint benefit_redemptions_points_used_nonnegative check (points_used >= 0) not valid;
  end if;
end;
$$;

alter table public.green_wallet enable row level security;
grant select on public.green_wallet to authenticated;
drop policy if exists wallet_select on public.green_wallet;
create policy wallet_select on public.green_wallet for select to authenticated
  using (partner_id = auth.uid() or public.my_role() = 'admin');

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
  if not public.my_account_is_active() then
    raise exception 'Esta conta está desativada. Fale com o administrador para solicitar a reativação.';
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
  if v_cost is null or v_cost < 0 then
    raise exception 'O custo do benefício é inválido.';
  end if;

  insert into public.green_wallet(partner_id, profile_id)
  values (v_user_id, v_user_id)
  on conflict (partner_id) do nothing;

  select wallet.points_balance
  into v_balance
  from public.green_wallet wallet
  where wallet.partner_id = v_user_id
    and wallet.profile_id = v_user_id
  for update;

  if not found then
    raise exception 'Saldo insuficiente ou carteira não inicializada.';
  end if;
  if v_balance is null or v_balance < v_cost then
    raise exception 'Saldo insuficiente';
  end if;

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
