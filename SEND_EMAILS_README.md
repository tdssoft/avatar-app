# 📧 Wysyłka Emaili o Migracji

Ten skrypt wysyła emaile do wszystkich użytkowników, których konta zostały zmigrowane z Bubble do Supabase.

## 📋 Co robi ten skrypt?

- Wysyła email powitalny do każdego użytkownika
- Informuje o tymczasowym haśle: `MigratedUser123!`
- Instrukcja logowania i zmiany hasła
- Lista rzeczy do zrobienia po zalogowaniu

## 🚀 Jak uruchomić?

### 1. Upewnij się, że masz klucz API Resend

Skrypt wymaga `RESEND_API_KEY` w pliku `.env`:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### 2. Uruchom skrypt

```bash
node send-migration-emails.js
```

### 3. Sprawdź wyniki

Skrypt wyświetli:
- ✅ Wysłane emaile
- ❌ Niepowodzenia (jeśli jakieś)
- 📊 Podsumowanie

## ⚠️ Uwagi

- **NIE URUCHAMIAJ WIĘCEJ NIŻ RAZ** - użytkownicy dostaną duplikaty!
- Skrypt ma wbudowane opóźnienie 100ms między emailami (rate limiting)
- Sprawdź najpierw czy domena `avatarapp.pl` jest poprawnie skonfigurowana w Resend
- Testowe emaile (np. `+1@gmail.com`) mogą nie przejść - to normalne

## 📝 Template Emaila

Email zawiera:
- 🎉 Nagłówek powitalny
- 📋 Lista zmian
- 🔑 Tymczasowe hasło
- 🚀 Instrukcje logowania
- 📸 Lista rzeczy do zrobienia

## ✅ Po wysłaniu

1. Poinformuj zespół o wysłanych emailach
2. Monitoruj support - użytkownicy mogą mieć pytania
3. Sprawdź logi błędów w Resend dashboard

---

**Utworzono**: 2026-02-10
**Użytkowników do powiadomienia**: 18
