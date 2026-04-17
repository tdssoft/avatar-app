-- Tabela wywiadów żywieniowych
CREATE TABLE IF NOT EXISTS public.nutrition_interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_profile_id uuid NOT NULL REFERENCES public.person_profiles(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela nagrań audio
CREATE TABLE IF NOT EXISTS public.audio_recordings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_profile_id uuid NOT NULL REFERENCES public.person_profiles(id) ON DELETE CASCADE,
  recommendation_id uuid REFERENCES public.recommendations(id) ON DELETE SET NULL,
  interview_id uuid REFERENCES public.nutrition_interviews(id) ON DELETE SET NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  duration_seconds integer,
  recorded_by uuid NOT NULL REFERENCES auth.users(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_nutrition_interviews_profile ON public.nutrition_interviews(person_profile_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_profile ON public.audio_recordings(person_profile_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_recommendation ON public.audio_recordings(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_interview ON public.audio_recordings(interview_id);

-- Enable RLS
ALTER TABLE public.nutrition_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

-- RLS dla nutrition_interviews
-- Admini mają pełny dostęp
CREATE POLICY "Admins can manage nutrition interviews"
ON public.nutrition_interviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Pacjenci mogą widzieć swoje wywiady
CREATE POLICY "Users can view own interviews"
ON public.nutrition_interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.person_profiles pp
    WHERE pp.id = person_profile_id
    AND pp.account_user_id = auth.uid()
  )
);

-- Pacjenci mogą tworzyć wywiady dla swoich profili
CREATE POLICY "Users can insert own interviews"
ON public.nutrition_interviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.person_profiles pp
    WHERE pp.id = person_profile_id
    AND pp.account_user_id = auth.uid()
  )
);

-- Pacjenci mogą aktualizować swoje wywiady
CREATE POLICY "Users can update own interviews"
ON public.nutrition_interviews
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.person_profiles pp
    WHERE pp.id = person_profile_id
    AND pp.account_user_id = auth.uid()
  )
);

-- RLS dla audio_recordings
-- Admini mają pełny dostęp
CREATE POLICY "Admins can manage audio recordings"
ON public.audio_recordings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Pacjenci mogą widzieć nagrania przypisane do swoich profili
CREATE POLICY "Users can view own audio recordings"
ON public.audio_recordings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.person_profiles pp
    WHERE pp.id = person_profile_id
    AND pp.account_user_id = auth.uid()
  )
);

-- Storage bucket dla nagrań audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Polityki storage dla nagrań audio
-- Admini mogą uploadować
CREATE POLICY "Admins can upload audio recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audio-recordings' 
  AND has_role(auth.uid(), 'admin')
);

-- Admini mogą aktualizować
CREATE POLICY "Admins can update audio recordings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'audio-recordings' 
  AND has_role(auth.uid(), 'admin')
);

-- Admini mogą usuwać
CREATE POLICY "Admins can delete audio recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'audio-recordings' 
  AND has_role(auth.uid(), 'admin')
);

-- Użytkownicy mogą pobierać nagrania ze swoich profili
CREATE POLICY "Users can download own audio recordings"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'audio-recordings'
  AND (
    has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.audio_recordings ar
      JOIN public.person_profiles pp ON ar.person_profile_id = pp.id
      WHERE ar.file_path = name
      AND pp.account_user_id = auth.uid()
    )
  )
);