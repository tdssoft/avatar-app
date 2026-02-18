# 🎉 ZAPLECZE TESTOWE - GOTOWE!

## ✅ Co zostało utworzone

Pełne zaplecze testowe z danymi dla klienta:

- **1 Administrator** - pełny dostęp do systemu
- **2 Partnerów** - sklepy ze suplementami
- **3 Pacjentów** - z pełnymi profilami i danymi medycznymi

## 🔐 SZYBKI DOSTĘP - DANE LOGOWANIA

### 👑 Administrator
```
Email:    admin@avatarapp.pl
Hasło:    Admin123!
```

### 🏥 Pacjenci (do testowania)
```
Email:    pacjent1@test.pl
Hasło:    Pacjent123!

Email:    pacjent2@test.pl
Hasło:    Pacjent123!

Email:    pacjent3@test.pl
Hasło:    Pacjent123!
```

### 🤝 Partnerzy
```
Email:    partner1@sklep.pl
Hasło:    Partner123!

Email:    partner2@suplementy.pl
Hasło:    Partner123!
```

## 📊 Dane w bazie

- ✅ 6 użytkowników
- ✅ 3 pacjentów z pełnymi profilami
- ✅ 3 rekomendacje żywieniowe
- ✅ 3 wywiady żywieniowe
- ✅ 6 notatek pacjentów
- ✅ 6 wiadomości
- ✅ 2 zgłoszenia wsparcia
- ✅ 1 polecenie (referral)
- ✅ 2 linki sklepów partnerskich

## 📄 Szczegółowa dokumentacja

**Pełne dane logowania i opisy:** Zobacz plik `TEST_CREDENTIALS.md`

## 🛠️ Komendy NPM

```bash
npm run db:migrate      # Uruchom migrację bazy
npm run db:verify       # Zweryfikuj schemat
npm run db:list-users   # Pokaż listę użytkowników
npm run db:check        # Sprawdź tabele w bazie
npm run db:seed         # Wypełnij bazę danymi testowymi
```

## 🚀 Jak testować

1. **Uruchom aplikację:**
   ```bash
   npm run dev
   ```

2. **Zaloguj się jako admin:**
   - Email: `admin@avatarapp.pl`
   - Hasło: `Admin123!`

3. **Sprawdź panel administracyjny:**
   - Lista pacjentów (3)
   - Rekomendacje
   - Wiadomości
   - Zgłoszenia

4. **Zaloguj się jako pacjent:**
   - Email: `pacjent1@test.pl`
   - Hasło: `Pacjent123!`
   - Sprawdź swoje rekomendacje i wywiady

## ⚠️WAŻNE

- To są dane **TESTOWE** - nie używać w produkcji!
- Wszystkie hasła mają ten sam format dla bezpieczeństwa
- Baza danych: Railway PostgreSQL (https://kong-production-d36f.up.railway.app)

---

**Status:** ✅ Gotowe do testów
**Utworzono:** 2026-02-08
**Wersja:** 1.0
