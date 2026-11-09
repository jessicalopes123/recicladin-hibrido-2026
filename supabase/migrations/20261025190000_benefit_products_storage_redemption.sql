alter table public.benefits
  add column if not exists photo_url text;

insert into storage.buckets(id, name, public)
values ('produtos', 'produtos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists produtos_admin_insert on storage.objects;
create policy produtos_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'produtos'
    and (storage.foldername(name))[1] = 'benefits'
    and public.my_role() = 'admin'
  );

create or replace function public.redeem_benefit(p_benefit_id bigint)
returns table (redemption_id bigint, points_balance numeric)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_cost numeric(12,2);
  v_balance numeric(12,2);
  v_redemption_id bigint;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta para resgatar benefícios.';
  end if;
  if public.my_role() is distinct from 'partner' then
    raise exception 'Somente parceiros podem resgatar benefícios.';
  end if;

  select b.points_cost into v_cost
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

  insert into public.benefit_redemptions(partner_id, benefit_id, points_used, status)
  values (v_user_id, p_benefit_id, v_cost, 'solicitado')
  returning id into v_redemption_id;

  return query select v_redemption_id, v_balance - v_cost;
end;
$$;

revoke all on function public.redeem_benefit(bigint) from public, anon;
grant execute on function public.redeem_benefit(bigint) to authenticated;

notify pgrst, 'reload schema';
