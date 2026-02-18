# 🎯 DANE TESTOWE DO LOGOWANIA - Avatar App

**Data utworzenia:** 2026-02-08
**Środowisko:** Railway PostgreSQL (Produkcja)
**URL aplikacji:** https://kong-production-d36f.up.railway.app

---

## 🔐 KONTA TESTOWE

### 👑 ADMINISTRATOR

**Email:** `admin@avatarapp.pl`
**Hasło:** `Admin123!`

**Uprawnienia:**
- Pełny dostęp do panelu administracyjnego
- Zarządzanie pacjentami
- Tworzenie rekomendacji
- Przeglądanie wszystkich danych
- Zarządzanie użytkownikami

**Przypisane dane:**
- Imię i nazwisko: Jan Kowalski
- Telefon: +48 500 100 200
- Kod polecający: P39070V1

---

### 🤝 PARTNERZY (Sklepy)

#### Partner 1 - Sklep Zdrowej Żywności

**Email:** `partner1@sklep.pl`
**Hasło:** `Partner123!`

**Dane:**
- Imię i nazwisko: Anna Nowak
- Telefon: +48 500 200 300
- Sklep: Sklep Zdrowej Żywności
- URL sklepu: https://sklep-zdrowia.pl
- Kod polecający: H98PYW5E

#### Partner 2 - Suplementy Premium

**Email:** `partner2@suplementy.pl`
**Hasło:** `Partner123!`

**Dane:**
- Imię i nazwisko: Piotr Wiśniewski
- Telefon: +48 500 300 400
- Sklep: Suplementy Premium
- URL sklepu: https://suplementy-premium.pl
- Kod polecający: TM5L1SH6

---

### 🏥 PACJENCI

#### Pacjent 1 - Maria Lewandowska

**Email:** `pacjent1@test.pl`
**Hasło:** `Pacjent123!`

**Dane osobowe:**
- Imię i nazwisko: Maria Lewandowska
- Data urodzenia: 15.03.1985 (41 lat)
- Płeć: Kobieta
- Telefon: +48 600 100 200
- Kod polecający: 0EQIO9ZH

**Status:**
- Subskrypcja: **Aktywna**
- Status diagnozy: **W trakcie diagnozy**
- Tagi: VIP, Priorytet

**Dostępne dane:**
- ✅ Rekomendacje żywieniowe
- ✅ Wywiad żywieniowy wypełniony
- ✅ Notatki od admina (2)
- ✅ Historia wiadomości (2)
- ✅ Profil osoby (główny)

---

#### Pacjent 2 - Tomasz Kamiński

**Email:** `pacjent2@test.pl`
**Hasło:** `Pacjent123!`

**Dane osobowe:**
- Imię i nazwisko: Tomasz Kamiński
- Data urodzenia: 22.07.1990 (36 lat)
- Płeć: Mężczyzna
- Telefon: +48 600 200 300
- Kod polecający: JJM05QEG

**Status:**
- Subskrypcja: **Nieaktywna**
- Status diagnozy: **Diagnoza zakończona**
- Tagi: Nowy pacjent

**Dostępne dane:**
- ✅ Rekomendacje żywieniowe
- ✅ Wywiad żywieniowy wypełniony
- ✅ Notatki od admina (2)
- ✅ Historia wiadomości (2)
- ✅ Profil osoby (główny)
- ✅ Polecony przez Pacjent 1

---

#### Pacjent 3 - Katarzyna Zielińska

**Email:** `pacjent3@test.pl`
**Hasło:** `Pacjent123!`

**Dane osobowe:**
- Imię i nazwisko: Katarzyna Zielińska
- Data urodzenia: 08.11.1978 (48 lat)
- Płeć: Kobieta
- Telefon: +48 600 300 400
- Kod polecający: 17VZ94DD

**Status:**
- Subskrypcja: **Trial**
- Status diagnozy: **Oczekuje na wyniki**
- Tagi: Follow-up, Długoterminowy

**Dostępne dane:**
- ✅ Rekomendacje żywieniowe
- ✅ Wywiad żywieniowy wypełniony
- ✅ Notatki od admina (2)
- ✅ Historia wiadomości (2)
- ✅ Profil osoby (główny)

---

## 📊 DANE TESTOWE W BAZIE

### Utworzone rekordy:

