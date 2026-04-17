# 🛠️ Dostępne Komendy - Avatar App

## 📦 Migracja Bazy Danych

### Migracja Schematu
```bash
npm run db:migrate
```
Tworzy wszystkie tabele w Supabase według schematu z `supabase/migrations/`

### Import Danych z CSV
```bash
npm run db:import-csv
```
Importuje dane użytkowników, notatek, wiadomości z plików CSV z Bubble

### Weryfikacja Schematu
```bash
npm run db:verify
```
Sprawdza czy wszystkie tabele zostały poprawnie utworzone

### Lista Użytkowników
```bash
npm run db:list-users
```
Wyświetla listę wszystkich użytkowników w bazie

### Sprawdź Połączenie
```bash
npm run db:check
```
Testuje połączenie z bazą danych

### Zasiej Dane Testowe
```bash
npm run db:seed
```
Dodaje przykładowe dane do bazy (tylko dla dev)

---

## 📧 Wysyłka Emaili

### Wyślij Emaile o Migracji
```bash
npm run migration:send-emails
```
Wysyła emaile do wszystkich użytkowników z informacją o migracji i nowym haśle

⚠️ **UWAGA**: Uruchom tylko raz!

---

## ⚙️ Supabase

### Ustaw Sekrety
```bash
npm run supabase:secrets
```
Ustawia sekrety (RESEND_API_KEY, STRIPE_SECRET_KEY) w Supabase Edge Functions

---

## 🚀 Aplikacja

### Deweloperski Serwer
```bash
npm run dev
```
Uruchamia aplikację lokalnie na http://localhost:5173

### Build Produkcyjny
```bash
npm run build
```
Buduje aplikację dla produkcji

### Build Deweloperski
```bash
npm run build:dev
```
Buduje aplikację w trybie deweloperskim

### Podgląd Buildu
```bash
npm run preview
```
Podgląd produkcyjnego buildu

---

## 🧪 Testy

### Uruchom Testy
```bash
npm run test
```
Uruchamia wszystkie testy (vitest)

### Testy w Trybie Watch
```bash
npm run test:watch
```
Uruchamia testy w trybie watch (auto-refresh)

---

## 📋 Linting

### Sprawdź Kod
```bash
npm run lint
```
Sprawdza kod pod kątem błędów ESLint

---

## 🔄 Typowa Kolejność Migracji

1. **Stwórz schemat bazy**:
   ```bash
   npm run db:migrate
   ```

2. **Zweryfikuj schemat**:
   ```bash
   npm run db:verify
   ```

3. **Importuj dane z CSV**:
   ```bash
   npm run db:import-csv
   ```

4. **Sprawdź użytkowników**:
   ```bash
   npm run db:list-users
   ```

5. **Wyślij emaile do użytkowników**:
   ```bash
   npm run migration:send-emails
   ```

6. **Ustaw sekrety**:
   ```bash
   npm run supabase:secrets
   ```

---

## 📚 Dodatkowe Pliki

- `MIGRACJA_ZAKONCZONA.md` - Raport z migracji
- `CSV_IMPORT_SUMMARY.md` - Podsumowanie importu CSV
- `SEND_EMAILS_README.md` - Instrukcje wysyłki emaili
- `csv-import-mapping.json` - Mapowanie ID z Bubble → Supabase

---

**Ostatnia aktualizacja**: 2026-02-10
