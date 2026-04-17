-- =====================================================
-- COMPLETE DATABASE MIGRATION
-- =====================================================
-- This file contains the complete database schema
-- Generated: 2026-02-08
-- =====================================================

-- =====================================================
-- EXTENSIONS & TYPES
-- =====================================================

-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- =====================================================
-- UTILITY FUNCTIONS (Part 1)
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avatar_url TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  referral_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. User Roles Table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- UTILITY FUNCTIONS (Part 2 - depends on user_roles table)
-- =====================================================

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Patients Table
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'Brak',
    diagnosis_status TEXT DEFAULT 'Brak',
    last_communication_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- 4. Person Profiles Table (multi-profile support)
CREATE TABLE public.person_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_user_id UUID NOT NULL,
    name TEXT NOT NULL,
    birth_date DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    notes TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.person_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Referrals Table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referrer_code text NOT NULL,
  referred_user_id uuid NOT NULL,
  referred_email text NOT NULL,
  referred_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- 6. User Results Table (metadata for uploaded files)
CREATE TABLE public.user_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_file_path CHECK (file_path <> '')
);

ALTER TABLE public.user_results ENABLE ROW LEVEL SECURITY;

-- 7. Recommendations Table
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
    created_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT,
    content TEXT,
    body_systems TEXT[] DEFAULT '{}',
    diagnosis_summary TEXT,
    dietary_recommendations TEXT,
    supplementation_program TEXT,
    shop_links TEXT,
    supporting_therapies TEXT,
    pdf_url TEXT,
    tags TEXT[],
    download_token UUID DEFAULT gen_random_uuid() UNIQUE,
    token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- 8. Recommendation Access Log Table
CREATE TABLE IF NOT EXISTS public.recommendation_access_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id uuid NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  person_profile_id uuid REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  access_type text NOT NULL CHECK (access_type IN ('view', 'download')),
  ip_address inet,
  user_agent text,
  accessed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_access_log ENABLE ROW LEVEL SECURITY;

-- 9. Patient Notes Table
CREATE TABLE public.patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

-- 10. Patient Messages Table
CREATE TABLE public.patient_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES auth.users(id),
    message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'question', 'answer')),
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

-- 11. Partner Shop Links Table
CREATE TABLE public.partner_shop_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_url TEXT NOT NULL,
    shop_name TEXT,
    added_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.partner_shop_links ENABLE ROW LEVEL SECURITY;

-- 12. Nutrition Interviews Table
CREATE TABLE IF NOT EXISTS public.nutrition_interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  person_profile_id uuid NOT NULL REFERENCES public.person_profiles(id) ON DELETE CASCADE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  last_updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nutrition_interviews_status_check CHECK (status IN ('draft', 'sent'))
);

ALTER TABLE public.nutrition_interviews ENABLE ROW LEVEL SECURITY;

