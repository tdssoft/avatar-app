
# Plan rozbudowy aplikacji AVATAR

## Analiza obecnego stanu

### Aktualny model danych:
- **auth.users** - konta Supabase Auth (email, hasło)
- **profiles** - dane osobowe (first_name, last_name, phone, avatar_url, referral_code) - 1:1 z auth.users
- **patients** - rekord pacjenta (subscription_status, diagnosis_status) - 1:1 z auth.users
- **recommendations** - zalecenia przypisane do patients
- **patient_notes** / **patient_messages** - komunikacja przypisana do patients

### Problemy do rozwiązania:
1. Brak modelu rodzic + profile dzieci (duplikacja maili)
2. Brak importu istniejących klientów
3. Zalecenia bez powiadomień email i bezpiecznego pobierania
4. Brak wywiadu żywieniowego
5. Brak nagrywania audio
6. Brak eksportu danych
7. Hardkodowany link Stripe (problem z powrotem)

---

## FAZA 1: Struktura kont - rodzic + profile dzieci

### 1.1 Migracja bazy danych

Nowe tabele:

```text
person_profiles (nowa tabela - profile osób)
├── id (uuid, PK)
├── account_user_id (uuid, FK -> auth.users) -- konto właściciela
├── name (text) -- imię osoby
├── birth_date (date, nullable)
├── gender (text, nullable) -- 'male', 'female', 'other'
├── notes (text, nullable)
├── is_primary (boolean, default false) -- czy to główny profil konta
├── created_at, updated_at
```

Modyfikacje istniejących tabel:
- **recommendations**: dodać `person_profile_id` (FK -> person_profiles)
- **patient_notes**: dodać `person_profile_id`
- **patient_messages**: dodać `person_profile_id`

### 1.2 Migracja danych (kompatybilność wsteczna)
- Dla każdego istniejącego `patients` utworzyć `person_profiles` z `is_primary = true`
- Skopiować imię/nazwisko z `profiles` do `person_profiles.name`
- Zaktualizować FK w recommendations, notes, messages

### 1.3 Zmiany UI pacjenta

Nowa sekcja w Dashboard/Profile:
- **"Moje profile"** - lista osób przypisanych do konta
- Formularz dodawania/edycji profilu (imię, data urodzenia, płeć, notatki)
- Selektor aktywnego profilu w headerze (przy avatar)

### 1.4 RLS Policies
- Pacjent widzi tylko swoje person_profiles (account_user_id = auth.uid())
- Admin widzi wszystkie profile

---

## FAZA 2: Import istniejącej bazy klientów

### 2.1 Nowa strona admina: `/admin/import`

UI:
- Przycisk "Wybierz plik CSV"
- Mapowanie kolumn (drag & drop lub select)
- Podgląd danych przed importem
- Przycisk "Importuj"

### 2.2 Edge function: `import-patients`

Logika:
1. Parsowanie CSV
2. Walidacja danych
3. Dla każdego wiersza:
   - Sprawdź czy email istnieje -> przypisz do istniejącego Account
   - Jeśli dziecko -> utwórz person_profile pod kontem rodzica
   - Brak maila -> rekord do uzupełnienia (status "incomplete")
4. Zwróć raport: dodane, zaktualizowane, błędy

### 2.3 Raport importu
- Statystyki (dodane konta, profile, zaktualizowane, błędy)
- Eksport błędów do CSV

---

## FAZA 3: Zalecenia + email + bezpieczne pobieranie

### 3.1 Rozszerzenie tabeli recommendations

```text
recommendations (rozszerzenie)
├── title (text) -- tytuł zalecenia
├── content (text) -- treść rich text (markdown)
├── tags (text[]) -- tagi
├── download_token (uuid, unique) -- token do bezpiecznego pobierania
├── token_expires_at (timestamptz)
├── person_profile_id (uuid, FK) -- przypisanie do profilu osoby
```

### 3.2 Edge function: `send-recommendation-email`

Po zapisie zalecenia:
- Generuj signed token z czasem ważności (np. 7 dni)
- Wyślij email do Account z CTA "Pobierz zalecenie"
- Link kieruje do `/recommendation/download?token=XXX`

### 3.3 Tabela logów dostępu

```text
recommendation_access_log
├── id (uuid)
├── recommendation_id (uuid, FK)
├── person_profile_id (uuid, FK)
├── access_type ('view' | 'download')
├── ip_address (inet)
├── user_agent (text)
├── accessed_at (timestamptz)
```

### 3.4 UI pacjenta: "Moje zalecenia"
- Lista zaleceń per profil
- Filtry (data, tagi)
- Podgląd / pobieranie PDF

---

## FAZA 4: Wywiad żywieniowy

### 4.1 Nowa tabela

```text
nutrition_interviews
├── id (uuid)
├── person_profile_id (uuid, FK)
├── content (jsonb) -- struktura wywiadu
├── last_updated_at (timestamptz)
├── last_updated_by (uuid, FK -> auth.users)
├── created_at (timestamptz)
```

### 4.2 UI pacjenta
- Strona `/dashboard/interview` - widok i edycja wywiadu
- Formularz z sekcjami (preferencje, alergie, nawyki, itp.)

### 4.3 UI admina
- W profilu pacjenta: zakładka "Wywiad"
- Edycja z historią zmian

### 4.4 RLS
- Pacjent: widzi i edytuje swoje wywiady
- Admin: pełny dostęp

---

## FAZA 5: Nagrywanie audio

### 5.1 Nowa tabela

