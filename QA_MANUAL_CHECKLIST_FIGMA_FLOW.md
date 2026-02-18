# QA Manual Checklist (Figma Flow 1:1)

## Zakres
- signup -> verify -> login -> onboarding -> payment (3 kroki) -> interview -> dashboard
- admin: pacjenci, partnerzy, profil pacjenta, kreator zaleceń
- dodatkowe funkcje dostępne w sekcji `Więcej`

## Przygotowanie
1. Uruchom aplikację: `npm run dev`
2. Miej 2 konta testowe:
- użytkownik zwykły
- administrator
3. Użyj nowego maila testowego do rejestracji.

## A. Rejestracja użytkownika (3 kroki)
1. Otwórz `/login`.
2. Kliknij `Zarejestruj się`.
3. Krok 1/3:
- zaznacz `Wgraj zdjęcie później`
- kliknij `Dalej ->`
4. Krok 2/3:
- kliknij `Avatar 1`
- kliknij `Dalej ->`
5. Krok 3/3:
- uzupełnij telefon, email, hasło, powtórz hasło
- kliknij `Rejestracja`
6. Oczekiwane:
- przekierowanie na `/signup/verify-email`
- nagłówek `Zweryfikuj adres e-mail`

## B. Logowanie i onboarding
1. Otwórz `/login`.
2. Sprawdź obecność:
- `Witamy w Avatar!`
- `Zapisz moje dane`
- `Zapomniałeś hasła?`
3. Zaloguj się nowym kontem.
4. Jeśli konto nie ma potwierdzonego onboardingu, oczekiwane:
- przekierowanie na `/onboarding/confirm`
- możliwość zapisania danych i przejścia do `/dashboard`

## C. Płatność (3 kroki)
1. Otwórz `/payment`.
2. Krok 1/3 (`Szczegóły pakietu`):
- zaznacz pakiet
- kliknij `Dalej`
3. Krok 2/3 (`Metoda płatności`):
- wybierz np. `Karta kredytowa`
- kliknij `Dalej`
4. Krok 3/3 (`Płatność`):
- kliknij `Przejdź do płatności`
5. Oczekiwane:
- przekierowanie do Stripe Checkout

## D. Powrót po płatności
1. Po sukcesie płatności wejście na `/payment/success`.
2. Kliknij `Przejdź do wywiadu`.
3. Oczekiwane:
- wejście na `/interview`

## E. Wywiad po zakupie
1. Otwórz `/interview` bez zakupu.
2. Oczekiwane:
- przekierowanie na `/payment`
3. Po zakupie:
- przejdź kilka kroków wywiadu
- kliknij `Zapisz roboczo`
- odśwież stronę
4. Oczekiwane:
- zapisane wartości pozostają
5. Na końcu kliknij `Wyślij wywiad`.
6. Oczekiwane:
- powrót do `/dashboard`

## F. Dashboard i stany
1. Brak zakupu:
- widoczne karty planów
2. Po zakupie, przed wywiadem:
- widoczny komunikat i CTA do wywiadu
3. Po wywiadzie, bez wyników:
- widoczny komunikat o oczekiwaniu na wyniki
4. Po dodaniu rekomendacji przez admina:
- sekcja podsumowania zaleceń i link do szczegółów

## G. Nawigacja user
1. Sprawdź menu główne:
- Dashboard
- Wyniki badań
- Mój profil
- Pomoc
- Program polecający
2. Sprawdź `Więcej`:
- Moje zalecenia
- Wywiad żywieniowy

## H. Admin
1. Zaloguj się jako admin.
2. Sprawdź menu główne:
- Pacjenci
- Partnerzy
- Pomoc
3. Sprawdź `Więcej`:
- Import CSV
- Eksport CSV
4. Pacjenci:
- otwórz profil pacjenta
- dodaj notatkę
- sprawdź zakładki danych
5. Kreator zaleceń:
- utwórz zalecenie
- zaznacz układy ciała
- zapisz

## I. Regresja
1. `Zapomniałeś hasła?` wysyła link resetu.
2. Dodatkowe funkcje nie zniknęły (są pod `Więcej`).
3. Logowanie i role (admin/user) działają poprawnie.
4. Brak błędów krytycznych w konsoli przy przejściu pełnego flow.
