
# Plan: Naprawa i test przepływu tworzenia partnerów

## Zidentyfikowane problemy podczas testowania

### Problem 1: Brak możliwości zalogowania jako admin
**Sytuacja:** Hasło do konta admin (`admin@admin.pl`) jest nieznane, a aktualnie zalogowany użytkownik (`alan.urban23@gmail.com`) nie ma roli admina.

**Rozwiązanie:** Dodanie skryptu/migracji SQL do nadania roli admina użytkownikowi lub resetowania hasła.

### Problem 2: Przepływ tworzenia partnera wymaga weryfikacji
Kod wygląda poprawnie, ale wymaga rzeczywistego testu end-to-end.

---

## Stan obecny w bazie danych

**Partnerzy z kodem polecającym:**
- `alan.urban23@gmail.com` - kod `0YV2NV22` - 2 polecenia

**Polecone osoby:**
| Imię | Email | Status | Data |
|------|-------|--------|------|
| Artur | aurban@liveengage.io | pending | 2026-01-31 |
| Jan | alan@airecepcjonistka.pl | pending | 2026-01-31 |

**Admin:**
- `admin@admin.pl` (hasło nieznane)

---

## Plan naprawy

### Część 1: Przywrócenie dostępu do panelu admina

**Opcja A - Nadanie roli admina istniejącemu użytkownikowi:**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('c2a69448-3c62-4e0c-8d2a-a0f1df823899', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

**Opcja B - Reset hasła admina przez Edge Function:**
Stworzenie tymczasowej edge function do resetu hasła.

### Część 2: Test przepływu po naprawie

Po uzyskaniu dostępu do panelu admina, test będzie wyglądał następująco:

```text
1. Zaloguj się jako admin
         │
         ▼
2. Przejdź do /admin/partners
         │
         ▼
3. Kliknij "Dodaj partnera"
   - Imię: Test
   - Nazwisko: Partner
   - Email: testpartner@example.com
         │
         ▼
4. Skopiuj dane logowania (email + hasło tymczasowe)
         │
         ▼
5. Wyloguj się z konta admina
         │
         ▼
6. Zaloguj się jako nowy partner
         │
         ▼
7. Przejdź do /dashboard/referrals
   - Skopiuj link polecający
         │
         ▼
8. Otwórz link w trybie prywatnym
   - Zarejestruj nowego użytkownika przez polecenie
         │
         ▼
9. Aktywuj email w bazie (SET email_confirmed_at)
         │
         ▼
10. Zaloguj się ponownie jako partner
    - Sprawdź czy widzi poleconą osobę
         │
         ▼
11. Zaloguj się jako admin
    - Sprawdź czy widzi:
      a) Nowego partnera na liście
      b) Poleconą osobę przy partnerze
```

---

## Techniczne szczegóły do wdrożenia

### 1. Migracja SQL - nadanie roli admina
```sql
-- Opcja: Nadaj rolę admina użytkownikowi do testów
INSERT INTO public.user_roles (user_id, role)
SELECT 'c2a69448-3c62-4e0c-8d2a-a0f1df823899', 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = 'c2a69448-3c62-4e0c-8d2a-a0f1df823899' 
  AND role = 'admin'
);
```

### 2. Alternatywa - Reset hasła admina
```sql
-- Można też stworzyć nowe konto admina z Edge Function
-- lub użyć supabase dashboard do resetu hasła
```

---

## Rekomendacja

**Zalecam Opcję A** - nadanie roli admina użytkownikowi `alan.urban23@gmail.com`, ponieważ:
1. Ten użytkownik jest już zalogowany
2. Ma działające hasło
3. Można natychmiast przetestować funkcjonalność

Po zatwierdzeniu tego planu:
1. Wykonam migrację SQL nadającą rolę admina
2. Przeprowadzę pełny test E2E tworzenia partnera i poleceń
3. Zweryfikuję widoczność danych dla admina i partnera

---

## Oczekiwane rezultaty po teście

| Krok | Oczekiwany rezultat |
|------|---------------------|
| Tworzenie partnera | Partner widoczny na liście z kodem polecającym |
| Logowanie partnera | Partner widzi stronę /dashboard/referrals |
| Polecenie osoby | Nowa osoba rejestruje się z ?ref=KOD |
| Widok partnera | Partner widzi poleconą osobę w statystykach |
| Widok admina | Admin widzi partnera + liczbę poleceń + przycisk "Zobacz poleconych" |
