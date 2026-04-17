create table if not exists public.admin_access_grants (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  granted_by_user_id uuid not null,
  reason text not null check (reason in ('platnosc_gotowka', 'inny_przypadek')),
  product_id text not null,
  product_name text not null,
  granted_at timestamptz not null default now()
);

create index if not exists idx_admin_access_grants_patient_id
  on public.admin_access_grants (patient_id);

create index if not exists idx_admin_access_grants_granted_at
  on public.admin_access_grants (granted_at desc);

alter table public.admin_access_grants enable row level security;

create policy "Admins can read access grants"
  on public.admin_access_grants
  for select
  using (public.has_role(auth.uid(), 'admin'));
