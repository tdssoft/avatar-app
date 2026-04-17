-- Access to paid diagnostic flow per person profile (not per account)
create table if not exists public.profile_access (
  id uuid primary key default gen_random_uuid(),
  person_profile_id uuid not null references public.person_profiles(id) on delete cascade,
  account_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('active', 'expired', 'pending')),
  source text not null check (source in ('stripe', 'admin')),
  stripe_session_id text null,
  stripe_subscription_id text null,
  selected_packages text null,
  activated_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(person_profile_id)
);

create index if not exists idx_profile_access_account_user_status
  on public.profile_access(account_user_id, status);

create index if not exists idx_profile_access_person_profile_status
  on public.profile_access(person_profile_id, status);

create index if not exists idx_profile_access_stripe_session
  on public.profile_access(stripe_session_id);

create index if not exists idx_profile_access_stripe_subscription
  on public.profile_access(stripe_subscription_id);

alter table public.profile_access enable row level security;

drop policy if exists "Users can read own profile access" on public.profile_access;
create policy "Users can read own profile access"
  on public.profile_access
  for select
  using (auth.uid() = account_user_id);

drop policy if exists "Service role can manage profile access" on public.profile_access;
create policy "Service role can manage profile access"
  on public.profile_access
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