```text
audio_recordings
├── id (uuid)
├── person_profile_id (uuid, FK)
├── recommendation_id (uuid, FK, nullable)
├── interview_id (uuid, FK, nullable)
├── file_path (text) -- ścieżka w storage
├── duration_seconds (integer)
├── recorded_by (uuid, FK -> auth.users)
├── recorded_at (timestamptz)
├── notes (text, nullable)
```

### 5.2 Storage bucket
- `audio-recordings` (prywatny)

### 5.3 Komponent AudioRecorder
- Nagrywanie przez MediaRecorder API
- Przycisk Start/Stop
- Podgląd z odtwarzaniem
- Zapis do Supabase Storage

### 5.4 Integracja
- Profil pacjenta (admin): sekcja "Nagrania"
- Wywiad żywieniowy: możliwość dołączenia notatki audio
- Zalecenia: możliwość dołączenia audio

---

## FAZA 6: Eksport danych CSV

### 6.1 Strona admina: `/admin/export`

UI:
- Wybór zakresu (wszystko / filtry)
- Wybór pól do eksportu (checkboxy)
- Przycisk "Generuj CSV"

### 6.2 Edge function: `export-data`

Logika:
- Pobierz dane wg filtrów
- Jeden wiersz = jeden profil osoby
- Kolumny: email konta, dane profilu, statystyki

---

## FAZA 7: Zmiany UI i nazewnictwa

### 7.1 Dashboard pacjenta
- Zmiana tekstu: "Wybierz odpowiedni program" na "plan, aby rozpocząć diagnostykę"
- Nowe nagłówki: "Twoja ścieżka pracy z ciałem", "Indywidualny program wsparcia ciała"

### 7.2 Pakiet regeneracyjny
- Dodać elementy: "Jadłospis", "Niedobory"
- Zachować spójny styl z innymi pakietami

### 7.3 Selektor profilu w headerze
- Dropdown przy avatar z listą profili
- Możliwość przełączenia aktywnego profilu

---

## FAZA 8: Panel admin - ulepszenia

### 8.1 Widok szczegółów konta
- Zakładki: Profile | Zalecenia | Wywiad | Notatki | Nagrania

### 8.2 Wyszukiwarka i filtry
- Globalna wyszukiwarka (imię, email, telefon)
- Filtry: status subskrypcji, data, tagi

### 8.3 System tagów
- Możliwość przypisania tagów do pacjentów/profili
- Filtrowanie po tagach

---

## FAZA 9: Fix Stripe - relatywne URL powrotu

### 9.1 Problem
Aktualnie hardkodowany link do Stripe checkout z powrotem na eavatar.diet

### 9.2 Rozwiązanie
- Edge function `create-checkout-session` z dynamicznymi URL
- `success_url`: `${origin}/payment/success`
- `cancel_url`: `${origin}/dashboard`

---

## Wymagania techniczne

### Bezpieczeństwo
- RLS na wszystkich nowych tabelach
- Walidacja tokenów w edge functions
- Logi audytowe (recommendation_access_log, audio_recordings.recorded_by)

### Responsywność
- Wszystkie nowe komponenty muszą działać na mobile web

### Migracje wstecznie kompatybilne
- Nowe kolumny nullable lub z default
- Skrypty migracji istniejących danych

---

## Lista migracji bazy danych

1. `create_person_profiles` - nowa tabela person_profiles
2. `migrate_patients_to_profiles` - migracja istniejących pacjentów
3. `add_person_profile_to_recommendations` - FK w recommendations
4. `create_nutrition_interviews` - tabela wywiadów
5. `create_audio_recordings` - tabela nagrań
6. `create_recommendation_access_log` - logi dostępu
7. `add_recommendation_tokens` - tokeny do zaleceń
8. `create_patient_tags` - system tagów

## Lista endpointów (Edge Functions)

1. `import-patients` - import CSV
2. `export-data` - eksport CSV
3. `send-recommendation-email` - powiadomienia o zaleceniach
4. `verify-download-token` - weryfikacja tokenu pobierania
5. `create-checkout-session` - dynamiczny Stripe checkout

## Checklista testów end-to-end

- [x] Import CSV z poprawnymi danymi
- [x] Import CSV z błędami (raport)
- [x] Dodawanie profilu dziecka
- [x] Przełączanie aktywnego profilu
- [x] Tworzenie zalecenia z emailem
- [x] Pobieranie zalecenia przez token
- [ ] Wygaśnięcie tokenu
- [x] Edycja wywiadu przez pacjenta
- [x] Edycja wywiadu przez admina
- [x] Nagrywanie audio (start/stop/save)
- [x] Odsłuch nagrania
- [x] Eksport CSV z filtrami
- [x] Stripe checkout z powrotem na /dashboard
- [x] Zmiany UI i nazewnictwa (Faza 7)
- [x] Wyszukiwarka i filtry w panelu admin (Faza 8.2)
- [ ] Responsywność na mobile

---

## Kolejność implementacji

Ze względu na złożoność, rekomenduję realizację w fazach:

**Sprint 1 (Fundament):**
- Faza 1: Model rodzic + profile
- Faza 9: Fix Stripe

**Sprint 2 (Zalecenia):**
- Faza 3: Zalecenia + email + bezpieczne pobieranie

**Sprint 3 (Wywiad + Audio):**
- Faza 4: Wywiad żywieniowy
- Faza 5: Nagrywanie audio

**Sprint 4 (Admin tools):**
- Faza 2: Import CSV
- Faza 6: Eksport CSV
- Faza 8: Panel admin - ulepszenia

**Sprint 5 (Polish):**
- Faza 7: Zmiany UI i nazewnictwa
