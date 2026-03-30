-- Fix: admin can see interview tab when interview status is 'sent' OR 'draft'
-- Previously only 'sent' was checked — now admin can access empty/draft/complete interviews
CREATE OR REPLACE FUNCTION public.get_admin_patient_profile_data(
  p_patient_id uuid,
  p_person_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN jsonb_build_object(
    'result_files', (
      SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC NULLS LAST), '[]'::jsonb)
      FROM public.patient_result_files f
      WHERE f.patient_id = p_patient_id AND f.person_profile_id = p_person_profile_id
    ),
    'device_files', (
      SELECT coalesce(jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC NULLS LAST), '[]'::jsonb)
      FROM public.patient_device_files f
      WHERE f.patient_id = p_patient_id AND f.person_profile_id = p_person_profile_id
    ),
    'ai_entries', (
      SELECT coalesce(jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC NULLS LAST), '[]'::jsonb)
      FROM public.patient_ai_entries e
      WHERE e.patient_id = p_patient_id AND e.person_profile_id = p_person_profile_id
    ),
    'can_open_interview', (
      SELECT EXISTS(
        SELECT 1 FROM public.nutrition_interviews
        WHERE person_profile_id = p_person_profile_id
          AND status IN ('sent', 'draft')
        LIMIT 1
      )
    )
  );
END;
$func$;
