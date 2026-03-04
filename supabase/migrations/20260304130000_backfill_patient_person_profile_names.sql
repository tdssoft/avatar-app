-- Backfill patient primary person profile names from profiles first_name/last_name.
-- This migration avoids email-like names in person_profiles for patient accounts.

-- 1) Ensure every patient account has a primary person profile
insert into public.person_profiles (account_user_id, name, is_primary, created_at)
select
  p.user_id as account_user_id,
  coalesce(nullif(trim(concat(coalesce(pr.first_name, ''), ' ', coalesce(pr.last_name, ''))), ''), '—') as name,
  true as is_primary,
  now() as created_at
from public.patients p
left join public.profiles pr on pr.user_id = p.user_id
where not exists (
  select 1
  from public.person_profiles pp
  where pp.account_user_id = p.user_id
);

-- 2) Normalize primary profile names when empty or email-like
update public.person_profiles pp
set
  name = coalesce(nullif(trim(concat(coalesce(pr.first_name, ''), ' ', coalesce(pr.last_name, ''))), ''), '—'),
  updated_at = now()
from public.patients p
left join public.profiles pr on pr.user_id = p.user_id
where pp.account_user_id = p.user_id
  and pp.is_primary = true
  and (
    pp.name is null
    or btrim(pp.name) = ''
    or pp.name ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  );