| Tabela | Liczba rekordów |
|--------|----------------|
| Użytkownicy (auth.users) | 6 |
| Profile | 6 |
| Role użytkowników | 6 |
| Pacjenci | 3 |
| Profile osób | 3 |
| Rekomendacje | 3 |
| Notatki pacjentów | 6 |
| Wiadomości | 6 |
| Wywiady żywieniowe | 3 |
| Polecenia | 1 |
| Zgłoszenia wsparcia | 2 |
| Linki sklepów partnerskich | 2 |

### Zawartość danych testowych:

#### Rekomendacje (dla każdego pacjenta):
- Tytuł i treść rekomendacji
- Analiza układów ciała
- Podsumowanie diagnozy
- Zalecenia żywieniowe
- Program suplementacji
- Linki do sklepów partnerskich
- Terapie wspierające

#### Wywiady żywieniowe:
- Aktualna dieta
- Alergie (przykład: Orzechy, Laktoza)
- Suplementy
- Cele zdrowotne
- Jakość snu
- Poziom stresu

#### Wiadomości:
- Pytania pacjentów
- Odpowiedzi admina
- Historia komunikacji

#### Zgłoszenia wsparcia:
- Otwarte zgłoszenia
- Problemy z dostępem do rekomendacji

---

## 🚀 JAK TESTOWAĆ

### 1. Logowanie jako Admin
1. Przejdź do aplikacji
2. Zaloguj się jako: `admin@avatarapp.pl` / `Admin123!`
3. Sprawdź panel administracyjny:
   - Lista pacjentów (3)
   - Rekomendacje
   - Wiadomości
   - Zgłoszenia wsparcia

### 2. Logowanie jako Pacjent
1. Wyloguj się z konta admina
2. Zaloguj jako: `pacjent1@test.pl` / `Pacjent123!`
3. Sprawdź:
   - Swoje rekomendacje
   - Wywiad żywieniowy
   - Wiadomości
   - Profil osoby

### 3. Logowanie jako Partner
1. Zaloguj jako: `partner1@sklep.pl` / `Partner123!`
2. Sprawdź:
   - Informacje o sklepie
   - Linki produktowe

---

## ⚠️ WAŻNE UWAGI

### Bezpieczeństwo:
- ⚠️ To są dane **TESTOWE** - nie używać w produkcji!
- ⚠️ Wszystkie hasła są takie same dla każdej roli (Admin123!, Partner123!, Pacjent123!)
- ⚠️ Dane są widoczne publicznie - nie dodawać prawdziwych danych osobowych

### Hasła:
- Hasła są zapisane jako hash bcrypt
- Pierwsze logowanie może wymagać resetu hasła (zależy od implementacji)
- Wszystkie hasła zawierają: wielką literę, małą literę, cyfrę i znak specjalny

### Funkcjonalności do przetestowania:
- ✅ Logowanie/wylogowanie
- ✅ Panel admina - zarządzanie pacjentami
- ✅ Panel pacjenta - przeglądanie rekomendacji
- ✅ System poleceń (referral)
- ✅ Wywiady żywieniowe
- ✅ Wiadomości między adminem a pacjentem
- ✅ Zgłoszenia wsparcia
- ✅ Profile osób (multi-profile)
- ✅ Linki sklepów partnerskich

---

## 🔧 KONFIGURACJA TECHNICZNA

**Baza danych:**
- Host: trolley.proxy.rlwy.net
- Port: 31136
- Database: postgres
- URL API: https://kong-production-d36f.up.railway.app

**Tabele:**
- 15 tabel aplikacyjnych (schema: public)
- RLS włączone na wszystkich tabelach
- 3 storage buckets (avatars, results, audio-recordings)

**Migracje:**
- ✅ Wszystkie tabele utworzone
- ✅ Indeksy skonfigurowane
- ✅ Polityki RLS aktywne
- ✅ Triggery działają

---

## 📞 KONTAKT W RAZIE PROBLEMÓW

Jeśli wystąpią problemy z logowaniem lub dostępem do danych:
1. Sprawdź czy aplikacja jest uruchomiona
2. Zweryfikuj połączenie z bazą danych
3. Sprawdź logi aplikacji
4. Upewnij się że używasz poprawnego URL

---

**Wygenerowano:** 2026-02-08
**Wersja bazy danych:** 20260208000000
**Status:** ✅ Gotowe do testów
