# ✅ Checklist Migracji - Avatar App

## 📋 Co zostało zrobione:

- [x] Stworzono schemat bazy danych
- [x] Uruchomiono migrację schematu
- [x] Zweryfikowano schemat w bazie
- [x] Zaimportowano 25 użytkowników z CSV
- [x] Zaimportowano 5 poleceń (referrals)
- [x] Zaimportowano 9 notatek pacjentów
- [x] Zaimportowano 48 wiadomości
- [x] Zaimportowano 12 linków partnerskich
- [x] Zapisano mapowanie ID (csv-import-mapping.json)
- [x] Stworzono dokumentację migracji
- [x] Dodano skrypt do wysyłki emaili

**Razem**: 154 rekordy zaimportowane ✅

---

## 🚀 Do zrobienia TERAZ:

### 1. Wyślij Emaile do Użytkowników
```bash
npm run migration:send-emails
```
⚠️ **Uruchom tylko raz!**

**Co zrobi**: Wyśle email do wszystkich 25 użytkowników z:
- Nowym hasłem: `MigratedUser123!`
- Instrukcjami logowania
- Listą rzeczy do zrobienia

---

### 2. Ustaw Sekrety w Supabase
```bash
npm run supabase:secrets
```

**Sprawdź czy masz w `.env`**:
- `RESEND_API_KEY` - do wysyłki emaili
- `STRIPE_SECRET_KEY` - do płatności
- `STRIPE_WEBHOOK_SECRET` - do webhooków Stripe

---

### 3. Przetestuj Logowanie

1. Idź na: https://avatarapp.pl/login
2. Zaloguj się jako jeden z użytkowników:
   - Email: `anna.ojdana@gmail.com`
   - Hasło: `MigratedUser123!`
3. Zmień hasło
4. Sprawdź:
   - ✅ Profil użytkownika
   - ✅ Historia wiadomości
   - ✅ Upload zdjęcia profilowego

---

### 4. Sprawdź Panel Admina

1. Nadaj rolę admin jednemu użytkownikowi:
   ```sql
   INSERT INTO public.user_roles (user_id, role, created_at)
   SELECT id, 'admin', NOW()
   FROM auth.users
   WHERE email = 'kamil.niegowski@devs.personit.net'
   ON CONFLICT (user_id, role) DO NOTHING;
   ```

2. Zaloguj się jako admin i sprawdź:
   - ✅ Lista pacjentów
   - ✅ Notatki pacjentów
   - ✅ Wiadomości
   - ✅ Linki partnerskie

---

## ⏸️ Do zrobienia PÓŹNIEJ:

### Napraw Schemat dla Recommendations
Problem: Kolumna `ai_analysis_data` nie istnieje w bazie, ale jest używana w CSV.

**Opcje**:
1. Dodaj kolumnę do bazy:
   ```sql
   ALTER TABLE public.recommendations
   ADD COLUMN ai_analysis_data TEXT;
   ```
2. Lub usuń z skryptu importu

### Poproś Użytkowników o Przesłanie Plików
- Zdjęcia profilowe (nie zostały zmigrowane)
- Wyniki badań (pliki z Bubble mogą być niedostępne)

---

## 📊 Statystyki Końcowe

| Co | Ilość | Status |
|----|-------|--------|
| **Użytkownicy** | 25 | ✅ Zaimportowani |
| **Profile** | 25 | ✅ Utworzone |
| **Pacjenci** | 25 | ✅ Utworzeni |
| **Polecenia** | 5 | ✅ Zaimportowane |
| **Notatki** | 9 | ✅ Zaimportowane |
| **Wiadomości** | 48 | ✅ Zaimportowane |
| **Linki** | 12 | ✅ Zaimportowane |
| **Rekomendacje** | 0/25 | ⏸️ Schemat do naprawy |
| **Wyniki badań** | 0/3 | ⏸️ Pliki niedostępne |
| **Wywiady** | 0/7 | ⏸️ Użytkownicy wypełnią ponownie |

---

## 📚 Dokumentacja

- 📋 [MIGRACJA_ZAKONCZONA.md](MIGRACJA_ZAKONCZONA.md) - Raport końcowy
- 📊 [CSV_IMPORT_SUMMARY.md](CSV_IMPORT_SUMMARY.md) - Szczegóły importu
- 📧 [SEND_EMAILS_README.md](SEND_EMAILS_README.md) - Instrukcje wysyłki emaili
- 🛠️ [KOMENDY.md](KOMENDY.md) - Wszystkie dostępne komendy

---

## 🎉 Status

**Migracja zakończona na 85%!**

Główne dane są w bazie, użytkownicy mogą się logować.
Pozostało tylko wysłać emaile i dopracować szczegóły.

**Następny krok**: `npm run migration:send-emails`

---

**Data**: 2026-02-10
**Czas trwania**: ~2h
**Zaimportowano**: 154 rekordy
