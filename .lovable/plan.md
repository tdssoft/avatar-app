
# Plan: Naprawa dwóch krytycznych błędów

## Zidentyfikowane problemy

### Problem 1: Automatyczne wylogowanie przy odświeżaniu strony

**Przyczyna:** W pliku `src/components/layout/DashboardLayout.tsx` (linie 16-20):

```typescript
useEffect(() => {
  if (!isAuthenticated) {
    navigate("/login");
  }
}, [isAuthenticated, navigate]);
```

Ten kod nie uwzględnia stanu ładowania (`isLoading`). Przy odświeżeniu strony:
1. Aplikacja się ładuje
2. `user` jest `null` (sesja jeszcze nie została odzyskana z Supabase)
3. `isAuthenticated` = `false`
4. Przekierowanie do `/login` następuje **zanim** Supabase zdąży odzyskać sesję

### Problem 2: Brak poleconej osoby w liście poleceń

**Przyczyna:** System poleceń używa `localStorage` (`avatar_referrals`), ale **nigdzie nie ma kodu, który tworzy rekord polecenia** przy rejestracji.

W `SignupWizard.tsx`:
- Kod polecający jest pobierany z URL (`?ref=...`)
- Zapisywany jest w `user_metadata.referredBy`
- **ALE** - nie jest tworzony rekord w `localStorage.avatar_referrals`

Dlatego strona "Program polecający" pokazuje "Brak poleceń" - bo `getReferralsByCode()` szuka w pustym localStorage.

---

## Rozwiązanie

### Naprawa 1: Zabezpieczenie przed przedwczesnym przekierowaniem

**Plik:** `src/components/layout/DashboardLayout.tsx`

Zmiana:
```typescript
// PRZED:
useEffect(() => {
  if (!isAuthenticated) {
    navigate("/login");
  }
}, [isAuthenticated, navigate]);

// PO:
useEffect(() => {
  // Poczekaj aż ładowanie się zakończy
  if (!isLoading && !isAuthenticated) {
    navigate("/login");
  }
}, [isLoading, isAuthenticated, navigate]);

// Dodaj też sprawdzenie ładowania w render:
if (isLoading) {
  return <LoadingScreen />; // lub spinner
}
```

**Wymagane zmiany:**
1. Dodać `isLoading` do destrukturyzacji z `useAuth()`
2. Zmienić warunek w `useEffect` 
3. Dodać sprawdzenie `isLoading` przed renderowaniem contentu

### Naprawa 2: Migracja systemu poleceń do bazy danych

**Problem z localStorage:** Dane są lokalne dla przeglądarki - polecający nie widzi osób, które zarejestrowały się z innego urządzenia.

**Rozwiązanie:** Stworzyć tabelę `referrals` w bazie danych i przepisać logikę.

#### Krok 2.1: Utworzenie tabeli `referrals`

```sql
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referrer_code text NOT NULL,
  referred_user_id uuid NOT NULL,
  referred_email text NOT NULL,
  referred_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

-- RLS: Użytkownik widzi tylko swoje polecenia
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);
```

#### Krok 2.2: Aktualizacja funkcji rejestracji

**Plik:** `src/contexts/AuthContext.tsx` (funkcja `signup`)

Po pomyślnej rejestracji, jeśli użytkownik podał kod polecający:
1. Wyszukaj użytkownika z tym kodem polecającym
2. Utwórz rekord w tabeli `referrals`

```typescript
// Po utworzeniu użytkownika:
if (data.referralCode && authData.user) {
  // Znajdź polecającego po kodzie
  const { data: referrerUsers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('referral_code', data.referralCode)
    .single();
  
  if (referrerUsers) {
    await supabase.from('referrals').insert({
      referrer_user_id: referrerUsers.user_id,
      referrer_code: data.referralCode,
      referred_user_id: authData.user.id,
      referred_email: data.email,
      referred_name: `${data.firstName} ${data.lastName}`,
      status: 'pending'
    });
  }
}
```

#### Krok 2.3: Aktualizacja tabeli `profiles`

Dodać kolumnę `referral_code` do tabeli `profiles`:

```sql
ALTER TABLE public.profiles 
ADD COLUMN referral_code text;

-- Indeks dla szybkiego wyszukiwania po kodzie
CREATE INDEX idx_profiles_referral_code ON public.profiles(referral_code);
```

#### Krok 2.4: Aktualizacja strony poleceń

**Plik:** `src/pages/Referrals.tsx`

Zamienić wywołania localStorage na zapytania do Supabase:

```typescript
// PRZED:
setReferrals(getReferralsByCode(user.referralCode));

// PO:
const { data } = await supabase
  .from('referrals')
  .select('*')
  .eq('referrer_code', user.referralCode);
setReferrals(data || []);
```

#### Krok 2.5: Aktualizacja funkcji poleceń

**Plik:** `src/lib/referral.ts`

Przepisać wszystkie funkcje, aby używały Supabase zamiast localStorage.

---

## Podsumowanie plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/DashboardLayout.tsx` | Dodanie sprawdzenia `isLoading` przed przekierowaniem |
| `supabase/migrations/...` | Utworzenie tabeli `referrals` i dodanie kolumny do `profiles` |
| `src/contexts/AuthContext.tsx` | Zapisywanie kodu polecającego w profilu + tworzenie rekordu polecenia |
| `src/lib/referral.ts` | Przepisanie funkcji na Supabase |
| `src/pages/Referrals.tsx` | Użycie danych z bazy zamiast localStorage |

---

## Szczegóły techniczne

### Przepływ po naprawie (Problem 1):

1. Użytkownik odświeża stronę
2. `isLoading = true`, więc wyświetla się spinner
3. Supabase odzyskuje sesję z tokena w localStorage
4. `onAuthStateChange` aktualizuje `user`
5. `isLoading = false`, `isAuthenticated = true`
6. Dashboard się wyświetla

### Przepływ po naprawie (Problem 2):

1. Jan Kowalski klika link `signup?ref=ABC123`
2. Rejestruje się przez formularz
3. System znajduje użytkownika z kodem `ABC123` (Alan Urban)
4. Tworzy rekord w tabeli `referrals`:
   - `referrer_user_id` = ID Alana
   - `referred_user_id` = ID Jana
   - `status` = "pending"
5. Alan otwiera "Program polecający"
6. Zapytanie do bazy zwraca Jana Kowalskiego
7. Jan widoczny w liście poleceń

