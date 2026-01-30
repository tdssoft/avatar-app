
# Plan implementacji aplikacji Avatar Diet

## Zakres projektu
Na podstawie przesłanych screenshotów stworzę pełną replikę aplikacji Avatar Diet z następującymi modułami:

## Struktura ekranów do zaimplementowania

### 1. Autentykacja
- **Logowanie** (`/login`) - formularz z email i hasłem
- **Rejestracja wielokrokowa** (`/signup`):
  - Krok 1/3: Wybór opcji zdjęcia (radio buttons)
  - Krok 2/3: Formularz danych (brakuje screenshot, ale domyślam się że to dane osobowe)
  - Krok 3/3: Dane logowania (imię, nazwisko, telefon, email, hasło)

### 2. Dashboard (po zalogowaniu)
- **Strona główna** (`/dashboard`) - z menu bocznym
- **Wyniki** (`/dashboard/results`) - tabela z wynikami diagnostyki
- **Profil** (`/dashboard/profile`) - dane użytkownika
- **Pomoc** (`/dashboard/help`) - FAQ lub kontakt

### 3. Program polecający (nowa funkcjonalność)
- **Lista poleceń** (`/dashboard/referrals`) - widok dla użytkownika polecającego
- Generowanie unikalnego linku/kodu polecającego
- Historia poleceń z informacją o statusie
- System nagród za polecenia

## Architektura techniczna

### Nowe pliki do utworzenia

```text
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Menu boczne dashboardu
│   │   ├── AuthLayout.tsx       # Layout dla stron logowania/rejestracji
│   │   └── DashboardLayout.tsx  # Layout dla dashboardu
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupWizard.tsx
│   └── referral/
│       ├── ReferralCard.tsx
│       ├── ReferralLink.tsx
│       └── ReferralHistory.tsx
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── Dashboard.tsx
│   ├── Results.tsx
│   ├── Profile.tsx
│   ├── Help.tsx
│   └── Referrals.tsx
├── contexts/
│   └── AuthContext.tsx          # Stan autoryzacji (mock)
└── lib/
    └── referral.ts              # Logika programu polecającego
```

### Routing

```text
/                    -> Strona pakietów (istniejąca)
/login               -> Logowanie
/signup              -> Rejestracja (3 kroki)
/dashboard           -> Dashboard główny
/dashboard/results   -> Wyniki
/dashboard/profile   -> Profil
/dashboard/help      -> Pomoc
/dashboard/referrals -> Program polecający
```

## Szczegóły implementacji

### 1. Ekran logowania
- Dwukolumnowy layout (formularz po lewej, branding po prawej)
- Pola: Email, Hasło
- Link "Nie masz konta? Zarejestruj się"
- Przycisk "Zaloguj się"

### 2. Rejestracja wielokrokowa

**Krok 1/3 - Wybór zdjęcia:**
- RadioGroup z dwoma opcjami:
  - "Wybierz zdjęcie zapisane na urządzeniu"
  - "Wgraj zdjęcie później"
- Info box wyjaśniający dlaczego zdjęcie jest potrzebne
- Przycisk "Dalej"

**Krok 3/3 - Dane logowania:**
- Pola: Imię, Nazwisko (w jednym rzędzie)
- Pole telefonu z wyborem kraju (+48)
- Email, Hasło, Powtórz Hasło
- Checkbox akceptacji regulaminu
- Przycisk "Rejestracja"

### 3. Dashboard
- Menu boczne z ikonami:
  - Strona główna
  - Wyniki
  - Profil
  - Program polecający
  - Pomoc
- Główna treść z witaczem i kartami funkcji
- Obszar do wgrywania plików

### 4. Program polecający (nowa funkcjonalność)
Zaprojektuję od podstaw system poleceń:

**Dla osoby polecającej:**
- Unikalny kod/link polecający
- Przycisk kopiowania linku
- Lista poleconych osób z statusami:
  - Oczekująca (zarejestrowana, ale nie kupiła)
  - Aktywna (dokonała zakupu)
- Statystyki: liczba poleceń, nagrody

**Dla osoby poleconej:**
- Pole do wpisania kodu polecającego przy rejestracji
- Rabat na pierwszy zakup

**Nagrody:**
- System punktów lub zniżek za udane polecenia
- Historia zdobytych nagród

## Kolejność implementacji

1. **Faza 1: Layout i routing**
   - AuthLayout i DashboardLayout
   - Konfiguracja routera
   - Sidebar z nawigacją

2. **Faza 2: Autentykacja**
   - Strona logowania
   - Rejestracja wielokrokowa
   - Mock AuthContext

3. **Faza 3: Dashboard**
   - Strona główna dashboardu
   - Strona wyników
   - Profil użytkownika
   - Pomoc

4. **Faza 4: Program polecający**
   - Generowanie kodów polecających
   - UI dla polecającego
   - Integracja z rejestracją

## Szczegóły techniczne

### Stan autoryzacji (mock)
Ponieważ nie ma backendu, utworzę mockowy kontekst autoryzacji:
- Przechowywanie stanu zalogowania w localStorage
- Symulacja logowania/rejestracji
- Przekierowania dla chronionych stron

### Walidacja formularzy
- Wykorzystam react-hook-form + zod (już zainstalowane)
- Walidacja email, hasła (min. 8 znaków), telefonu

### Responsywność
- Mobile-first design
- Sidebar chowany na mobile (hamburger menu)
- Wszystkie ekrany responsywne

## Pytania projektowe

Przed implementacją potrzebuję wyjaśnienia:

1. **Backend**: Czy planujesz podłączyć Supabase dla prawdziwej autoryzacji i bazy danych, czy na razie wystarczy mock?

2. **Program polecający - nagrody**: Jakie nagrody mają być za polecenia?
   - Zniżka procentowa na zakupy?
   - Stała kwota rabatu?
   - Darmowy pakiet po X poleceniach?

3. **Krok 2/3 rejestracji**: Czy możesz przesłać screenshot tego ekranu lub opisać jakie dane zbiera?
