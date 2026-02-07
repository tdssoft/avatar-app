# Plan migracji z Lovable Cloud do własnej instancji Supabase

## Status: ✅ Zatwierdzony

---

## KROK 1: Utwórz nowy projekt Supabase

1. Przejdź na https://supabase.com i zaloguj się
2. Utwórz nowy projekt (zapamiętaj hasło do bazy!)
3. Zapisz z **Settings → API**:
   - **Project URL** (np. `https://xyz123.supabase.co`)
   - **anon public key** (publiczny klucz)
   - **service_role secret** (tajny klucz - NIGDY nie udostępniaj!)
   - **Project Reference** (np. `xyz123`)

---

## KROK 2: Wykonaj migracje SQL

Przejdź do **SQL Editor** w dashboardzie Supabase i wykonaj poniższe skrypty **KOLEJNO** (każdy jako osobne zapytanie):

### Migracja 1: Storage & Profiles

```sql
-- 1. Bucket na zdjęcia profilowe (publiczny)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- Polityka: użytkownik może wgrać swoje zdjęcie
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Polityka: użytkownik może aktualizować swoje zdjęcie
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Polityka: zdjęcia są publiczne do odczytu
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- 2. Bucket na wyniki badań (prywatny)
INSERT INTO storage.buckets (id, name, public)
VALUES ('results', 'results', false);

-- Polityka: użytkownik może wgrać swoje wyniki
CREATE POLICY "Users can upload their results"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Polityka: użytkownik może czytać tylko swoje wyniki
CREATE POLICY "Users can read their own results"
ON storage.objects FOR SELECT
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Polityka: użytkownik może usuwać swoje wyniki
CREATE POLICY "Users can delete their own results"
ON storage.objects FOR DELETE
USING (bucket_id = 'results' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Tabela na metadane plików wyników
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

-- RLS dla tabeli user_results
ALTER TABLE public.user_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
ON public.user_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
ON public.user_results FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own results"
ON public.user_results FOR DELETE
USING (auth.uid() = user_id);

-- 4. Tabela profiles dla przechowywania avatar_url
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);
```

### Migracja 2: Referrals

```sql
-- Create referrals table
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

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view referrals they made
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Add referral_code column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text;

-- Create index for fast referral code lookup
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
```

### Migracja 3: Referrals Insert Policy

```sql
-- Create a secure INSERT policy - only authenticated users can insert
-- and referred_user_id must match their own ID (prevents spoofing)
CREATE POLICY "Authenticated users can create referrals for themselves"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);
```

### Migracja 4: Unique Indexes

```sql
-- Add unique index on profiles.referral_code (partial - only non-null/non-empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique 
ON public.profiles (referral_code) 
WHERE referral_code IS NOT NULL AND referral_code <> '';

-- Add unique index on referrals.referred_user_id (one referrer per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_user_id_unique 
ON public.referrals (referred_user_id);
```

### Migracja 5: Roles, Patients, Recommendations

```sql
-- Create function to update timestamps (must be first)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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

-- RLS policy for user_roles (only admins can view all, users see their own)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add first_name, last_name, phone to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create patients table (admin's view of patients)
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    subscription_status TEXT DEFAULT 'Brak',
    diagnosis_status TEXT DEFAULT 'Brak',
    last_communication_at TIMESTAMP WITH TIME ZONE,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Patients table RLS - only admins can access
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

-- Create recommendations table
CREATE TABLE public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    created_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    recommendation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    body_systems TEXT[] DEFAULT '{}',
    diagnosis_summary TEXT,
    dietary_recommendations TEXT,
    supplementation_program TEXT,
    shop_links TEXT,
    supporting_therapies TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recommendations"
ON public.recommendations FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
ON public.recommendations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

-- Create patient_notes table
CREATE TABLE public.patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage patient notes"
ON public.patient_notes FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create patient_messages table (SMS and form questions)
CREATE TABLE public.patient_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    admin_id UUID REFERENCES auth.users(id),
    message_type TEXT NOT NULL CHECK (message_type IN ('sms', 'question', 'answer')),
    message_text TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage patient messages"
ON public.patient_messages FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Users can view and send their own messages
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

-- Create partner_shop_links table
CREATE TABLE public.partner_shop_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_url TEXT NOT NULL,
    shop_name TEXT,
    added_by_admin_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.partner_shop_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage partner links"
ON public.partner_shop_links FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own links"
ON public.partner_shop_links FOR SELECT
USING (partner_user_id = auth.uid());

-- Update trigger for patients
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for recommendations
CREATE TRIGGER update_recommendations_updated_at
BEFORE UPDATE ON public.recommendations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### Migracja 6: Admin Profiles Policy

```sql
-- Dodaj politykę RLS dla admina aby mógł widzieć profile pacjentów
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
```

### Migracja 7: Person Profiles

```sql
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

-- 5. Add person_profile_id to recommendations
ALTER TABLE public.recommendations 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 6. Add person_profile_id to patient_notes
ALTER TABLE public.patient_notes 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 7. Add person_profile_id to patient_messages
ALTER TABLE public.patient_messages 
    ADD COLUMN person_profile_id UUID REFERENCES public.person_profiles(id) ON DELETE SET NULL;

