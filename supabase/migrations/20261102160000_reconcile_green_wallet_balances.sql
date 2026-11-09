drop trigger if exists weighings_calculate_points on public.weighings;
drop trigger if exists weighings_sync_green_wallet on public.weighings;
drop trigger if exists weighings_sync_profile_id on public.weighings;
drop trigger if exists green_wallet_sync_profile_id on public.green_wallet;

alter table public.green_wallet
  add column if not exists partner_id uuid,
  add column if not exists profile_id uuid;

create or replace function public.sync_green_wallet_profile_id()
returns trigger
language plpgsql
set search_path = public
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

update public.green_wallet
set partner_id = coalesce(
      (select profile.id from public.profiles profile where profile.id = green_wallet.profile_id and profile.role = 'partner'),
      (select profile.id from public.profiles profile where profile.id = green_wallet.partner_id and profile.role = 'partner'),
      profile_id,
      partner_id
    ),
    profile_id = coalesce(
      (select profile.id from public.profiles profile where profile.id = green_wallet.profile_id and profile.role = 'partner'),
      (select profile.id from public.profiles profile where profile.id = green_wallet.partner_id and profile.role = 'partner'),
      profile_id,
      partner_id
    );

with ranked_wallets as (
  select ctid,
         row_number() over (
           partition by coalesce(partner_id, profile_id)
           order by points_balance desc nulls last, updated_at desc nulls last, ctid
         ) as wallet_rank
  from public.green_wallet
  where coalesce(partner_id, profile_id) is not null
)
delete from public.green_wallet as wallet
using ranked_wallets
where wallet.ctid = ranked_wallets.ctid
  and ranked_wallets.wallet_rank > 1;

delete from public.green_wallet
where partner_id is null
  and profile_id is null;

update public.green_wallet
set partner_id = profile_id
where partner_id is null;

update public.green_wallet
set profile_id = partner_id
where profile_id is null;

create trigger green_wallet_sync_profile_id
before insert or update on public.green_wallet
for each row execute function public.sync_green_wallet_profile_id();

alter table public.green_wallet
  alter column partner_id set not null,
  alter column profile_id set not null;

create unique index if not exists green_wallet_partner_id_uidx
  on public.green_wallet(partner_id);

create unique index if not exists green_wallet_profile_id_uidx
  on public.green_wallet(profile_id);

alter table public.weighings
  add column if not exists partner_id uuid,
  add column if not exists profile_id uuid;

do $$
begin
  if exists (
    select 1
    from public.weighings weighing
    join public.profiles partner_by_id
      on partner_by_id.id = weighing.partner_id and partner_by_id.role = 'partner'
    join public.profiles partner_by_profile
      on partner_by_profile.id = weighing.profile_id and partner_by_profile.role = 'partner'
    where weighing.partner_id is distinct from weighing.profile_id
  ) then
    raise exception 'Some weighings reference two different partner profiles; resolve those IDs before running this migration.';
  end if;
end;
$$;

update public.weighings weighing
set partner_id = coalesce(
      (select profile.id from public.profiles profile where profile.id = weighing.profile_id and profile.role = 'partner'),
      (select profile.id from public.profiles profile where profile.id = weighing.partner_id and profile.role = 'partner'),
      weighing.profile_id,
      weighing.partner_id
    ),
    profile_id = coalesce(
      (select profile.id from public.profiles profile where profile.id = weighing.profile_id and profile.role = 'partner'),
      (select profile.id from public.profiles profile where profile.id = weighing.partner_id and profile.role = 'partner'),
      weighing.profile_id,
      weighing.partner_id
    )
where weighing.partner_id is distinct from weighing.profile_id
   or weighing.partner_id is null
   or weighing.profile_id is null;

do $$
declare
  unresolved_count bigint;
begin
  select count(*) into unresolved_count
  from public.weighings weighing
  where weighing.partner_id is null
     or not exists (
       select 1 from public.profiles profile
       where profile.id = weighing.partner_id and profile.role = 'partner'
     );

  if unresolved_count > 0 then
    raise warning '% weighing record(s) still do not reference a partner profile and will not appear in partner history.', unresolved_count;
  end if;
end;
$$;

