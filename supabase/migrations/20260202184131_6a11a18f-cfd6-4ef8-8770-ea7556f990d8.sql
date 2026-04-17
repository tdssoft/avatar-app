-- Rozszerzenie tabeli recommendations o tokeny pobierania
ALTER TABLE public.recommendations 
ADD COLUMN IF NOT EXISTS title text,
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS download_token uuid DEFAULT gen_random_uuid() UNIQUE,
ADD COLUMN IF NOT EXISTS token_expires_at timestamptz DEFAULT (now() + interval '7 days');

-- Tworzenie tabeli logów dostępu do zaleceń
CREATE TABLE IF NOT EXISTS public.recommendation_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  person_profile_id uuid REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download')),
  ip_address inet,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_recommendations_download_token ON public.recommendations(download_token);
CREATE INDEX IF NOT EXISTS idx_recommendations_token_expires_at ON public.recommendations(token_expires_at);
CREATE INDEX IF NOT EXISTS idx_access_log_recommendation ON public.recommendation_access_log(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed_at ON public.recommendation_access_log(accessed_at);

-- Enable RLS na nowej tabeli
ALTER TABLE public.recommendation_access_log ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla recommendation_access_log
-- Admini mogą wszystko
CREATE POLICY "Admins can manage access logs"
ON public.recommendation_access_log
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Pacjenci mogą wstawiać logi (przy pobieraniu przez token)
CREATE POLICY "Users can insert access logs for their recommendations"
ON public.recommendation_access_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recommendations r
    JOIN public.patients p ON r.patient_id = p.id
    WHERE r.id = recommendation_id
    AND p.user_id = auth.uid()
  )
);

-- Pacjenci mogą widzieć logi swoich zaleceń
CREATE POLICY "Users can view access logs for their recommendations"
ON public.recommendation_access_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recommendations r
    JOIN public.patients p ON r.patient_id = p.id
    WHERE r.id = recommendation_id
    AND p.user_id = auth.uid()
  )
);