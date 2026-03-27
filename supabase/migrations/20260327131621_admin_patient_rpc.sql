-- Consolidated RPC functions for admin patient profile data fetching.
-- Reduces PatientProfile.tsx network requests from 13 HTTP round-trips → 2.
--
-- get_admin_patient_core      : replaces Step 1 (patients) + Step 2 (8 parallel queries)
-- get_admin_patient_profile_data: replaces Step 3 (4 parallel profile-specific queries)

-- ---------------------------------------------------------------------------
-- Function 1: get_admin_patient_core
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_patient_core(p_patient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_patient_row jsonb;
BEGIN
  -- Caller must be an admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Resolve patient + user_id in one shot
  SELECT p.user_id, to_jsonb(p)
  INTO v_user_id, v_patient_row
  FROM public.patients p
  WHERE p.id = p_patient_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'patient', v_patient_row,

    -- profiles: first_name / last_name / phone
    'profile', (
      SELECT jsonb_build_object(
        'first_name', first_name,
        'last_name',  last_name,
        'phone',      phone
      )
      FROM public.profiles
      WHERE user_id = v_user_id
      LIMIT 1
    ),

    -- email from auth.users (accessible because function is SECURITY DEFINER + auth in search_path)
    'email', (
      SELECT email FROM auth.users WHERE id = v_user_id
    ),

    -- person_profiles ordered primary-first
    'person_profiles', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',         id,
            'name',       name,
            'is_primary', is_primary,
            'avatar_url', avatar_url
          )
          ORDER BY is_primary DESC
        ),
        '[]'::jsonb
      )
      FROM public.person_profiles
      WHERE account_user_id = v_user_id
    ),

    -- profile_access (Stripe / cash payment records)
    'profile_access', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',                     id,
            'person_profile_id',      person_profile_id,
            'status',                 status,
            'source',                 source,
            'selected_packages',      selected_packages,
            'stripe_session_id',      stripe_session_id,
            'stripe_subscription_id', stripe_subscription_id,
            'activated_at',           activated_at,
            'created_at',             created_at
          )
          ORDER BY created_at DESC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM public.profile_access
      WHERE account_user_id = v_user_id
    ),

    -- admin_access_grants (manually granted access)
    'admin_access_grants', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',           id,
            'reason',       reason,
            'product_id',   product_id,
            'product_name', product_name,
            'granted_at',   granted_at
          )
          ORDER BY granted_at DESC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM public.admin_access_grants
      WHERE patient_id = p_patient_id
    ),

    -- recommendations
    'recommendations', (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id',                  id,
            'recommendation_date', recommendation_date,
            'body_systems',        body_systems,
            'diagnosis_summary',   diagnosis_summary,
            'pdf_url',             pdf_url,
            'created_at',          created_at,
            'title',               title,
            'person_profile_id',   person_profile_id,
            'download_token',      download_token,
            'token_expires_at',    token_expires_at
          )
          ORDER BY recommendation_date DESC NULLS LAST
        ),
        '[]'::jsonb
      )
      FROM public.recommendations
      WHERE patient_id = p_patient_id
    ),

    -- patient notes
    'notes', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC NULLS LAST),
        '[]'::jsonb
      )
      FROM public.patient_notes n
      WHERE n.patient_id = p_patient_id
    ),

    -- patient messages (SMS + questions)
    'messages', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(m) ORDER BY m.sent_at DESC NULLS LAST),
        '[]'::jsonb
      )
      FROM public.patient_messages m
      WHERE m.patient_id = p_patient_id
    )
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Function 2: get_admin_patient_profile_data
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_patient_profile_data(
  p_patient_id        uuid,
  p_person_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Caller must be an admin
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN jsonb_build_object(
    -- patient result files
    'result_files', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC NULLS LAST),
        '[]'::jsonb
      )
      FROM public.patient_result_files f
      WHERE f.patient_id        = p_patient_id
        AND f.person_profile_id = p_person_profile_id
    ),

    -- patient device files
    'device_files', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(f) ORDER BY f.created_at DESC NULLS LAST),
        '[]'::jsonb
      )
      FROM public.patient_device_files f
      WHERE f.patient_id        = p_patient_id
        AND f.person_profile_id = p_person_profile_id
    ),

    -- AI data entries
    'ai_entries', (
      SELECT coalesce(
        jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC NULLS LAST),
        '[]'::jsonb
      )
      FROM public.patient_ai_entries e
      WHERE e.patient_id        = p_patient_id
        AND e.person_profile_id = p_person_profile_id
    ),

    -- whether a "sent" interview exists for this profile
    'can_open_interview', (
      SELECT EXISTS(
        SELECT 1
        FROM public.nutrition_interviews
        WHERE person_profile_id = p_person_profile_id
          AND status = 'sent'
        LIMIT 1
      )
    )
  );
END;
$$;
