-- Avatar per person profile (Jan/Staszek), not account-wide profile

alter table public.person_profiles
  add column if not exists avatar_url text;

create index if not exists idx_person_profiles_account_user_id_avatar
  on public.person_profiles (account_user_id, id);

-- Migrate legacy account avatar to primary person profile (if primary does not have avatar yet)
update public.person_profiles pp
set avatar_url = p.avatar_url,
    updated_at = now()
from public.profiles p
where pp.account_user_id = p.user_id
  and pp.is_primary = true
  and p.avatar_url is not null
  and coalesce(nullif(trim(pp.avatar_url), ''), '') = '';
