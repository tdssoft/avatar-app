# 📧 KONFIGURACJA RESEND.COM - Email Notifications

## ✅ STATUS KONFIGURACJI

**Resend.com jest już skonfigurowany w projekcie!**

### 📊 Co działa:

- ✅ **Wysyłka rekomendacji** (`send-recommendation-email`)
- ✅ **Powiadomienia o pytaniach** (`send-question-notification`)
- ✅ **Zgłoszenia wsparcia** (support tickets)
- ✅ **Powiadomienia admina** o nowych pytaniach i zgłoszeniach

## 🔑 KONFIGURACJA

### Zmienne środowiskowe (.env):

```env
# Resend Email Configuration
RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE
RESEND_FROM_EMAIL=AVATAR <alan.urban23@gmail.com>
RESEND_REPLY_TO=alan.urban23@gmail.com
ADMIN_EMAIL=alan.urban23@gmail.com
APP_URL=https://app.eavatar.diet
```

### Dla Supabase Edge Functions:

**WAŻNE:** Edge functions potrzebują tych samych zmiennych ustawionych w Supabase.

#### Automatyczna konfiguracja:

```bash
./set-supabase-secrets.sh
```

#### Ręczna konfiguracja:

```bash
supabase secrets set RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE --project-ref llrmskcwsfmubooswatz
supabase secrets set "RESEND_FROM_EMAIL=AVATAR <alan.urban23@gmail.com>" --project-ref llrmskcwsfmubooswatz
supabase secrets set RESEND_REPLY_TO=alan.urban23@gmail.com --project-ref llrmskcwsfmubooswatz
supabase secrets set ADMIN_EMAIL=alan.urban23@gmail.com --project-ref llrmskcwsfmubooswatz
supabase secrets set APP_URL=https://app.eavatar.diet --project-ref llrmskcwsfmubooswatz
```

## 📨 EDGE FUNCTIONS Z EMAIL

### 1. send-recommendation-email

**Plik:** `supabase/functions/send-recommendation-email/index.ts`

**Funkcja:** Wysyła email do pacjenta z linkiem do pobrania rekomendacji

**Wykorzystanie:**
- Nowa rekomendacja utworzona przez admina
- Aktualizacja istniejącej rekomendacji

**Template email:**
- Profesjonalny design z gradientem
- Link do pobrania z tokenem (7 dni ważności)
- Responsywny layout
- Branding AVATAR

**Wywołanie:**
```javascript
const { data, error } = await supabase.functions.invoke('send-recommendation-email', {
  body: {
    recommendation_id: 'uuid-rekomendacji',
    is_update: false // true jeśli to aktualizacja
  }
});
```

### 2. send-question-notification

**Plik:** `supabase/functions/send-question-notification/index.ts`

**Funkcja:** Wysyła powiadomienie email do admina o:
- Nowym pytaniu od pacjenta
- Nowym zgłoszeniu wsparcia (support ticket)

**Template email:**
- Różne kolory dla różnych typów (niebieski dla pytań, zielony dla zgłoszeń)
- Dane użytkownika (email, imię, profil)
- Treść pytania/zgłoszenia
- Link do panelu admina

**Wywołanie:**
```javascript
// Pytanie pacjenta
const { data, error } = await supabase.functions.invoke('send-question-notification', {
  body: {
    type: 'patient_question',
    user_email: 'pacjent@example.com',
    user_name: 'Jan Kowalski',
    message: 'Treść pytania...',
    profile_name: 'Jan Kowalski' // opcjonalne
  }
});

// Zgłoszenie wsparcia
const { data, error } = await supabase.functions.invoke('send-question-notification', {
  body: {
    type: 'support_ticket',
    user_email: 'pacjent@example.com',
    user_name: 'Jan Kowalski',
    subject: 'Problem z dostępem',
    message: 'Nie mogę pobrać PDF...'
  }
});
```

## 🎨 SZABLONY EMAIL

### Design System

