-- Recommendation files bucket (PDF/DOC/DOCX) for admin-created recommendations

insert into storage.buckets (id, name, public)
values ('recommendation-files', 'recommendation-files', false)
on conflict (id) do nothing;

drop policy if exists "Admins can upload recommendation files" on storage.objects;
create policy "Admins can upload recommendation files"
on storage.objects
for insert
with check (
  bucket_id = 'recommendation-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can read recommendation files" on storage.objects;
create policy "Admins can read recommendation files"
on storage.objects
for select
using (
  bucket_id = 'recommendation-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can update recommendation files" on storage.objects;
create policy "Admins can update recommendation files"
on storage.objects
for update
using (
  bucket_id = 'recommendation-files'
  and has_role(auth.uid(), 'admin'::app_role)
)
with check (
  bucket_id = 'recommendation-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Admins can delete recommendation files" on storage.objects;
create policy "Admins can delete recommendation files"
on storage.objects
for delete
using (
  bucket_id = 'recommendation-files'
  and has_role(auth.uid(), 'admin'::app_role)
);

drop policy if exists "Users can read own recommendation files bucket" on storage.objects;
create policy "Users can read own recommendation files bucket"
on storage.objects
for select
using (
  bucket_id = 'recommendation-files'
  and exists (
    select 1
    from public.recommendations r
    join public.patients p on p.id = r.patient_id
    left join public.person_profiles pp on pp.id = r.person_profile_id
    where r.pdf_url = name
      and p.user_id = auth.uid()
      and (pp.id is null or pp.account_user_id = auth.uid())
  )
);