with partner_ids as (
  select id as partner_id
  from public.profiles
  where role = 'partner'
  union
  select partner_id
  from public.weighings
  where partner_id is not null
  union
  select partner_id
  from public.benefit_redemptions
  where partner_id is not null
)
insert into public.green_wallet(partner_id, profile_id, points_balance)
select wallet_partner.partner_id, wallet_partner.partner_id, 0
from partner_ids wallet_partner
on conflict (partner_id) do nothing;

update public.weighings
set points = round(coalesce(total_kg, 0) * 10, 2)
where points is distinct from round(coalesce(total_kg, 0) * 10, 2);

with weighing_totals as (
  select partner_id, sum(coalesce(points, 0)) as points
  from public.weighings
  group by partner_id
),
redemption_totals as (
  select partner_id, sum(coalesce(points_used, 0)) as points
  from public.benefit_redemptions
  group by partner_id
),
wallet_totals as (
  select partner_id from public.green_wallet
  union
  select partner_id from weighing_totals
  union
  select partner_id from redemption_totals
),
expected_balances as (
  select wallet_totals.partner_id,
         greatest(0, coalesce(weighing_totals.points, 0) - coalesce(redemption_totals.points, 0)) as points_balance
  from wallet_totals
  left join weighing_totals using (partner_id)
  left join redemption_totals using (partner_id)
)
update public.green_wallet as wallet
set points_balance = expected_balances.points_balance,
    updated_at = now()
from expected_balances
where wallet.partner_id = expected_balances.partner_id
  and wallet.points_balance is distinct from expected_balances.points_balance;

create or replace function public.calculate_weighing_points()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.points := round(coalesce(new.total_kg, 0) * 10, 2);
  return new;
end;
$$;

create or replace function public.sync_green_wallet_from_weighing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.green_wallet(partner_id, profile_id)
    values (new.partner_id, new.partner_id)
    on conflict(partner_id) do nothing;
    update public.green_wallet
    set points_balance = points_balance + new.points, updated_at = now()
    where partner_id = new.partner_id;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.partner_id = new.partner_id then
      update public.green_wallet
      set points_balance = greatest(0, points_balance + new.points - old.points),
          updated_at = now()
      where partner_id = new.partner_id;
    else
      update public.green_wallet
      set points_balance = greatest(0, points_balance - old.points),
          updated_at = now()
      where partner_id = old.partner_id;
      insert into public.green_wallet(partner_id, profile_id, points_balance)
      values (new.partner_id, new.partner_id, new.points)
      on conflict(partner_id) do update
      set points_balance = public.green_wallet.points_balance + excluded.points_balance,
          updated_at = now();
    end if;
    return new;
  else
    update public.green_wallet
    set points_balance = greatest(0, points_balance - old.points),
        updated_at = now()
    where partner_id = old.partner_id;
    return old;
  end if;
end;
$$;

create or replace function public.sync_weighing_profile_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.partner_id is not null
       and new.profile_id is not null
       and new.partner_id is distinct from new.profile_id then
      raise exception 'weighings.partner_id and profile_id must refer to the same partner profile';
    end if;
    new.partner_id := coalesce(new.partner_id, new.profile_id);
    new.profile_id := coalesce(new.profile_id, new.partner_id);
  elsif new.partner_id is distinct from old.partner_id
        and new.profile_id is not distinct from old.profile_id then
    new.profile_id := new.partner_id;
  elsif new.profile_id is distinct from old.profile_id
        and new.partner_id is not distinct from old.partner_id then
    new.partner_id := new.profile_id;
  elsif new.partner_id is distinct from new.profile_id then
    raise exception 'weighings.partner_id and profile_id must refer to the same partner profile';
  end if;

  return new;
end;
$$;

revoke all on function public.calculate_weighing_points() from public, anon, authenticated;
revoke all on function public.sync_green_wallet_from_weighing() from public, anon, authenticated;
revoke all on function public.sync_weighing_profile_id() from public, anon, authenticated;

drop trigger if exists weighings_calculate_points on public.weighings;
create trigger weighings_calculate_points
before insert or update on public.weighings
for each row execute function public.calculate_weighing_points();

drop trigger if exists weighings_sync_profile_id on public.weighings;
create trigger weighings_sync_profile_id
before insert or update on public.weighings
for each row execute function public.sync_weighing_profile_id();

drop trigger if exists weighings_sync_green_wallet on public.weighings;
create trigger weighings_sync_green_wallet
after insert or update or delete on public.weighings
for each row execute function public.sync_green_wallet_from_weighing();

notify pgrst, 'reload schema';
