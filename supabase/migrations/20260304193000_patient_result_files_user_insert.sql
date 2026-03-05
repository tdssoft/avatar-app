-- Allow patients to upload own result files into production model:
-- public.patient_result_files + storage bucket patient-result-files

drop policy if exists "Users can insert own patient result files" on public.patient_result_files;
create policy "Users can insert own patient result files"
on public.patient_result_files
for insert
with check (
  exists (
    select 1
    from public.patients p
    join public.person_profiles pp on pp.id = patient_result_files.person_profile_id
    where p.id = patient_result_files.patient_id
      and p.user_id = auth.uid()
      and pp.account_user_id = auth.uid()
  )
);

drop policy if exists "Users can upload own patient result files bucket" on storage.objects;
create policy "Users can upload own patient result files bucket"
on storage.objects
for insert
with check (
  bucket_id = 'patient-result-files'
  and exists (
    select 1
    from public.patients p
    join public.person_profiles pp on pp.account_user_id = p.user_id
    where p.user_id = auth.uid()
      and p.id::text = (storage.foldername(name))[1]
      and pp.id::text = (storage.foldername(name))[2]
      and pp.account_user_id = auth.uid()
  )
);
