
# Plan uzupełnienia brakujących funkcjonalności

## Przegląd

Analiza kodu względem planu projektu (`.lovable/plan.md`) wykazała kilka brakujących lub niekompletnych funkcjonalności. Poniżej przedstawiam szczegółowy plan ich implementacji.

---

## 1. Edycja wywiadu przez admina (Priorytet: WYSOKI)

### Problem
Komponent `AdminInterviewView.tsx` wyświetla dane wywiadu w trybie tylko do odczytu. Admin nie może edytować wywiadu żywieniowego pacjenta.

### Rozwiązanie
Rozbudować `AdminInterviewView.tsx` o tryb edycji:
- Dodać przycisk "Edytuj wywiad" przełączający widok w tryb formularza
- Wykorzystać strukturę formularza z `NutritionInterview.tsx` (te same pola)
- Zapisywać zmiany z oznaczeniem `last_updated_by` jako ID admina
- Dodać przycisk "Anuluj" do powrotu do trybu podglądu

### Pliki do modyfikacji
- `src/components/admin/AdminInterviewView.tsx` - dodanie trybu edycji

---

## 2. Obsługa wygaśnięcia tokenu zaleceń (Priorytet: ŚREDNI)

### Problem
Tokeny do pobierania zaleceń mają datę wygaśnięcia (`token_expires_at`), ale:
- Edge function `verify-download-token` nie sprawdza wygaśnięcia
- Brak możliwości regeneracji wygasłego tokenu

### Rozwiązanie
- W `verify-download-token/index.ts` dodać walidację `token_expires_at`
- W panelu admina dodać przycisk "Odnów token" dla wygasłych zaleceń
- W widoku pacjenta wyświetlać status tokenu (aktywny/wygasły)

### Pliki do modyfikacji
- `supabase/functions/verify-download-token/index.ts` - walidacja daty
- `src/pages/admin/PatientProfile.tsx` - przycisk regeneracji tokenu
- `src/pages/Recommendations.tsx` - wyświetlanie statusu tokenu

---

## 3. Filtry zaleceń (data, tagi) dla pacjenta (Priorytet: ŚREDNI)

### Problem
Strona "Moje zalecenia" (`Recommendations.tsx`) filtruje tylko po profilu. Brak filtrów po dacie i tagach zgodnie z planem (Faza 3.4).

### Rozwiązanie
Dodać sekcję filtrów:
- Filtr zakresu dat (od-do) z komponentem Calendar/DatePicker
- Filtr tagów (multi-select z dostępnych tagów)
- Zachować istniejący filtr profilu

### Pliki do modyfikacji
- `src/pages/Recommendations.tsx` - dodanie filtrów

---

## 4. System tagów dla pacjentów (Priorytet: NISKI)

### Problem
Plan (Faza 8.3) zakłada system tagów dla pacjentów/profili umożliwiający kategoryzację i filtrowanie. Obecnie tagi istnieją tylko w zaleceniach.

### Rozwiązanie
- Utworzyć tabelę `patient_tags` lub dodać kolumnę `tags` do `patients`
- W panelu admina dodać zarządzanie tagami pacjenta
- W liście pacjentów dodać filtrowanie po tagach

### Wymagane zmiany w bazie
```sql
ALTER TABLE patients ADD COLUMN tags text[] DEFAULT '{}';
```

### Pliki do modyfikacji
- Migracja bazy danych
- `src/pages/admin/AdminDashboard.tsx` - filtr po tagach
- `src/pages/admin/PatientProfile.tsx` - zarządzanie tagami

---

## 5. Audio w kreatorze zaleceń (Priorytet: NISKI)

### Problem
Komponent `AudioRecorder` obsługuje `recommendationId`, ale nie jest używany w `RecommendationCreator.tsx`.

### Rozwiązanie
Po zapisaniu zalecenia, wyświetlić opcję nagrania audio dla tego zalecenia lub przenieść użytkownika do zakładki audio z powiązaniem.

### Pliki do modyfikacji
- `src/pages/admin/RecommendationCreator.tsx` - dodanie sekcji audio po zapisie

---

## 6. Historia zmian wywiadu (Priorytet: NISKI)

### Problem
Plan zakłada historię zmian wywiadu. Obecnie zapisujemy tylko ostatnią aktualizację.

### Rozwiązanie
- Utworzyć tabelę `nutrition_interview_history`
- Przed każdą aktualizacją zapisywać poprzednią wersję
- W panelu admina dodać przycisk "Historia zmian"

### Wymagane zmiany w bazie
```sql
CREATE TABLE nutrition_interview_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid REFERENCES nutrition_interviews(id),
  content jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);
```

---

## Kolejność implementacji (rekomendowana)

| Priorytet | Funkcjonalność | Czas szacowany |
|-----------|----------------|----------------|
| 1 | Edycja wywiadu przez admina | 20 min |
| 2 | Walidacja wygaśnięcia tokenu | 10 min |
| 3 | Filtry zaleceń (data, tagi) | 15 min |
| 4 | System tagów pacjentów | 25 min |
| 5 | Audio w kreatorze zaleceń | 10 min |
| 6 | Historia zmian wywiadu | 30 min |

---

## Podsumowanie

Najważniejszą brakującą funkcjonalnością jest **edycja wywiadu przez admina** - to blokuje codzienną pracę z systemem. Rekomenduję rozpoczęcie od punktów 1-3 jako priorytetowych, a punkty 4-6 potraktować jako opcjonalne ulepszenia.

Po zatwierdzeniu planu mogę przystąpić do implementacji wybranych elementów.