-- 13. Nutrition Interview History Table
CREATE TABLE IF NOT EXISTS public.nutrition_interview_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.nutrition_interviews(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.nutrition_interview_history ENABLE ROW LEVEL SECURITY;

-- 14. Audio Recordings Table
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

ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;

-- 15. Support Tickets Table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Bucket for profile avatars (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket for user results (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', false)
ON CONFLICT (id) DO NOTHING;

-- Bucket for audio recordings (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique
ON public.profiles (referral_code)
WHERE referral_code IS NOT NULL AND referral_code <> '';

-- Referrals indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_user_id_unique
ON public.referrals (referred_user_id);

-- Person profiles indexes
CREATE INDEX IF NOT EXISTS idx_person_profiles_account_user_id ON public.person_profiles(account_user_id);

-- Recommendations indexes
CREATE INDEX IF NOT EXISTS idx_recommendations_person_profile_id ON public.recommendations(person_profile_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_download_token ON public.recommendations(download_token);
CREATE INDEX IF NOT EXISTS idx_recommendations_token_expires_at ON public.recommendations(token_expires_at);

-- Access log indexes
CREATE INDEX IF NOT EXISTS idx_access_log_recommendation ON public.recommendation_access_log(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessed_at ON public.recommendation_access_log(accessed_at);

-- Patient notes indexes
CREATE INDEX IF NOT EXISTS idx_patient_notes_person_profile_id ON public.patient_notes(person_profile_id);

-- Patient messages indexes
CREATE INDEX IF NOT EXISTS idx_patient_messages_person_profile_id ON public.patient_messages(person_profile_id);

-- Nutrition interviews indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_interviews_profile ON public.nutrition_interviews(person_profile_id);

-- Audio recordings indexes
CREATE INDEX IF NOT EXISTS idx_audio_recordings_profile ON public.audio_recordings(person_profile_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_recommendation ON public.audio_recordings(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_audio_recordings_interview ON public.audio_recordings(interview_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Profiles trigger
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Patients trigger
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Person profiles trigger
CREATE TRIGGER update_person_profiles_updated_at
BEFORE UPDATE ON public.person_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Recommendations trigger
CREATE TRIGGER update_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Support tickets trigger
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- -----------------
-- PROFILES POLICIES
-- -----------------

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- -----------------
-- USER ROLES POLICIES
-- -----------------

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- -----------------
-- PATIENTS POLICIES
-- -----------------

CREATE POLICY "Admins can view all patients"
ON public.patients FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert patients"
ON public.patients FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update patients"
ON public.patients FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patients"
ON public.patients FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- -----------------
-- PERSON PROFILES POLICIES
-- -----------------

CREATE POLICY "Users can view own person profiles"
ON public.person_profiles
FOR SELECT
USING (account_user_id = auth.uid());

CREATE POLICY "Users can insert own person profiles"
ON public.person_profiles
FOR INSERT
WITH CHECK (account_user_id = auth.uid());

CREATE POLICY "Users can update own person profiles"
ON public.person_profiles
FOR UPDATE
USING (account_user_id = auth.uid());

CREATE POLICY "Users can delete own non-primary profiles"
ON public.person_profiles
FOR DELETE
USING (account_user_id = auth.uid() AND is_primary = false);

CREATE POLICY "Admins can view all person profiles"
ON public.person_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert person profiles"
ON public.person_profiles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all person profiles"
ON public.person_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete all person profiles"
ON public.person_profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- -----------------
-- REFERRALS POLICIES
-- -----------------

CREATE POLICY "Users can view referrals they made"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_user_id);

CREATE POLICY "Authenticated users can create referrals for themselves"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referred_user_id);

CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- -----------------
-- USER RESULTS POLICIES
-- -----------------

CREATE POLICY "Users can insert their own results"
ON public.user_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
ON public.user_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results"
ON public.user_results FOR DELETE
USING (auth.uid() = user_id);

-- -----------------
-- RECOMMENDATIONS POLICIES
-- -----------------

CREATE POLICY "Admins can manage recommendations"
ON public.recommendations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own recommendations"
ON public.recommendations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

-- -----------------
-- RECOMMENDATION ACCESS LOG POLICIES
-- -----------------

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

-- -----------------
-- PATIENT NOTES POLICIES
-- -----------------

CREATE POLICY "Admins can manage patient notes"
ON public.patient_notes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- -----------------
-- PATIENT MESSAGES POLICIES
-- -----------------

CREATE POLICY "Admins can manage patient messages"
ON public.patient_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own messages"
ON public.patient_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

CREATE POLICY "Users can send questions"
ON public.patient_messages FOR INSERT
WITH CHECK (
    message_type = 'question' AND
    EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

-- -----------------
-- PARTNER SHOP LINKS POLICIES
-- -----------------

CREATE POLICY "Admins can manage partner links"
ON public.partner_shop_links FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own links"
ON public.partner_shop_links FOR SELECT
USING (partner_user_id = auth.uid());

-- -----------------
-- NUTRITION INTERVIEWS POLICIES
-- -----------------

CREATE POLICY "Admins can manage nutrition interviews"
ON public.nutrition_interviews
FOR ALL
USING (has_role(auth.uid(), 'admin'));

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

-- -----------------
-- NUTRITION INTERVIEW HISTORY POLICIES
-- -----------------

CREATE POLICY "Admins can manage interview history"
ON public.nutrition_interview_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own interview history"
ON public.nutrition_interview_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nutrition_interviews ni
    JOIN person_profiles pp ON ni.person_profile_id = pp.id
    WHERE ni.id = nutrition_interview_history.interview_id
    AND pp.account_user_id = auth.uid()
  )
);

-- -----------------
-- AUDIO RECORDINGS POLICIES
-- -----------------

CREATE POLICY "Admins can manage audio recordings"
ON public.audio_recordings
FOR ALL
USING (has_role(auth.uid(), 'admin'));

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

-- -----------------
-- SUPPORT TICKETS POLICIES
-- -----------------

CREATE POLICY "Users can view their own tickets"
ON public.support_tickets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
ON public.support_tickets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all tickets"
ON public.support_tickets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- -----------------
-- AVATARS BUCKET POLICIES
-- -----------------

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- -----------------
-- RESULTS BUCKET POLICIES
-- -----------------

CREATE POLICY "Users can upload their results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own results"
ON storage.objects FOR SELECT
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own results"
ON storage.objects FOR DELETE
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

-- -----------------
-- AUDIO RECORDINGS BUCKET POLICIES
-- -----------------

CREATE POLICY "Admins can upload audio recordings"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'audio-recordings'
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update audio recordings"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'audio-recordings'
  AND has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete audio recordings"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'audio-recordings'
  AND has_role(auth.uid(), 'admin')
);

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

-- =====================================================
-- END OF MIGRATION
-- =====================================================
