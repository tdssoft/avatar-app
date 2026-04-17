-- Ensure every auth user has core patient rows required by admin panel visibility.

CREATE OR REPLACE FUNCTION public.ensure_patient_core_rows()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  metadata_first_name text := trim(coalesce(NEW.raw_user_meta_data ->> 'firstName', ''));
  metadata_last_name text := trim(coalesce(NEW.raw_user_meta_data ->> 'lastName', ''));
  profile_name text := nullif(trim(concat_ws(' ', metadata_first_name, metadata_last_name)), '');
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.patients (user_id, subscription_status, diagnosis_status)
  VALUES (NEW.id, 'Brak', 'Brak')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.person_profiles (account_user_id, name, is_primary)
  VALUES (NEW.id, coalesce(profile_name, '—'), true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_patient_core_rows_on_auth_user ON auth.users;

CREATE TRIGGER trg_ensure_patient_core_rows_on_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_patient_core_rows();

-- Backfill: ensure core rows for all existing auth users.
INSERT INTO public.profiles (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.patients (user_id, subscription_status, diagnosis_status)
SELECT u.id, 'Brak', 'Brak'
FROM auth.users u
LEFT JOIN public.patients p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.person_profiles (account_user_id, name, is_primary)
SELECT
  u.id,
  coalesce(nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''), '—'),
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
LEFT JOIN public.person_profiles pp ON pp.account_user_id = u.id
WHERE pp.id IS NULL;
