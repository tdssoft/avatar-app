
Cel: naprawić program poleceń tak, żeby polecona osoba pojawiała się u polecającego po rejestracji z linku, oraz usunąć bug “logowanie działa dopiero za 2. razem”. W tym samym czasie zrobić “live testing” (reprodukcja + weryfikacja po poprawkach).

## Co już ustaliłem (na podstawie kodu + bazy danych)
### 1) Polecenia nie działają, bo rekordy w bazie w ogóle się nie tworzą
- W bazie: `public.referrals` ma **0 rekordów**.
- W bazie: `public.profiles` ma **1 rekord**, a `referral_code` jest w nim **pusty/null**.
- Frontend próbuje tworzyć:
  - profil w `profiles` po `signUp()`,
  - oraz rekord w `referrals` po `signUp()`.

Problem: przy standardowej rejestracji z potwierdzeniem email (co sugeruje tekst w UI “Sprawdź skrzynkę email, aby potwierdzić konto”) użytkownik **nie ma jeszcze aktywnej sesji**, więc RLS blokuje inserty do `profiles` i `referrals`. Dodatkowo referrer może mieć kod tylko w metadata, ale nie w `profiles`, więc lookup po `profiles.referral_code` potrafi zwrócić null i referral nie powstaje.

### 2) “Muszę kliknąć Zaloguj się 2 razy”
Najczęstszy scenariusz w tym układzie:
- login działa, ale zanim kontekst zdąży ustawić `user` (a DashboardLayout sprawdza `isAuthenticated: !!user`), następuje redirect z /dashboard z powrotem na /login.
- Drugi klik już trafia, bo `user` zdążył się ustawić.

Wniosek: bramka dostępu do dashboardu powinna bazować na **sesji** (session), a nie na tym czy profil użytkownika już się wczytał (user). Profil może ładować się chwilę dłużej.

---

## Strategia naprawy (bez rozluźniania bezpieczeństwa)
Zamiast przywracać niebezpieczne RLS typu “Anyone can insert referrals”, robimy stabilny mechanizm:
1) Profil i referral tworzymy przez backendową funkcję (działającą z uprawnieniami serwisowymi) wywoływaną tuż po rejestracji.
2) Dodatkowo robimy “self-healing” profilu przy logowaniu (upsert / uzupełnienie referral_code) dla już istniejących kont.
3) Naprawiamy logowanie przez zmianę logiki “authenticated” i loaderów.

---

## Kroki implementacji

### A. Naprawa logowania “na 2 razy”
1) W `AuthContext`:
   - Traktować użytkownika jako zalogowanego, jeśli istnieje `session` (np. `isAuthenticated: !!session`), a nie `!!user`.
   - Rozdzielić “czy mamy sesję” od “czy profil jest gotowy”.
   - Dodać stan typu `isProfileReady` / `isUserReady` (lub logicznie: `isLoading` pozostaje true aż do pobrania profilu, ale redirect ma używać sesji).
2) W `DashboardLayout`:
   - Redirect do `/login` robić na podstawie `session` (brak sesji), nie na podstawie `user`.
   - Jeśli jest sesja, ale profil jeszcze się ładuje: pokazać spinner (zamiast wyrzucać na login).
3) W `AuthContext` ograniczyć podwójne fetchowanie profilu:
   - Aktualnie login robi `await fetchUserProfile(data.user)` i jednocześnie `onAuthStateChange` może odpalić kolejny fetch. Dodamy prosty “guard” (np. ref/flag/promise) aby jeden fetch nie dublował drugiego.

Efekt: po 1. kliknięciu “Zaloguj się” użytkownik zostaje na /dashboard, a UI ewentualnie pokazuje spinner aż do wczytania profilu.

---

### B. Utrwalenie referral_code w profilu (self-healing dla istniejących kont)
W `fetchUserProfile`:
1) Jeśli profil w `profiles` nie istnieje → zrobić `insert/upsert` profilu dla bieżącego użytkownika.
2) Jeśli profil istnieje, ale `referral_code` jest null/pusty, a w metadata istnieje `referralCode` → zrobić `update profiles set referral_code = ...`.
3) Jeśli metadata nie ma referralCode (konto legacy), to:
   - wygenerować nowy kod,
   - zaktualizować metadata użytkownika (`supabase.auth.updateUser({ data: { referralCode: ... }})`),
   - zapisać ten kod do `profiles.referral_code`.

Efekt: referrer zawsze ma kod także w `profiles`, więc wyszukiwanie referrera po kodzie będzie działać.

---

### C. Pewne tworzenie poleceń przy rejestracji (bez zależności od sesji)
Zrobimy backendową funkcję (server-side) np. `post-signup`:
1) Wywoływana po `signUp()` (w momencie, gdy mamy `authData.user.id`, email, imię/nazwisko, generated referralCode i ewentualny referredBy).
2) Funkcja:
   - weryfikuje, że user faktycznie istnieje (admin getUserById),
   - robi upsert profilu: `profiles(user_id, referral_code, avatar_url=null)` (idempotentnie),
   - jeśli `referredBy` jest podane:
     - znajduje referrera po `profiles.referral_code = referredBy`,
     - tworzy rekord w `referrals` (idempotentnie, patrz niżej).

