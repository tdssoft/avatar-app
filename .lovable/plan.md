
# Plan naprawy systemu wywiadu żywieniowego

## Zdiagnozowane problemy

### Problem 1: Nieskończone ładowanie (infinite loading spinner)
Gdy użytkownik nie ma przypisanych `person_profiles`, strona wyświetla spinner w nieskończoność.

**Przyczyna techniczna:**
```typescript
// fetchProfiles zwraca pustą tablicę
setProfiles(data || []);  // profiles = []
// selectedProfileId nigdy nie jest ustawiane
// useEffect z fetchInterview nigdy się nie odpala
// isLoading = true pozostaje na zawsze
```

**Rozwiązanie:** Po pobraniu profili, jeśli lista jest pusta, ustawić `isLoading = false` i wyświetlić komunikat "Brak profili".

### Problem 2: Brak historii wywiadów
Obecna implementacja zakłada **1 wywiad na profil** (używa `maybeSingle()`). Użytkownik oczekuje:
- Lista wszystkich wywiadów dla profilu (historia)
- Status wywiadu: **draft** (roboczy, edytowalny) lub **sent** (wysłany, tylko do odczytu)
- Możliwość tworzenia nowych wywiadów

---

## Plan implementacji

### Etap 1: Rozszerzenie bazy danych

Dodać kolumnę `status` do tabeli `nutrition_interviews`:

```sql
ALTER TABLE nutrition_interviews 
ADD COLUMN status text NOT NULL DEFAULT 'draft' 
CHECK (status IN ('draft', 'sent'));
```

### Etap 2: Zmiana architektury widoku

Nowa struktura strony NutritionInterview:

```text
┌───────────────────────────────────────────────────────────────────┐
│  NAGŁÓWEK: "Wywiad żywieniowy" + selektor profilu                 │
├───────────────────────────────────────────────────────────────────┤
│  [+ Nowy wywiad]  (tylko jeśli nie ma aktywnego draftu)           │
├───────────────────────────────────────────────────────────────────┤
│  LISTA WYWIADÓW:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  📝 Roboczy wywiad       Data: 02.02.2026                    │ │
│  │  Status: Roboczy         [Edytuj] [Wyślij]                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ✓ Wywiad #1             Data: 15.01.2026                    │ │
│  │  Status: Wysłany         [Podgląd]                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────────────────┤
│  WIDOK SZCZEGÓŁOWY (gdy wybrany wywiad):                          │
│  - Podgląd danych (tylko odczyt dla status=sent)                  │
│  - Formularz edycji (dla status=draft)                            │
└───────────────────────────────────────────────────────────────────┘
```

### Etap 3: Stany widoku

```text
1. LISTA (domyślny):
   - Wyświetla listę wywiadów dla wybranego profilu
   - Przycisk "Nowy wywiad" (ukryty jeśli istnieje draft)
   - Kliknięcie na wywiad -> przejście do PODGLĄD lub EDYCJA

2. PODGLĄD (status = 'sent'):
   - Wyświetla dane tylko do odczytu
   - Przycisk "Powrót do listy"

3. EDYCJA (status = 'draft'):
   - Formularz z polami do edycji
   - Przyciski: "Zapisz" (zachowuje draft), "Wyślij" (zmienia na sent), "Anuluj"

4. TWORZENIE:
   - Formularz pusty
   - Przyciski: "Zapisz jako roboczy", "Anuluj"

5. BRAK PROFILI:
   - Komunikat "Nie masz przypisanych profili"
   - Link do strony profili
```

### Etap 4: Zmiany w pliku src/pages/NutritionInterview.tsx

**Nowe stany:**
```typescript
type ViewMode = 'list' | 'view' | 'edit' | 'create';

const [viewMode, setViewMode] = useState<ViewMode>('list');
const [interviews, setInterviews] = useState<Interview[]>([]);
const [selectedInterviewId, setSelectedInterviewId] = useState<string | null>(null);
```

**Nowe typy:**
```typescript
interface Interview {
  id: string;
  content: InterviewData;
  status: 'draft' | 'sent';
  created_at: string;
  last_updated_at: string;
}
```

**Nowe funkcje:**
- `fetchInterviews()` - pobiera wszystkie wywiady dla profilu (nie tylko jeden)
- `handleSendInterview()` - zmienia status na 'sent'
- `handleCreateNew()` - przechodzi do tworzenia nowego (tylko jeśli nie ma draftu)
- `handleViewInterview(id)` - otwiera podgląd
- `handleEditInterview(id)` - otwiera edycję (tylko dla draft)

### Etap 5: Naprawienie problemu z brakiem profili

W `fetchProfiles()` dodać obsługę pustej listy:
```typescript
const fetchProfiles = async () => {
  // ... istniejący kod ...
  
  setProfiles(data || []);
  
  if (!data || data.length === 0) {
    // Brak profili - zakończ ładowanie
    setIsLoading(false);
    return;
  }
  
  // Auto-select primary profile
  const primaryProfile = data.find((p) => p.is_primary);
  // ...
};
```

---

## Przepływ użytkownika

```text
1. Pacjent wchodzi na stronę wywiadu
   ↓
2. System pobiera profile i wywiady
   ↓
3a. Brak profili → Komunikat + link do tworzenia profilu
3b. Ma profile → Wyświetla listę wywiadów
   ↓
4. Kliknięcie "Nowy wywiad":
   - Sprawdza czy nie ma aktywnego draftu
   - Jeśli nie ma → formularz tworzenia
   - Jeśli jest → komunikat "Masz już roboczy wywiad"
   ↓
5. Edycja draftu:
   - "Zapisz" → zapisuje zmiany, pozostaje draft
   - "Wyślij" → zmienia status na sent, blokuje edycję
   ↓
6. Podgląd wysłanego wywiadu:
   - Tylko odczyt
   - Przycisk "Powrót do listy"
```

---

## Szczegóły techniczne

### Migracja bazy danych
```sql
-- Dodanie kolumny status
ALTER TABLE nutrition_interviews 
ADD COLUMN status text NOT NULL DEFAULT 'draft';

-- Dodanie constrainta
ALTER TABLE nutrition_interviews 
ADD CONSTRAINT nutrition_interviews_status_check 
CHECK (status IN ('draft', 'sent'));

-- Istniejące wywiady oznacz jako wysłane (opcjonalnie)
UPDATE nutrition_interviews SET status = 'sent' WHERE status = 'draft';
```

### Zmodyfikowane komponenty

**renderInterviewList()** - nowy komponent listy:
- Wyświetla karty z wywiadami
- Badge statusu (Roboczy / Wysłany)
- Akcje zależne od statusu

**renderInterviewForm()** - ujednolicony formularz:
- Parametr `isReadOnly` dla wysłanych wywiadów
- Przyciski zależne od trybu (create/edit/view)

### Pliki do modyfikacji:
1. `supabase/migrations/xxx.sql` - dodanie kolumny status
2. `src/pages/NutritionInterview.tsx` - przebudowa logiki i widoków
3. `src/integrations/supabase/types.ts` - automatycznie się zaktualizuje

---

## Podsumowanie zmian

| Element | Obecny stan | Po zmianach |
|---------|-------------|-------------|
| Liczba wywiadów | 1 per profil | Wiele per profil |
| Status | Brak | draft / sent |
| Widok domyślny | Formularz/podgląd | Lista wywiadów |
| Edycja wysłanego | Możliwa | Zablokowana |
| Brak profili | Infinite loading | Komunikat + link |
| Tworzenie nowego | Nadpisuje istniejący | Dodaje do listy |

Po zatwierdzeniu planu implementuję wszystkie zmiany.
