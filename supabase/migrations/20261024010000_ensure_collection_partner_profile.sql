create or replace function public.ensure_collection_partner_profile() returns void
language plpgsql security definer set search_path=public, auth as $$
declare
  v_user_id uuid := auth.uid();
  v_metadata jsonb;
  v_email text;
  v_role text;
begin
  if v_user_id is null then
    raise exception 'Authentication is required to request a collection.';
  end if;

  select raw_user_meta_data, email into v_metadata, v_email
  from auth.users where id=v_user_id;
  if not found then
    raise exception 'The authenticated user was not found.';
  end if;

  v_role := v_metadata->>'role';
  if v_role is not null and v_role <> 'partner' then
    raise exception 'Only partner accounts can request a collection.';
  end if;

  insert into public.profiles(id,full_name,role)
  values(
    v_user_id,
    coalesce(nullif(v_metadata->>'full_name',''),nullif(split_part(coalesce(v_email,''),'@',1),''),''),
    'partner'
  )
  on conflict(id) do nothing;

  if not exists (
    select 1 from public.profiles where id=v_user_id and role='partner'
  ) then
    raise exception 'The authenticated user does not have a partner profile.';
  end if;
end; $$;

revoke all on function public.ensure_collection_partner_profile() from public, anon, authenticated;
grant execute on function public.ensure_collection_partner_profile() to authenticated;
