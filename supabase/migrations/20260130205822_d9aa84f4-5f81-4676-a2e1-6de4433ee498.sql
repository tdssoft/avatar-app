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