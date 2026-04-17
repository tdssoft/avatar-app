# ⚠️ UWAGA - Konfiguracja Edge Functions dla Railway

## 🔍 Problem

Projekt używa **Railway** jako hosta dla Supabase, nie Supabase Cloud.
W związku z tym, zmienne środowiskowe dla Edge Functions muszą być ustawione w **Railway**, nie przez Supabase CLI.

## ✅ ROZWIĄZANIE - Konfiguracja w Railway

### Opcja 1: Railway Dashboard (Zalecane)

1. **Zaloguj się do Railway:** https://railway.app
2. **Wybierz projekt:** Znajdź projekt z Supabase
3. **Przejdź do Variables:**
   - Kliknij na service (kong/postgres)
   - Wybierz zakładkę "Variables"
4. **Dodaj zmienne:**

```
RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE
RESEND_FROM_EMAIL=AVATAR <alan.urban23@gmail.com>
RESEND_REPLY_TO=alan.urban23@gmail.com
ADMIN_EMAIL=alan.urban23@gmail.com
APP_URL=https://app.eavatar.diet
SUPABASE_URL=https://kong-production-d36f.up.railway.app
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

5. **Zapisz i restart:** Railway automatycznie zrestartuje service

### Opcja 2: Railway CLI

```bash
# Zainstaluj Railway CLI
npm i -g @railway/cli

# Zaloguj się
railway login

# Link do projektu
railway link

# Dodaj zmienne
railway variables set RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE
railway variables set "RESEND_FROM_EMAIL=AVATAR <alan.urban23@gmail.com>"
railway variables set RESEND_REPLY_TO=alan.urban23@gmail.com
railway variables set ADMIN_EMAIL=alan.urban23@gmail.com
railway variables set APP_URL=https://app.eavatar.diet
```

### Opcja 3: Plik .env w Railway

1. Utwórz plik z zmiennymi
2. Upload przez Railway Dashboard
3. Railway automatycznie załaduje zmienne

## 📦 Edge Functions w Railway

Edge Functions w Railway działają inaczej niż w Supabase Cloud:

### Jak to działa:
- Edge Functions są wdrożone jako część Supabase service
- Zmienne środowiskowe są współdzielone z głównym Supabase
- Nie trzeba osobno deployować funkcji

### Gdzie są funkcje:
```
supabase/functions/
├── send-recommendation-email/
├── send-question-notification/
└── _shared/
```

### Dostęp do funkcji:
```
https://kong-production-d36f.up.railway.app/functions/v1/[nazwa-funkcji]
```

## 🧪 Testowanie

### Test wysyłki email (z terminala):

```bash
# Test rekomendacji
curl -X POST https://kong-production-d36f.up.railway.app/functions/v1/send-recommendation-email \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recommendation_id": "test-uuid",
    "is_update": false
  }'

# Test powiadomienia
curl -X POST https://kong-production-d36f.up.railway.app/functions/v1/send-question-notification \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "patient_question",
    "user_email": "test@example.com",
    "user_name": "Test User",
    "message": "Test question"
  }'
```

## 🔍 Sprawdzanie logów

### Railway Dashboard:
1. Przejdź do projektu
2. Wybierz service
3. Kliknij "Deployments"
4. Zobacz logi w czasie rzeczywistym

### Railway CLI:
```bash
railway logs
```

## ⚠️ WAŻNE - Weryfikacja domeny

Gmail (`alan.urban23@gmail.com`) **NIE MOŻE** być używany jako nadawca w Resend.com!

### Rozwiązanie:

#### Opcja A: Użyj domeny eavatar.diet (ZALECANE)

1. **Dodaj domenę w Resend:**
   - Zaloguj się do https://resend.com
   - Przejdź do "Domains"
   - Kliknij "Add Domain"
   - Wpisz: `eavatar.diet`

2. **Skonfiguruj DNS:**
   Dodaj następujące rekordy w swoim DNS (u dostawcy domeny):
   ```
   TXT  _resend  [wartość z Resend]
   TXT  resend   [wartość SPF z Resend]
   ```

3. **Zweryfikuj domenę:**
   - W Resend kliknij "Verify"
   - Poczekaj na propagację DNS (do 48h)

4. **Zmień FROM email:**
   ```env
   RESEND_FROM_EMAIL=AVATAR <noreply@eavatar.diet>
   ```

   Zaktualizuj w:
   - `.env` (lokalnie)
   - Railway Variables
   - `supabase/functions/_shared/email-config.ts`

#### Opcja B: Testowy email Resend (TYLKO TESTY)

Resend pozwala wysyłać z `onboarding@resend.dev` bez weryfikacji:
```env
RESEND_FROM_EMAIL=AVATAR <onboarding@resend.dev>
```

**Ograniczenia:**
- Max 100 emaili/dzień
- Może trafiać do SPAM
- Tylko do testów!

## ✅ Checklist

- [x] API Key Resend skonfigurowany lokalnie
- [x] Zmienne email w .env
- [x] Defaults w email-config.ts zaktualizowane
- [ ] **Zmienne ustawione w Railway** ← **ZRÓB TO!**
- [ ] **Domena zweryfikowana w Resend** ← **WAŻNE!**
- [ ] Testy wysyłki przeprowadzone
- [ ] Logi sprawdzone

## 📚 Dodatkowe zasoby

- **Railway Docs:** https://docs.railway.app
- **Resend Docs:** https://resend.com/docs
- **Resend Domain Setup:** https://resend.com/docs/dashboard/domains/introduction

---

**Aktualizacja:** 2026-02-08
**Status:** Wymaga konfiguracji w Railway Dashboard