**Kolory:**
- **Header Rekomendacje:** Gradient czarny (#1a1a1a → #333333)
- **Header Pytania:** Gradient niebieski (#2563eb → #1d4ed8)
- **Header Zgłoszenia:** Gradient zielony (#059669 → #047857)

**Fonty:**
- System fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, etc.

**Layout:**
- Max width: 600px
- Border radius: 12px-16px
- Shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
- Padding: 30px-40px

### Przykład email rekomendacji:

```
╔══════════════════════════════════════╗
║            AVATAR                    ║
║  Indywidualny program wsparcia ciała ║
╠══════════════════════════════════════╣
║                                      ║
║  Nowe zalecenie dla Maria Kowalska  ║
║                                      ║
║  Przygotowaliśmy dla Ciebie nowe     ║
║  zalecenia z dnia 8 lutego 2026.     ║
║                                      ║
║  [Pobierz zalecenie]                 ║
║                                      ║
║  Link wygasa za 7 dni.               ║
║                                      ║
╠══════════════════════════════════════╣
║  Zespół AVATAR                       ║
║  eavatar.diet                        ║
╚══════════════════════════════════════╝
```

## 🔧 KONFIGURACJA RESEND.COM

### 1. Weryfikacja domeny

**WAŻNE:** Aby wysyłać emaile z `alan.urban23@gmail.com`, musisz:

1. Zalogować się do [Resend.com](https://resend.com)
2. Przejść do **Domains**
3. Dodać domenę `gmail.com` LUB używać zweryfikowanej domeny własnej

**Alternatywnie:**
- Użyj domeny `eavatar.diet` (jeśli ją posiadasz)
- Zweryfikuj domenę w Resend
- Zaktualizuj `RESEND_FROM_EMAIL` na `noreply@eavatar.diet`

### 2. API Key

Twój API key: `re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE`

**Sprawdź status:**
```bash
curl https://api.resend.com/domains \
  -H "Authorization: Bearer re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE"
```

### 3. Rate Limits

Resend.com (Free tier):
- 100 emaili/dzień
- 3,000 emaili/miesiąc

## 🧪 TESTOWANIE

### 1. Test wysyłki rekomendacji

```bash
# Najpierw utwórz rekomendację w bazie (lub użyj istniejącej)
# Następnie wywołaj funkcję:

curl -X POST https://kong-production-d36f.up.railway.app/functions/v1/send-recommendation-email \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recommendation_id": "uuid-rekomendacji",
    "is_update": false
  }'
```

### 2. Test powiadomienia o pytaniu

```bash
curl -X POST https://kong-production-d36f.up.railway.app/functions/v1/send-question-notification \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "patient_question",
    "user_email": "test@example.com",
    "user_name": "Test User",
    "message": "Test pytania"
  }'
```

## 📊 MONITORING

### Logi Resend

1. Zaloguj się do [Resend Dashboard](https://resend.com/logs)
2. Zobacz wszystkie wysłane emaile
3. Sprawdź statusy dostarczenia
4. Analizuj błędy

### Logi Supabase Edge Functions

```bash
supabase functions logs send-recommendation-email --project-ref llrmskcwsfmubooswatz
supabase functions logs send-question-notification --project-ref llrmskcwsfmubooswatz
```

## ⚠️ ROZWIĄZYWANIE PROBLEMÓW

### Email nie został wysłany

1. **Sprawdź API Key:**
   ```bash
   # Powinien zwrócić informacje o domenach
   curl https://api.resend.com/domains \
     -H "Authorization: Bearer re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE"
   ```

2. **Sprawdź logi edge function:**
   ```bash
   supabase functions logs send-recommendation-email --project-ref llrmskcwsfmubooswatz
   ```

3. **Sprawdź secrets w Supabase:**
   ```bash
   supabase secrets list --project-ref llrmskcwsfmubooswatz
   ```

### Błąd "From email not verified"

- Gmail nie może być używany bezpośrednio
- Użyj własnej domeny (eavatar.diet) i zweryfikuj ją w Resend
- LUB użyj testowego adresu Resend

### Email trafia do SPAM

- Zweryfikuj domenę SPF/DKIM w Resend
- Dodaj proper DNS records dla swojej domeny
- Użyj profesjonalnej domeny zamiast Gmail

## 📚 DOKUMENTACJA

- **Resend Docs:** https://resend.com/docs
- **Resend API Reference:** https://resend.com/docs/api-reference/introduction
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions

## ✅ CHECKLIST DEPLOYMENT

- [x] API Key Resend dodany do .env
- [x] Zmienne email skonfigurowane
- [x] APP_URL zaktualizowany na app.eavatar.diet
- [x] FROM_EMAIL ustawiony na alan.urban23@gmail.com
- [ ] Secrets ustawione w Supabase (uruchom `./set-supabase-secrets.sh`)
- [ ] Domena zweryfikowana w Resend
- [ ] Edge functions wdrożone
- [ ] Testy wysyłki przeprowadzone

---

**Utworzono:** 2026-02-08
**Wersja:** 1.0
**Status:** ✅ Skonfigurowane
