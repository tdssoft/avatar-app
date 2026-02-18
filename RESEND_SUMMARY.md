# ✅ RESEND.COM - KONFIGURACJA ZAKOŃCZONA

## 🎉 Status: Gotowe!

Resend.com został w pełni skonfigurowany w projekcie Avatar App.

## 📧 Konfiguracja Email

### Nadawca:
- **From:** `AVATAR <alan.urban23@gmail.com>`
- **Reply-to:** `alan.urban23@gmail.com`
- **Admin Email:** `alan.urban23@gmail.com`

### Aplikacja:
- **URL:** `https://app.eavatar.diet`

### API Key:
- **Resend API:** `re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE`

## 📨 Funkcje Email (Edge Functions)

### 1. Wysyłka Rekomendacji
- **Funkcja:** `send-recommendation-email`
- **Cel:** Wysyła pacjentowi email z linkiem do pobrania rekomendacji
- **Template:** Profesjonalny HTML z brandingiem AVATAR
- **Link:** Ważny 7 dni

### 2. Powiadomienia dla Admina
- **Funkcja:** `send-question-notification`
- **Cel:** Informuje admina o:
  - Nowych pytaniach pacjentów
  - Nowych zgłoszeniach wsparcia
- **Template:** Osobne design dla pytań i zgłoszeń

## 🚀 Następne kroki

### 1. Ustaw secrets w Supabase (WAŻNE!)

```bash
npm run supabase:secrets
```

LUB ręcznie:

```bash
./set-supabase-secrets.sh
```

### 2. Zweryfikuj domenę w Resend.com

⚠️ **WAŻNE:** Gmail (`alan.urban23@gmail.com`) nie może być używany bezpośrednio jako nadawca.

**Opcje:**
1. **Zalecane:** Użyj domeny `eavatar.diet`:
   - Dodaj domenę w Resend.com
   - Skonfiguruj DNS (SPF, DKIM)
   - Zmień FROM na `noreply@eavatar.diet`

2. **Tymczasowe:** Użyj testowego emaila Resend
   - Działa tylko dla testów

### 3. Deploy Edge Functions

```bash
supabase functions deploy --project-ref llrmskcwsfmubooswatz
```

### 4. Przetestuj wysyłkę

Po deployment, przetestuj:
- Utworzenie rekomendacji → pacjent dostanie email
- Wysłanie pytania → admin dostanie powiadomienie
- Zgłoszenie wsparcia → admin dostanie powiadomienie

## 📁 Pliki Konfiguracyjne

### Lokalne (.env)
```
RESEND_API_KEY=re_FpgpPQsN_AD8mMH5iWNo13ifFu1gMDEsE
RESEND_FROM_EMAIL=AVATAR <alan.urban23@gmail.com>
RESEND_REPLY_TO=alan.urban23@gmail.com
ADMIN_EMAIL=alan.urban23@gmail.com
APP_URL=https://app.eavatar.diet
```

### Edge Functions (Supabase Secrets)
Ustawione przez `npm run supabase:secrets`

### Kod (Defaults)
`supabase/functions/_shared/email-config.ts` - zaktualizowane

## 📚 Dokumentacja

Pełna dokumentacja: **RESEND_CONFIG.md**

## ✅ Checklist

- [x] API Key dodany do .env
- [x] Zmienne email skonfigurowane
- [x] APP_URL zaktualizowany
- [x] FROM_EMAIL zaktualizowany
- [x] Defaults w email-config.ts zaktualizowane
- [x] Skrypt do ustawienia secrets utworzony
- [x] Dokumentacja utworzona
- [ ] **Secrets ustawione w Supabase** ← **ZRÓB TO TERAZ!**
- [ ] **Domena zweryfikowana w Resend** ← **WAŻNE!**
- [ ] Edge functions wdrożone
- [ ] Testy przeprowadzone

## 🛠️ Komendy

```bash
# Ustaw secrets w Supabase
npm run supabase:secrets

# Sprawdź secrets
supabase secrets list --project-ref llrmskcwsfmubooswatz

# Deploy funkcji
supabase functions deploy --project-ref llrmskcwsfmubooswatz

# Zobacz logi
supabase functions logs send-recommendation-email --project-ref llrmskcwsfmubooswatz
```

---

**Status:** ✅ Skonfigurowane lokalnie
**Następny krok:** Ustaw secrets w Supabase i zweryfikuj domenę
**Data:** 2026-02-08
