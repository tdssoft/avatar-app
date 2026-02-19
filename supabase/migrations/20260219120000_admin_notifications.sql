-- Admin notifications and message center

CREATE TABLE IF NOT EXISTS public.admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('patient_question', 'support_ticket', 'interview_sent', 'new_registration')),
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  person_profile_id uuid REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  title text NOT NULL,
  preview text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_type, source_table, source_id)
);

CREATE TABLE IF NOT EXISTS public.admin_event_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.admin_events(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, admin_user_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_events_occurred_at ON public.admin_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_events_patient_id ON public.admin_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_admin_events_event_type ON public.admin_events(event_type);
CREATE INDEX IF NOT EXISTS idx_admin_event_reads_admin_event ON public.admin_event_reads(admin_user_id, event_id);

ALTER TABLE public.admin_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_event_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view admin events" ON public.admin_events;
CREATE POLICY "Admins can view admin events"
ON public.admin_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view own event reads" ON public.admin_event_reads;
CREATE POLICY "Admins can view own event reads"
ON public.admin_event_reads
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can insert own event reads" ON public.admin_event_reads;
CREATE POLICY "Admins can insert own event reads"
ON public.admin_event_reads
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update own event reads" ON public.admin_event_reads;
CREATE POLICY "Admins can update own event reads"
ON public.admin_event_reads
FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin')
  AND admin_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  AND admin_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can delete own event reads" ON public.admin_event_reads;
CREATE POLICY "Admins can delete own event reads"
ON public.admin_event_reads
FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin')
  AND admin_user_id = auth.uid()
);