3) Idempotencja (żeby nie tworzyć duplikatów):
   - dodamy unikalny indeks np. na `referrals(referred_user_id)` (zakładamy 1 referrer na użytkownika),
   - insert będzie robił “insert if not exists” (ON CONFLICT DO NOTHING).

4) Zmiany w kodzie:
   - W `AuthContext.signup` usunąć bezpośrednie `.from("profiles").insert(...)` i `.from("referrals").insert(...)` (bo to się wykłada na RLS/ braku sesji).
   - Zastąpić to `supabase.functions.invoke("post-signup", { body: ... })`.
   - Jeśli funkcja zwróci błąd → log + (opcjonalnie) toast “konto utworzone, ale nie udało się zarejestrować polecenia; spróbuj ponownie / skontaktuj się”.

Efekt: polecenie zapisuje się już w momencie rejestracji (bez czekania na potwierdzenie email i bez ryzykownego rozluźniania RLS).

---

### D. Migracje w bazie (bez niszczenia danych)
1) `profiles`:
   - dodać unikalny indeks na `referral_code` (z warunkiem, żeby nie blokować nulli/pustych):
     - np. UNIQUE INDEX WHERE referral_code is not null and referral_code <> ''.
2) `referrals`:
   - dodać unikalny indeks na `referred_user_id` (lub parę `referrer_user_id, referred_user_id`).
3) (Opcjonalnie, jeśli chcemy mocniej zabezpieczyć) – pozostawić obecny INSERT policy (auth.uid() = referred_user_id) albo docelowo nawet ją usunąć i tworzyć referrals tylko przez backendową funkcję. W praktyce: jeśli wszystko tworzy funkcja, polityka INSERT może być zbędna.

---

### E. “Naprawa” poleceń, które zostały już utracone (np. Jan Kowalski)
Ponieważ historyczne rejestracje mogły się odbyć w czasie, gdy insert do referrals nie działał, dodamy mechanizm “repair”:
1) Backendowa funkcja `repair-referral`:
   - wymaga zalogowania (sprawdza kto woła),
   - sprawdza, czy caller faktycznie jest właścicielem `referrer_code` (profiles.user_id = caller && profiles.referral_code = …),
   - przyjmuje `referredEmail`,
   - odnajduje usera po emailu (admin API), weryfikuje że metadata `referredBy` pasuje do kodu,
   - jeśli referral nie istnieje → tworzy go.
2) UI w `Referrals`:
   - mały link/sekcja “Nie widzisz polecenia? Napraw” + pole email + przycisk.

Efekt: można odzyskać polecenia, które “zniknęły”, bez ręcznego grzebania w bazie.

---

## Live testing (dokładny scenariusz)
Po wdrożeniu zmian wykonam test w preview:
1) Zaloguję się na konto polecające (Twoje) i wejdę w /dashboard/referrals:
   - sprawdzę, czy `profiles.referral_code` jest już zapisany (self-healing).
2) Skopiuję link polecający.
3) W nowym kontekście przeglądarki (incognito / druga sesja) wejdę w link i wykonam rejestrację testową:
   - najlepiej email typu `alan.urban23+ref_test1@gmail.com` (Gmail wspiera “+”).
4) Sprawdzę, że backendowa funkcja utworzyła rekord w `referrals`:
   - weryfikacja w bazie (licznik referrals powinien wzrosnąć),
   - następnie w UI u referrera odświeżę “Historia poleceń” i potwierdzę obecność wpisu.
5) Test logowania:
   - wyloguję,
   - zaloguję się 1 raz,
   - potwierdzę, że nie ma już powrotu na /login i nie trzeba 2 kliknięć.

Jeśli którykolwiek krok nie przejdzie:
- dołożę widoczne logi/komunikaty błędów (w UI i w konsoli) w miejscach, gdzie teraz błędy są “połykane”, żeby diagnoza była natychmiastowa (konkretnie: wyniki `invoke("post-signup")`, upsert profilu, i ewentualne konflikty indeksów).

---

## Zakres zmian w plikach (frontend)
- `src/contexts/AuthContext.tsx`
  - poprawa logiki auth (session vs user),
  - self-healing profilu (referral_code),
  - wywołanie backendowej funkcji po signUp,
  - odduplikowanie fetchUserProfile.
- `src/components/layout/DashboardLayout.tsx`
  - redirect na podstawie session,
  - spinner gdy session jest, ale user/profil się jeszcze ładuje.
- `src/pages/Referrals.tsx`
  - opcjonalny “Napraw polecenie” (email input + invoke repair),
  - opcjonalny “Odśwież” (manual refresh).

## Zakres zmian w backend (Lovable Cloud)
- Nowe backendowe funkcje:
  - `post-signup`
  - `repair-referral`
- Migracje:
  - indeksy unikalne dla `profiles.referral_code` oraz `referrals` (idempotencja).

## Dlaczego to naprawi problem “wcześniej działało”
Wcześniej działało prawdopodobnie dlatego, że insert do `referrals` był chwilowo “otwarty” (policy WITH CHECK true) albo rejestracja dawała sesję od razu. Po uszczelnieniu RLS (i przy potwierdzaniu email) insert z frontendu przestał przechodzić. Zaproponowane rozwiązanie utrzymuje bezpieczeństwo i przywraca działanie niezależnie od tego, czy sesja jest już aktywna.

