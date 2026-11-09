alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := case
    when new.raw_user_meta_data->>'role' in ('partner', 'buyer')
      then new.raw_user_meta_data->>'role'
    else 'partner'
  end;
begin
  insert into public.profiles as current_profile(
    id, full_name, cpf, role, accepted_terms_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    nullif(new.raw_user_meta_data->>'cpf', ''),
    v_role,
    case
      when new.raw_user_meta_data->>'accepted_terms' = 'true' then now()
      else null
    end
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    cpf = excluded.cpf,
    role = case
      when current_profile.role <> 'admin' then excluded.role
      else current_profile.role
    end,
    accepted_terms_at = coalesce(
      current_profile.accepted_terms_at,
      excluded.accepted_terms_at
    );

  if v_role = 'partner' then
    insert into public.green_wallet(partner_id)
    values (new.id)
    on conflict (partner_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

update public.profiles profile
set role = 'buyer'
from auth.users auth_user
where auth_user.id = profile.id
  and profile.role = 'partner'
  and auth_user.raw_user_meta_data->>'role' = 'buyer';