CREATE OR REPLACE FUNCTION public.enqueue_admin_event(
  p_event_type text,
  p_patient_id uuid,
  p_person_profile_id uuid,
  p_source_table text,
  p_source_id uuid,
  p_title text,
  p_preview text,
  p_occurred_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_events (
    event_type,
    patient_id,
    person_profile_id,
    source_table,
    source_id,
    title,
    preview,
    occurred_at
  )
  VALUES (
    p_event_type,
    p_patient_id,
    p_person_profile_id,
    p_source_table,
    p_source_id,
    p_title,
    p_preview,
    p_occurred_at
  )
  ON CONFLICT (event_type, source_table, source_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_patient_message_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  IF NEW.message_type <> 'question' THEN
    RETURN NEW;
  END IF;

  SELECT NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), '')
  INTO v_full_name
  FROM public.patients p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE p.id = NEW.patient_id;

  PERFORM public.enqueue_admin_event(
    'patient_question',
    NEW.patient_id,
    NEW.person_profile_id,
    'patient_messages',
    NEW.id,
    format('Nowe pytanie od %s', COALESCE(v_full_name, 'pacjenta')),
    left(NEW.message_text, 300),
    COALESCE(NEW.sent_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_message_admin_event ON public.patient_messages;
CREATE TRIGGER trg_patient_message_admin_event
AFTER INSERT ON public.patient_messages
FOR EACH ROW
EXECUTE FUNCTION public.trg_patient_message_admin_event();

CREATE OR REPLACE FUNCTION public.trg_support_ticket_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_full_name text;
BEGIN
  SELECT p.id, NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), '')
  INTO v_patient_id, v_full_name
  FROM public.patients p
  LEFT JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  PERFORM public.enqueue_admin_event(
    'support_ticket',
    v_patient_id,
    NEW.person_profile_id,
    'support_tickets',
    NEW.id,
    format('Nowe zgłoszenie Help od %s', COALESCE(v_full_name, NEW.user_id::text)),
    left(NEW.subject || ': ' || NEW.message, 300),
    NEW.created_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_ticket_admin_event ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_admin_event
AFTER INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.trg_support_ticket_admin_event();

CREATE OR REPLACE FUNCTION public.trg_interview_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_patient_id uuid;
  v_profile_name text;
BEGIN
  IF NEW.status <> 'sent' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'sent' THEN
    RETURN NEW;
  END IF;

  SELECT p.id, NULLIF(pp.name, '')
  INTO v_patient_id, v_profile_name
  FROM public.person_profiles pp
  LEFT JOIN public.patients p ON p.user_id = pp.account_user_id
  WHERE pp.id = NEW.person_profile_id
  LIMIT 1;

  PERFORM public.enqueue_admin_event(
    'interview_sent',
    v_patient_id,
    NEW.person_profile_id,
    'nutrition_interviews',
    NEW.id,
    format('Nowy wywiad wysłany: %s', COALESCE(v_profile_name, 'profil pacjenta')),
    'Wywiad został wysłany przez pacjenta',
    NEW.last_updated_at
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interview_admin_event ON public.nutrition_interviews;
CREATE TRIGGER trg_interview_admin_event
AFTER INSERT OR UPDATE OF status ON public.nutrition_interviews
FOR EACH ROW
EXECUTE FUNCTION public.trg_interview_admin_event();

CREATE OR REPLACE FUNCTION public.trg_patient_registration_admin_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
BEGIN
  SELECT NULLIF(trim(concat_ws(' ', pr.first_name, pr.last_name)), '')
  INTO v_full_name
  FROM public.profiles pr
  WHERE pr.user_id = NEW.user_id
  LIMIT 1;

  PERFORM public.enqueue_admin_event(
    'new_registration',
    NEW.id,
    NULL,
    'patients',
    NEW.id,
    format('Nowa rejestracja: %s', COALESCE(v_full_name, NEW.user_id::text)),
    'Nowy pacjent utworzył konto w systemie',
    COALESCE(NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_patient_registration_admin_event ON public.patients;
CREATE TRIGGER trg_patient_registration_admin_event
AFTER INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.trg_patient_registration_admin_event();

CREATE OR REPLACE FUNCTION public.get_admin_event_feed(
  p_scope text DEFAULT 'all',
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_patient_id uuid DEFAULT NULL,
  p_event_types text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  event_type text,
  patient_id uuid,
  person_profile_id uuid,
  source_table text,
  source_id uuid,
  title text,
  preview text,
  occurred_at timestamptz,
  created_at timestamptz,
  is_read boolean
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT e.*
    FROM public.admin_events e
    WHERE
      (p_scope <> 'messages' OR e.event_type IN ('patient_question', 'support_ticket'))
      AND (p_patient_id IS NULL OR e.patient_id = p_patient_id)
      AND (p_event_types IS NULL OR e.event_type = ANY (p_event_types))
    ORDER BY e.occurred_at DESC
    LIMIT GREATEST(COALESCE(p_limit, 20), 0)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT
    f.id,
    f.event_type,
    f.patient_id,
    f.person_profile_id,
    f.source_table,
    f.source_id,
    f.title,
    f.preview,
    f.occurred_at,
    f.created_at,
    (r.event_id IS NOT NULL) AS is_read
  FROM filtered f
  LEFT JOIN public.admin_event_reads r
    ON r.event_id = f.id
   AND r.admin_user_id = auth.uid()
  ORDER BY f.occurred_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_unread_counters()
RETURNS TABLE (
  unread_all integer,
  unread_messages integer,
  by_patient jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
      COUNT(*) FILTER (WHERE u.event_type = 'interview_sent')::integer AS unread_interviews
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
$$;

CREATE OR REPLACE FUNCTION public.mark_admin_events_read(p_event_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_event_ids IS NULL OR array_length(p_event_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.admin_event_reads (event_id, admin_user_id)
  SELECT DISTINCT e.id, auth.uid()
  FROM public.admin_events e
  JOIN unnest(p_event_ids) AS ids(event_id) ON ids.event_id = e.id
  ON CONFLICT (event_id, admin_user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_event_feed(text, integer, integer, uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_unread_counters() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_admin_events_read(uuid[]) TO authenticated;
