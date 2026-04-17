-- =====================================================
-- SPRINT 1: Person Profiles - Multi-profile account structure
-- =====================================================

-- 1. Create person_profiles table (profile osoby - dziecko/dorosły)
CREATE TABLE public.person_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_user_id UUID NOT NULL, -- FK to auth.users (konto właściciela)
    name TEXT NOT NULL, -- imię osoby
    birth_date DATE, -- data urodzenia
    gender TEXT CHECK (gender IN ('male', 'female', 'other')), -- płeć
    notes TEXT, -- notatki
    is_primary BOOLEAN NOT NULL DEFAULT false, -- czy to główny profil konta
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.person_profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create trigger for updated_at
CREATE TRIGGER update_person_profiles_updated_at
    BEFORE UPDATE ON public.person_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RLS Policies for person_profiles
-- Users can view their own profiles
CREATE POLICY "Users can view own person profiles"
    ON public.person_profiles
    FOR SELECT
    USING (account_user_id = auth.uid());

-- Users can insert their own profiles
CREATE POLICY "Users can insert own person profiles"
    ON public.person_profiles
    FOR INSERT
    WITH CHECK (account_user_id = auth.uid());

-- Users can update their own profiles
CREATE POLICY "Users can update own person profiles"
    ON public.person_profiles
    FOR UPDATE
    USING (account_user_id = auth.uid());

-- Users can delete their own profiles (except primary)
CREATE POLICY "Users can delete own non-primary profiles"
    ON public.person_profiles
    FOR DELETE
    USING (account_user_id = auth.uid() AND is_primary = false);

-- Admins can view all profiles
CREATE POLICY "Admins can view all person profiles"
    ON public.person_profiles
    FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage all profiles
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

-- 5. Add person_profile_id to recommendations (nullable for backward compatibility)
ALTER TABLE public.recommendations 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 6. Add person_profile_id to patient_notes
ALTER TABLE public.patient_notes 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 7. Add person_profile_id to patient_messages
ALTER TABLE public.patient_messages 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 8. Migrate existing patients to person_profiles
-- For each patient, create a primary person_profile
INSERT INTO public.person_profiles (account_user_id, name, is_primary, created_at)
SELECT 
    p.user_id,
    COALESCE(
        CONCAT(pr.first_name, ' ', pr.last_name),
        pr.first_name,
        'Profil główny'
    ),
    true,
    COALESCE(p.created_at, now())
FROM public.patients p
LEFT JOIN public.profiles pr ON p.user_id = pr.user_id
ON CONFLICT DO NOTHING;

-- 9. Update recommendations with person_profile_id based on patient_id
UPDATE public.recommendations r
SET person_profile_id = pp.id
FROM public.patients p
JOIN public.person_profiles pp ON p.user_id = pp.account_user_id AND pp.is_primary = true
WHERE r.patient_id = p.id AND r.person_profile_id IS NULL;

-- 10. Update patient_notes with person_profile_id
UPDATE public.patient_notes pn
SET person_profile_id = pp.id
FROM public.patients p
JOIN public.person_profiles pp ON p.user_id = pp.account_user_id AND pp.is_primary = true
WHERE pn.patient_id = p.id AND pn.person_profile_id IS NULL;

-- 11. Update patient_messages with person_profile_id
UPDATE public.patient_messages pm
SET person_profile_id = pp.id
FROM public.patients p
JOIN public.person_profiles pp ON p.user_id = pp.account_user_id AND pp.is_primary = true
WHERE pm.patient_id = p.id AND pm.person_profile_id IS NULL;

-- 12. Create index for performance
CREATE INDEX idx_person_profiles_account_user_id ON public.person_profiles(account_user_id);
CREATE INDEX idx_recommendations_person_profile_id ON public.recommendations(person_profile_id);
CREATE INDEX idx_patient_notes_person_profile_id ON public.patient_notes(person_profile_id);
CREATE INDEX idx_patient_messages_person_profile_id ON public.patient_messages(person_profile_id);