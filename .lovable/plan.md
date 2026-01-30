
# Plan: Funkcjonalność wgrywania zdjęć i wyników badań

## Podsumowanie

Zaimplementuję dwie funkcjonalności:
1. **Wgrywanie zdjęcia profilowego** - kliknięcie "Wgraj swoje zdjęcie" otwiera okno wyboru pliku, zdjęcie zapisywane jest w Supabase Storage
2. **Wgrywanie wyników badań** - drag & drop lub kliknięcie, pliki zapisywane w Supabase Storage

---

## Wymagane: Włączenie Lovable Cloud (Supabase)

Przed implementacją muszę włączyć Lovable Cloud aby mieć dostęp do:
- **Supabase Storage** do przechowywania przesłanych zdjęć i plików
- **Bazy danych** do zapisywania informacji o przesłanych plikach

---

## Faza 1: Konfiguracja Supabase Storage

### Migracje SQL:

**1. Bucket na zdjęcia profilowe:**
```sql
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
```

**2. Bucket na wyniki badań:**
```sql
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
```

**3. Tabela na metadane plików wyników:**
```sql
CREATE TABLE public.user_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_file_path CHECK (file_path <> '')
);

-- RLS
ALTER TABLE public.user_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own results"
ON public.user_results FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own results"
ON public.user_results FOR SELECT
USING (auth.uid() = user_id);
```

---

## Faza 2: Komponent wgrywania zdjęcia

### Nowy plik: `src/components/dashboard/PhotoUpload.tsx`

Komponent obsługujący:
- Ukryty `<input type="file" accept="image/*">`
- Kliknięcie "Wgraj swoje zdjęcie" otwiera okno wyboru pliku
- Po wybraniu pliku:
  1. Walidacja typu i rozmiaru (max 5MB, tylko obrazy)
  2. Upload do Supabase Storage (bucket: `avatars/{user_id}/avatar.jpg`)
  3. Wyświetlenie podglądu okrągłego zdjęcia
- Stan ładowania podczas uploadu
- Obsługa błędów z toastem

**Struktura:**
```text
+-------------------------+
| Twoje zdjęcie ⓘ        |
+-------------------------+
| [Okrągły podgląd/ikona] |
| Wgraj swoje zdjęcie     |
+-------------------------+
```

---

## Faza 3: Komponent wgrywania wyników badań

### Nowy plik: `src/components/dashboard/ResultsUpload.tsx`

Komponent obsługujący:
- Obszar drag & drop z przerywaną ramką
- Przycisk "Wybierz pliki"
- Po wybraniu/upuszczeniu plików:
  1. Walidacja (PDF, JPG, PNG, max 10MB na plik)
  2. Upload do Supabase Storage (bucket: `results/{user_id}/{filename}`)
  3. Zapis metadanych do tabeli `user_results`
  4. Wyświetlenie listy przesłanych plików
- Obsługa wielu plików jednocześnie
- Pasek postępu podczas uploadu

**Struktura:**
```text
+------------------------------------------------+
| Jeśli posiadasz wyniki poprzednich badań,       |
| wgraj je tutaj:                                  |
+------------------------------------------------+
| +--------------------------------------------+ |
| |                   ⬆                        | |
| |     Przeciągnij pliki tutaj lub kliknij    | |
| |                                            | |
| |           [ Wybierz pliki ]                | |
| +--------------------------------------------+ |
|                                                |
| Przesłane pliki:                               |
| - wynik_krwi.pdf  ✓                            |
| - rtg_pluc.jpg    ✓                            |
+------------------------------------------------+
```

---

## Faza 4: Integracja w Dashboard

### Plik: `src/pages/Dashboard.tsx`

**Zmiany:**
1. Import komponentów `PhotoUpload` i `ResultsUpload`
2. Zastąpienie statycznej karty "Twoje zdjęcie" komponentem `PhotoUpload`
3. Zastąpienie statycznego obszaru upload komponentem `ResultsUpload`

---

## Faza 5: Integracja w Results

### Plik: `src/pages/Results.tsx`

**Zmiany:**
1. Import komponentu `PhotoUpload`
2. Zastąpienie panelu bocznego "Twoje zdjęcie" komponentem `PhotoUpload`

---

## Struktura plików

```text
src/
├── components/
│   └── dashboard/
│       ├── PhotoUpload.tsx (NOWY)
│       ├── ResultsUpload.tsx (NOWY)
│       └── PlanCard.tsx (bez zmian)
├── pages/
│   ├── Dashboard.tsx (MODYFIKACJA)
│   └── Results.tsx (MODYFIKACJA)
└── integrations/
    └── supabase/ (UTWORZONE PRZEZ LOVABLE CLOUD)
        ├── client.ts
        └── types.ts

supabase/
└── migrations/
    └── XXXXXX_storage_buckets.sql (NOWY)
```

---

## Przepływ użytkownika

### Wgrywanie zdjęcia:
1. Użytkownik klika "Wgraj swoje zdjęcie"
2. Otwiera się systemowe okno wyboru pliku (tylko obrazy)
3. Użytkownik wybiera zdjęcie
4. Pojawia się spinner ładowania
5. Zdjęcie jest wgrywane do Supabase Storage
6. Okrągły podgląd zdjęcia pojawia się w karcie
7. Toast: "Zdjęcie zostało zapisane"

### Wgrywanie wyników:
1. Użytkownik przeciąga plik lub klika "Wybierz pliki"
2. Otwiera się okno wyboru (PDF, obrazy)
3. Użytkownik wybiera jeden lub więcej plików
4. Pasek postępu pokazuje upload
5. Pliki są zapisywane w Supabase Storage
6. Metadane są zapisywane w bazie danych
7. Lista przesłanych plików aktualizuje się
8. Toast: "Pliki zostały przesłane"

---

## Kolejność implementacji

1. Włączenie Lovable Cloud (Supabase)
2. Utworzenie migracji SQL (buckety storage + tabela metadanych)
3. Utworzenie komponentu `PhotoUpload`
4. Utworzenie komponentu `ResultsUpload`
5. Integracja komponentów w Dashboard
6. Integracja PhotoUpload w Results
