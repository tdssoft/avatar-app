
# Plan: Eliminacja wszystkich placeholderów i wdrożenie funkcjonalnych wersji

## Podsumowanie zidentyfikowanych problemów

Przeanalizowałem całą aplikację i znalazłem **12 głównych placeholderów/niedziałających elementów**, które wymagają naprawy.

---

## 1. Strona Help.tsx - Przyciski kontaktowe (niedziałające)

**Problem:** Trzy przyciski kontaktowe ("Napisz email", "Zadzwoń", "Rozpocznij czat") nie wykonują żadnej akcji.

**Rozwiązanie:**
- "Napisz email" → `window.location.href = 'mailto:kontakt@avatar.pl'`
- "Zadzwoń" → `window.location.href = 'tel:+48123456789'`
- "Rozpocznij czat" → Otwiera popup/modal z formularzem kontaktowym (zapisuje do tabeli `support_tickets`)

**Nowe elementy:**
- Tabela `support_tickets` w bazie danych
- Modal kontaktowy z formularzem

---

## 2. Strona Profile.tsx - Przyciski "Zmień hasło" i "Edytuj dane" (niedziałające)

**Problem:** Oba przyciski na dole strony profilu nie wykonują żadnej akcji.

**Rozwiązanie:**
- "Zmień hasło" → Otwiera modal z formularzem zmiany hasła (używa `supabase.auth.updateUser`)
- "Edytuj dane" → Aktywuje tryb edycji formularza (odblokowanie inputów + przycisk "Zapisz")

**Nowe komponenty:**
- `ChangePasswordDialog.tsx`
- Stan `isEditing` z możliwością edycji pól

---

## 3. Strona Results.tsx - Przycisk "Wyślij" pytanie (niedziałający)

**Problem:** Przycisk "Wyślij" pod tekstarea do zadawania pytań nie wykonuje żadnej akcji.

**Rozwiązanie:**
- Zapisuje pytanie do tabeli `patient_messages` z `message_type = 'question'`
- Wyświetla toast sukcesu
- Czyści pole tekstowe

---

## 4. Strona Results.tsx - Sekcja "Zleć kolejną diagnostykę" (pusty placeholder)

**Problem:** Sekcja zawiera tylko komentarz `{/* Placeholder dla kart pakietów */}` - nic nie wyświetla.

**Rozwiązanie:**
- Wyświetla te same karty pakietów co na Dashboard.tsx
- Każda karta kieruje do `/payment`

---

## 5. Strona Dashboard.tsx - Sekcja "Zalecenia zdrowotne" (statyczny tekst)

**Problem:** Sekcja zawiera tylko statyczny tekst bez żadnych dokumentów do pobrania.

**Rozwiązanie:**
- Pobiera zalecenia z tabeli `recommendations` dla aktywnego profilu
- Wyświetla listę dokumentów do pobrania (z linkiem do `/dashboard/recommendations`)
- Jeśli brak zaleceń - wyświetla komunikat "Brak zaleceń"

---

## 6. Admin PatientProfile.tsx - Brak możliwości wysłania wiadomości

**Problem:** Zakładka "Notatki" pozwala tylko przeglądać wiadomości pacjenta, ale admin nie może odpowiedzieć.

**Rozwiązanie:**
- Dodać formularz odpowiedzi w sekcji wiadomości
- Zapisuje odpowiedź do `patient_messages` z `message_type = 'answer'`

---

## 7. Strona NutritionInterview.tsx - Hardcoded labels (częściowy placeholder)

**Problem:** Etykiety dla aktywności fizycznej, stresu i diety są zahardcodowane w kodzie.

**Status:** To jest akceptowalne dla MVP - te wartości rzadko się zmieniają.

---

## 8. Hardcoded dane kontaktowe

**Problem:** Email (kontakt@avatar.pl) i telefon (+48 123 456 789) są zahardcodowane w kilku miejscach.

**Rozwiązanie:**
- Stworzyć plik konfiguracyjny `src/config/contact.ts` z centralnymi danymi kontaktowymi
- Importować w Help.tsx i innych miejscach

---

## Nowe tabele bazy danych

```text
Tabela: support_tickets
-----------------------
- id: uuid (PK)
- user_id: uuid (FK)
- person_profile_id: uuid (FK, nullable)
- subject: text
- message: text
- status: text (default: 'open')
- created_at: timestamp
- updated_at: timestamp

RLS:
- Users can INSERT own tickets
- Users can SELECT own tickets
- Admins can SELECT/UPDATE all tickets
```

---

## Szczegółowy plan implementacji

### Etap 1: Baza danych
1. Utworzyć tabelę `support_tickets`
2. Dodać polityki RLS

### Etap 2: Komponenty pomocnicze
1. `src/config/contact.ts` - centralne dane kontaktowe
2. `src/components/profile/ChangePasswordDialog.tsx` - modal zmiany hasła
3. `src/components/support/ContactFormDialog.tsx` - modal formularza kontaktowego

### Etap 3: Naprawić strony
1. **Help.tsx:**
   - Podłączyć przyciski email i telefon
   - Dodać modal czatu/kontaktu

2. **Profile.tsx:**
   - Dodać dialog zmiany hasła
   - Dodać tryb edycji z zapisem do bazy

3. **Results.tsx:**
   - Podłączyć wysyłanie pytań do bazy
   - Wyświetlić karty pakietów w sekcji "Zleć diagnostykę"

4. **Dashboard.tsx:**
   - Pobrać i wyświetlić zalecenia w sekcji "Zalecenia zdrowotne"

5. **PatientProfile.tsx (admin):**
   - Dodać formularz odpowiedzi na wiadomości pacjenta

---

## Pliki do utworzenia
- `supabase/migrations/xxx_support_tickets.sql`
- `src/config/contact.ts`
- `src/components/profile/ChangePasswordDialog.tsx`
- `src/components/support/ContactFormDialog.tsx`

## Pliki do modyfikacji
- `src/pages/Help.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Results.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/admin/PatientProfile.tsx`

---

## Podsumowanie zmian

| Element | Stan przed | Stan po |
|---------|------------|---------|
| Help - Email button | Niedziałający | Otwiera mailto: |
| Help - Phone button | Niedziałający | Otwiera tel: |
| Help - Chat button | Niedziałający | Otwiera formularz kontaktowy |
| Profile - Zmień hasło | Niedziałający | Modal z formularzem |
| Profile - Edytuj dane | Niedziałający | Tryb edycji + zapis |
| Results - Wyślij pytanie | Niedziałający | Zapisuje do bazy |
| Results - Pakiety | Pusty placeholder | Karty pakietów |
| Dashboard - Zalecenia | Statyczny tekst | Lista dokumentów |
| Admin - Odpowiedz pacjentowi | Brak | Formularz odpowiedzi |

Po zatwierdzeniu planu wdrożę wszystkie funkcjonalne wersje.
