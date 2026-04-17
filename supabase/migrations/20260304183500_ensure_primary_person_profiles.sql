-- Backfill: ensure every patient account has primary person profile and human-readable name.

with missing_patient_users as (
  select distinct p.user_id
  from public.patients p
  left join public.person_profiles pp on pp.account_user_id = p.user_id
  where pp.id is null
),
source_names as (
  select
    m.user_id,
    nullif(trim(concat_ws(' ', coalesce(pr.first_name, ''), coalesce(pr.last_name, ''))), '') as full_name
  from missing_patient_users m
  left join public.profiles pr on pr.user_id = m.user_id
)
insert into public.person_profiles (account_user_id, name, is_primary)
select
  s.user_id,
  coalesce(s.full_name, '—') as name,
  true as is_primary
from source_names s;

update public.person_profiles pp
set
  name = coalesce(nullif(trim(concat_ws(' ', coalesce(pr.first_name, ''), coalesce(pr.last_name, ''))), ''), '—'),
  updated_at = now()
from public.profiles pr
where pp.account_user_id = pr.user_id
  and pp.is_primary = true
  and (
    pp.name is null
    or btrim(pp.name) = ''
    or pp.name ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  );