-- 8. Create indexes for performance
CREATE INDEX idx_person_profiles_account_user_id ON public.person_profiles(account_user_id);
CREATE INDEX idx_recommendations_person_profile_id ON public.recommendations(person_profile_id);
CREATE INDEX idx_patient_notes_person_profile_id ON public.patient_notes(person_profile_id);
CREATE INDEX idx_patient_messages_person_profile_id ON public.patient_messages(person_profile_id);
```

### Migracja 8: Download Tokens & Access Logs

```sql
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
```

### Migracja 9: Nutrition Interviews & Audio

```sql
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

-- RLS dla audio_recordings
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

-- Storage bucket dla nagrań audio
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-recordings', 'audio-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Polityki storage dla nagrań audio
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
```

### Migracja 10: Tags & Interview History

```sql
-- Add tags column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create nutrition_interview_history table
CREATE TABLE IF NOT EXISTS public.nutrition_interview_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.nutrition_interviews(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS on history table
ALTER TABLE public.nutrition_interview_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage interview history
CREATE POLICY "Admins can manage interview history"
ON public.nutrition_interview_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own interview history
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
```

### Migracja 11: Interview Status

```sql
-- Add status column to nutrition_interviews table
ALTER TABLE nutrition_interviews 
ADD COLUMN status text NOT NULL DEFAULT 'draft';

-- Add constraint to ensure valid status values
ALTER TABLE nutrition_interviews 
ADD CONSTRAINT nutrition_interviews_status_check 
CHECK (status IN ('draft', 'sent'));
```

### Migracja 12: Support Tickets

```sql
-- Create support_tickets table
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

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admin policies
CREATE POLICY "Admins can view all tickets" 
ON public.support_tickets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
```

### Migracja 13: Admin Referrals Policies

```sql
-- Dodanie polityki RLS dla adminów na tabelę referrals (SELECT)
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dodanie polityki UPDATE dla adminów (do zmiany statusu)
CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

---

## KROK 3: Dodaj pierwszego admina

Po wykonaniu wszystkich migracji, dodaj swojego użytkownika jako admina:

```sql
-- Najpierw zarejestruj się w aplikacji, potem znajdź swoje user_id:
-- SELECT id, email FROM auth.users WHERE email = 'twoj@email.com';

-- Następnie dodaj rolę admina:
INSERT INTO public.user_roles (user_id, role) 
VALUES ('TWOJE_USER_ID', 'admin');
```

---

## KROK 4: Deploy Edge Functions

Zainstaluj Supabase CLI i wdróż funkcje:

```bash
# Instalacja CLI
npm install -g supabase

# Logowanie
supabase login

# Link do projektu
supabase link --project-ref TWOJ_PROJECT_REF

# Deploy wszystkich funkcji
supabase functions deploy admin-create-patient
supabase functions deploy admin-delete-user
supabase functions deploy bootstrap-admin
supabase functions deploy create-checkout-session
supabase functions deploy export-data
supabase functions deploy import-patients
supabase functions deploy post-signup
supabase functions deploy repair-referral
supabase functions deploy send-question-notification
supabase functions deploy send-recommendation-email
supabase functions deploy stripe-webhook
supabase functions deploy verify-download-token
```

---

## KROK 5: Konfiguracja sekretów

W Supabase Dashboard → **Settings → Edge Functions → Add Secret**:

| Sekret | Wartość |
|--------|---------|
| `RESEND_API_KEY` | Twój klucz z Resend |
| `STRIPE_SECRET_KEY` | sk_test_... lub sk_live_... |
| `STRIPE_WEBHOOK_SECRET` | whsec_... |

---

## KROK 6: Konfiguracja Auth

W Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `https://app.eavatar.diet`
- **Redirect URLs**:
  - `https://app.eavatar.diet`
  - `https://app.eavatar.diet/`
  - `https://app.eavatar.diet/dashboard`
  - `https://app.eavatar.diet/login`

---

## KROK 7: Konfiguracja Stripe Webhook

W Stripe Dashboard → **Developers → Webhooks**:

1. Dodaj nowy endpoint: `https://TWOJ_PROJECT.supabase.co/functions/v1/stripe-webhook`
2. Wybierz eventy: `invoice.paid`, `checkout.session.completed`
3. Skopiuj Signing Secret i dodaj jako `STRIPE_WEBHOOK_SECRET`

---

## KROK 8: Konfiguracja Resend (domena email)

1. W [Resend Dashboard](https://resend.com/domains) → **Add Domain**
2. Dodaj domenę `eavatar.diet`
3. Dodaj rekordy DNS według instrukcji Resend
4. Po weryfikacji możesz wysyłać z `noreply@eavatar.diet`

---

## KROK 9: Aktualizacja zmiennych środowiskowych

Zaktualizuj `.env` w projekcie (lub zmienne środowiskowe w hostingu):

```env
VITE_SUPABASE_URL="https://TWOJ_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="TWOJ_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="TWOJ_PROJECT_REF"
```

---

## Checklist po migracji

- [ ] Wykonano wszystkie 13 migracji SQL
- [ ] Dodano pierwszego admina do user_roles
- [ ] Wdrożono wszystkie Edge Functions
- [ ] Skonfigurowano sekrety (Resend, Stripe)
- [ ] Skonfigurowano Auth URLs
- [ ] Skonfigurowano Stripe Webhook
- [ ] Zweryfikowano domenę w Resend
- [ ] Zaktualizowano zmienne środowiskowe
- [ ] Przetestowano logowanie/rejestrację
- [ ] Przetestowano płatności
- [ ] Przetestowano wysyłkę emaili
