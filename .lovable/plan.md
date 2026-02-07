
# Plan migracji z Lovable Cloud do własnej instancji Supabase

## Podsumowanie

Przeniesienie całej infrastruktury backendowej (baza danych, Edge Functions, Storage, sekrety) z Lovable Cloud do własnego projektu Supabase. Proces wymaga kilku kroków manualnych po stronie użytkownika.

---

## Krok 1: Utworzenie projektu Supabase

1. Przejdź na https://supabase.com i zaloguj się
2. Utwórz nowy projekt (zapamiętaj hasło do bazy!)
3. Po utworzeniu, zapisz z ustawień projektu:
   - **Project URL** (np. `https://xyz123.supabase.co`)
   - **Anon Key** (publiczny klucz)
   - **Service Role Key** (tajny klucz - NIGDY nie udostępniaj!)

---

## Krok 2: Migracja schematu bazy danych

Wszystkie migracje znajdują się w folderze `supabase/migrations/`. Musisz je wykonać w kolejności w SQL Editor nowego projektu:

**Kolejność plików do wykonania:**
1. `20260130205822_*.sql` - Storage buckets, profiles, user_results
2. `20260131070853_*.sql` - Tabela referrals
3. `20260131070939_*.sql` - Poprawka polityk referrals
4. `20260131073212_*.sql` - Unikalne indeksy
5. `20260131080435_*.sql` - Role, patients, recommendations, notes, messages
6. `20260131081934_*.sql` - Admin profiles policy
7. `20260202181017_*.sql` - Person profiles (multi-profil)
8. `20260202184131_*.sql` - Download tokens, access logs
9. `20260202184742_*.sql` - Nutrition interviews, audio recordings
10. `20260202194748_*.sql` - Tags, interview history
11. `20260202200721_*.sql` - Interview status
12. `20260202203953_*.sql` - Support tickets
13. `20260204080242_*.sql` - Admin referrals policies

---

## Krok 3: Migracja danych (opcjonalnie)

Jeśli masz istniejące dane w Lovable Cloud, musisz je wyeksportować:

1. Użyj funkcji eksportu w Cloud Dashboard dla każdej tabeli
2. Zaimportuj dane do nowego Supabase przez SQL Editor lub CSV import

---

## Krok 4: Konfiguracja Storage Buckets

Buckets są tworzone przez migracje, ale upewnij się że istnieją:
- `avatars` (publiczny)
- `results` (prywatny)
- `audio-recordings` (prywatny)

---

## Krok 5: Deploy Edge Functions

Edge Functions muszą być wdrożone przez Supabase CLI:

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

## Krok 6: Konfiguracja sekretów w Supabase

Przejdź do **Settings → Edge Functions** w dashboardzie Supabase i dodaj sekrety:

| Sekret | Opis |
|--------|------|
| `RESEND_API_KEY` | Klucz API Resend do wysyłki emaili |
| `STRIPE_SECRET_KEY` | Klucz tajny Stripe (sk_test_* lub sk_live_*) |
| `STRIPE_WEBHOOK_SECRET` | Sekret webhooka Stripe (whsec_*) |

**SUPABASE_URL**, **SUPABASE_ANON_KEY**, **SUPABASE_SERVICE_ROLE_KEY** są automatycznie dostępne w Edge Functions.

---

## Krok 7: Aktualizacja kodu aplikacji

Zmień plik `.env` (lub zmienne środowiskowe):

```env
VITE_SUPABASE_URL="https://TWOJ_PROJECT.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="TWOJ_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="TWOJ_PROJECT_REF"
```

---

## Krok 8: Konfiguracja Auth

W dashboardzie Supabase przejdź do **Authentication → URL Configuration**:

1. **Site URL**: `https://app.eavatar.diet` (lub URL aplikacji)
2. **Redirect URLs**: 
   - `https://app.eavatar.diet`
   - `https://app.eavatar.diet/`
   - `https://app.eavatar.diet/dashboard`

---

## Krok 9: Konfiguracja Stripe Webhook

1. W Stripe Dashboard przejdź do **Developers → Webhooks**
2. Dodaj nowy endpoint:
   - **URL**: `https://TWOJ_PROJECT.supabase.co/functions/v1/stripe-webhook`
   - **Events**: `invoice.paid`, `checkout.session.completed`
3. Skopiuj **Signing secret** i dodaj jako `STRIPE_WEBHOOK_SECRET`

---

## Krok 10: Konfiguracja Resend (domena email)

Dla domeny `app.eavatar.diet`:

1. W Resend Dashboard → Domains → Add Domain
2. Dodaj domenę `eavatar.diet`
3. Skonfiguruj rekordy DNS (SPF, DKIM, DMARC)
4. Po weryfikacji możesz wysyłać z adresów @eavatar.diet

---

## Sekcja techniczna

### Struktura bazy danych

```text
┌─────────────────────┐     ┌──────────────────┐
│     profiles        │     │    user_roles    │
│ (dane użytkownika)  │     │ (admin/user)     │
└─────────────────────┘     └──────────────────┘
          │                          │
          └──────────┬───────────────┘
                     │
          ┌──────────▼──────────┐
          │      patients       │
          │ (widok admina)      │
          └─────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────┐   ┌──────▼──────┐  ┌─────▼─────┐
│ person_ │   │recommendations│  │ patient_  │
│ profiles│   └─────────────┘  │ messages  │
└─────────┘                    └───────────┘
```

### Edge Functions do wdrożenia

| Funkcja | Opis |
|---------|------|
| `post-signup` | Tworzenie profilu po rejestracji |
| `bootstrap-admin` | Inicjalizacja konta admina |
| `create-checkout-session` | Sesja płatności Stripe |
| `stripe-webhook` | Obsługa webhooków Stripe |
| `send-recommendation-email` | Wysyłka emaili z zaleceniami |
| `admin-create-patient` | Tworzenie pacjenta przez admina |
| `admin-delete-user` | Usuwanie użytkownika |
| `export-data` | Eksport danych |
| `import-patients` | Import pacjentów |

### Wymagane rekordy DNS dla Resend (domena eavatar.diet)

Po dodaniu domeny w Resend otrzymasz:
- **SPF**: `v=spf1 include:amazonses.com ~all`
- **DKIM**: klucz CNAME dla `resend._domainkey.eavatar.diet`
- **DMARC**: `v=DMARC1; p=none;` (opcjonalnie)

---

## Następne kroki po migracji

1. Przetestuj logowanie/rejestrację
2. Przetestuj przepływ płatności
3. Sprawdź wysyłkę emaili
4. Zweryfikuj dostęp admina
5. Usuń połączenie z Lovable Cloud (Settings → Connectors → Disable)

