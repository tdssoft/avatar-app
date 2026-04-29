-- Naprawa: klienci końcowi nie mogli wgrywać plików wyników badań na produkcji
-- (StorageApiError: new row violates row-level security policy).
--
-- Przyczyna: polityki user-upload z migracji 20260304193000 mogły nie zostać
-- zastosowane na produkcji lub zostały nadpisane. Re-aplikujemy idempotentnie
-- (drop + create), bez zmiany semantyki.
--
-- Działanie: zalogowany user (parent) może wgrywać do bucketu
-- `patient-result-files` pod ścieżką `<patient_id>/<person_profile_id>/...`
-- pod warunkiem że:
--   * patient.user_id = auth.uid()
--   * person_profile.account_user_id = auth.uid()
-- Dzięki temu rodzic może wgrywać pliki dla własnego profilu i sub-profili dzieci
-- (które mają account_user_id = parent.user_id).

-- 1. Storage bucket policy: user może wgrać plik do własnej ścieżki
drop policy if exists "Users can upload own patient result files bucket" on storage.objects;
create policy "Users can upload own patient result files bucket"
on storage.objects
for insert
to authenticated
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

-- 2. Tabela: user może wstawić rekord o własnym pliku
drop policy if exists "Users can insert own patient result files" on public.patient_result_files;
create policy "Users can insert own patient result files"
on public.patient_result_files
for insert
to authenticated
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
