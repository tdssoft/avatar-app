-- Add interview_draft_updated to admin_events event_type constraint
ALTER TABLE public.admin_events DROP CONSTRAINT IF EXISTS admin_events_event_type_check;
ALTER TABLE public.admin_events ADD CONSTRAINT admin_events_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'patient_question'::text,
    'support_ticket'::text,
    'interview_sent'::text,
    'new_registration'::text,
    'interview_draft_updated'::text
  ]));

-- Update trigger: also fire for draft saves (status='draft'), upsert so repeated saves refresh the event
CREATE OR REPLACE FUNCTION public.trg_interview_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_patient_id uuid;
  v_profile_name text;
BEGIN
  SELECT p.id, NULLIF(pp.name, '')
  INTO v_patient_id, v_profile_name
  FROM public.person_profiles pp
  LEFT JOIN public.patients p ON p.user_id = pp.account_user_id
  WHERE pp.id = NEW.person_profile_id
  LIMIT 1;

  IF NEW.status = 'sent' THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'sent' THEN
      RETURN NEW;
    END IF;
    PERFORM public.enqueue_admin_event(
      'interview_sent', v_patient_id, NEW.person_profile_id,
      'nutrition_interviews', NEW.id,
      format('Nowy wywiad wysłany: %s', COALESCE(v_profile_name, 'profil pacjenta')),
      'Wywiad został wysłany przez pacjenta', NEW.last_updated_at
    );
    RETURN NEW;
  END IF;

  IF NEW.status = 'draft' THEN
    INSERT INTO public.admin_events (
      event_type, patient_id, person_profile_id, source_table, source_id,
      title, preview, occurred_at
    ) VALUES (
      'interview_draft_updated', v_patient_id, NEW.person_profile_id,
      'nutrition_interviews', NEW.id,
      format('Wywiad edytowany: %s', COALESCE(v_profile_name, 'profil pacjenta')),
      'Pacjent zapisał wersję roboczą wywiadu',
      COALESCE(NEW.last_updated_at, now())
    )
    ON CONFLICT (event_type, source_table, source_id)
    DO UPDATE SET
      occurred_at = EXCLUDED.occurred_at,
      title = EXCLUDED.title,
      preview = EXCLUDED.preview,
      patient_id = EXCLUDED.patient_id,
      person_profile_id = EXCLUDED.person_profile_id;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$func$;

-- Update unread counters: include interview_draft_updated in unread_interviews count
CREATE OR REPLACE FUNCTION public.get_admin_unread_counters()
RETURNS TABLE(unread_all integer, unread_messages integer, by_patient jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH unread AS (
    SELECT e.id, e.event_type, e.patient_id
    FROM public.admin_events e
    LEFT JOIN public.admin_event_reads r
      ON r.event_id = e.id
     AND r.admin_user_id = auth.uid()
    WHERE r.event_id IS NULL
  ),
  grouped AS (
    SELECT
      u.patient_id,
      COUNT(*) FILTER (WHERE u.event_type IN ('patient_question', 'support_ticket'))::integer AS unread_messages,
      COUNT(*) FILTER (WHERE u.event_type IN ('interview_sent', 'interview_draft_updated'))::integer AS unread_interviews
    FROM unread u
    WHERE u.patient_id IS NOT NULL
    GROUP BY u.patient_id
  )
  SELECT
    COUNT(*)::integer AS unread_all,
    COUNT(*) FILTER (WHERE unread.event_type IN ('patient_question', 'support_ticket'))::integer AS unread_messages,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'patient_id', g.patient_id,
            'unread_messages', g.unread_messages,
            'unread_interviews', g.unread_interviews
          )
          ORDER BY g.patient_id
        )
        FROM grouped g
      ),
      '[]'::jsonb
    ) AS by_patient
  FROM unread;
END;
$func$;
