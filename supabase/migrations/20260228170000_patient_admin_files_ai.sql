-- Admin patient files + AI history

create table if not exists public.patient_result_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  person_profile_id uuid not null references public.person_profiles(id) on delete cascade,
  uploaded_by_admin_id uuid not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_device_files (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  person_profile_id uuid not null references public.person_profiles(id) on delete cascade,
  uploaded_by_admin_id uuid not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  file_type text,
  created_at timestamptz not null default now()
);

create table if not exists public.patient_ai_entries (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  person_profile_id uuid not null references public.person_profiles(id) on delete cascade,
  saved_by_admin_id uuid not null,
  content text not null,
  attachment_file_name text,
  attachment_file_path text,
  attachment_file_size bigint,
  attachment_file_type text,
  created_at timestamptz not null default now()
);

create index if not exists idx_patient_result_files_patient_profile_created
  on public.patient_result_files (patient_id, person_profile_id, created_at desc);
create index if not exists idx_patient_device_files_patient_profile_created
  on public.patient_device_files (patient_id, person_profile_id, created_at desc);
create index if not exists idx_patient_ai_entries_patient_profile_created
  on public.patient_ai_entries (patient_id, person_profile_id, created_at desc);

alter table public.patient_result_files enable row level security;
alter table public.patient_device_files enable row level security;
alter table public.patient_ai_entries enable row level security;

drop policy if exists "Admins can manage patient result files" on public.patient_result_files;
create policy "Admins can manage patient result files"
on public.patient_result_files
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Users can view own patient result files" on public.patient_result_files;
create policy "Users can view own patient result files"
on public.patient_result_files
for select
using (
  exists (
    select 1
    from public.patients p
    join public.person_profiles pp on pp.id = patient_result_files.person_profile_id
    where p.id = patient_result_files.patient_id
      and p.user_id = auth.uid()
      and pp.account_user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage patient device files" on public.patient_device_files;
create policy "Admins can manage patient device files"
on public.patient_device_files
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "Admins can manage patient ai entries" on public.patient_ai_entries;
create policy "Admins can manage patient ai entries"
on public.patient_ai_entries
for all
using (has_role(auth.uid(), 'admin'::app_role))
with check (has_role(auth.uid(), 'admin'::app_role));

insert into storage.buckets (id, name, public)
values ('patient-result-files', 'patient-result-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('patient-device-files', 'patient-device-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('patient-ai-files', 'patient-ai-files', false)
on conflict (id) do nothing;

drop policy if exists "Admins can upload patient result files" on storage.objects;
create policy "Admins can upload patient result files"
on storage.objects
for insert
with check (
  bucket_id = 'patient-result-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can read patient result files" on storage.objects;
create policy "Admins can read patient result files"
on storage.objects
for select
using (
  bucket_id = 'patient-result-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can delete patient result files" on storage.objects;
create policy "Admins can delete patient result files"
on storage.objects
for delete
using (
  bucket_id = 'patient-result-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Users can read own patient result files bucket" on storage.objects;
create policy "Users can read own patient result files bucket"
on storage.objects
for select
using (
  bucket_id = 'patient-result-files'
  and exists (
    select 1
    from public.patient_result_files prf
    join public.patients p on p.id = prf.patient_id
    join public.person_profiles pp on pp.id = prf.person_profile_id
    where prf.file_path = name
      and p.user_id = auth.uid()
      and pp.account_user_id = auth.uid()
  )
);

drop policy if exists "Admins can upload patient device files" on storage.objects;
create policy "Admins can upload patient device files"
on storage.objects
for insert
with check (
  bucket_id = 'patient-device-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can read patient device files" on storage.objects;
create policy "Admins can read patient device files"
on storage.objects
for select
using (
  bucket_id = 'patient-device-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can delete patient device files" on storage.objects;
create policy "Admins can delete patient device files"
on storage.objects
for delete
using (
  bucket_id = 'patient-device-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can upload patient ai files" on storage.objects;
create policy "Admins can upload patient ai files"
on storage.objects
for insert
with check (
  bucket_id = 'patient-ai-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can read patient ai files" on storage.objects;
create policy "Admins can read patient ai files"
on storage.objects
for select
using (
  bucket_id = 'patient-ai-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can delete patient ai files" on storage.objects;
create policy "Admins can delete patient ai files"
on storage.objects
for delete
using (
  bucket_id = 'patient-ai-files'
  and has_role(auth.uid(), 'admin'::app_role)
);
