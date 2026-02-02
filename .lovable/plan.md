

# Plan naprawy widoku wywiadu żywieniowego dla pacjenta

## Problem

Obecna strona wywiadu żywieniowego (`/dashboard/interview`) dla pacjenta ma następujące problemy:

1. **Brak widoku historii** - strona zawsze pokazuje formularz edycji, nawet gdy wywiad został już zapisany
2. **Brak rozróżnienia stanów** - nie ma różnicy między:
   - Podglądem zapisanego wywiadu (tylko do odczytu)
   - Edycją istniejącego wywiadu
   - Tworzeniem nowego wywiadu
3. **Zapisany wywiad niewidoczny** - użytkownik nie widzi że wywiad został zapisany, tylko pusty formularz

## Oczekiwane zachowanie

```text
┌─────────────────────────────────────────────────────────────┐
│                    WIDOK DOMYŚLNY                           │
│                                                             │
│  Jeśli wywiad istnieje:                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Podgląd zapisanego wywiadu (tylko do odczytu)      │   │
│  │  - Wyświetla wypełnione dane                        │   │
│  │  - Przycisk "Edytuj wywiad" → tryb formularza       │   │
│  │  - Data ostatniej aktualizacji                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Jeśli wywiad nie istnieje:                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Komunikat "Brak wywiadu"                           │   │
│  │  Przycisk "Rozpocznij wywiad" → tryb formularza     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                    TRYB EDYCJI                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Formularz z polami do wypełnienia                  │   │
│  │  - Przycisk "Zapisz wywiad"                         │   │
│  │  - Przycisk "Anuluj" (powrót do podglądu)          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Rozwiązanie techniczne

### Modyfikacja `src/pages/NutritionInterview.tsx`

1. **Dodać stan trybu edycji**:
```typescript
const [isEditing, setIsEditing] = useState(false);
```

2. **Logika wyświetlania**:
   - Jeśli `interview === null` → pokaż komunikat "Brak wywiadu" + przycisk "Rozpocznij"
   - Jeśli `interview !== null && !isEditing` → pokaż podgląd danych (tylko odczyt) + przycisk "Edytuj"
   - Jeśli `isEditing === true` → pokaż formularz edycji + przyciski "Zapisz" i "Anuluj"

3. **Wykorzystać istniejące komponenty**:
   - Skopiować logikę wyświetlania z `AdminInterviewView.tsx` (komponenty `InfoRow`, `TextSection`)
   - Użyć tych samych etykiet i formatowania

4. **Przepływ użytkownika**:
   - Po kliknięciu "Rozpocznij wywiad" lub "Edytuj" → `setIsEditing(true)`
   - Po zapisaniu → `setIsEditing(false)` + odśwież dane
   - Po kliknięciu "Anuluj" → `setIsEditing(false)` + przywróć oryginalne dane

## Szczegółowe zmiany

### Plik: `src/pages/NutritionInterview.tsx`

**Dodać:**
- Stan `isEditing: boolean` (domyślnie `false`)
- Komponenty pomocnicze `InfoRow` i `TextSection` (skopiowane z AdminInterviewView)
- Mapowania etykiet dla wartości select (`activityLabels`, `stressLabels`, `dietLabels`, itp.)
- Widok podglądu (read-only) z przyciskiem "Edytuj wywiad"
- Komunikat "Brak wywiadu" z przyciskiem "Rozpocznij wywiad"
- Przycisk "Anuluj" w trybie edycji

**Zmienić:**
- Logika `fetchInterview`:
  - Jeśli wywiad istnieje → `setIsEditing(false)` (pokaż podgląd)
  - Jeśli nie istnieje → `setIsEditing(true)` (pokaż formularz do tworzenia)
- Logika `handleSave`:
  - Po zapisaniu → `setIsEditing(false)` + refetch

**Struktura renderowania:**
```tsx
{isLoading ? (
  <Loader />
) : !interview && !isEditing ? (
  // Stan: Brak wywiadu
  <EmptyState onStart={() => setIsEditing(true)} />
) : isEditing ? (
  // Stan: Tryb edycji/tworzenia
  <EditForm onSave={handleSave} onCancel={() => setIsEditing(false)} />
) : (
  // Stan: Podgląd zapisanego wywiadu
  <InterviewView interview={interview} onEdit={() => setIsEditing(true)} />
)}
```

## Dodatkowe poprawki

### Konsola - ostrzeżenia o ref

W logach konsoli widzę ostrzeżenia:
```
Function components cannot be given refs. Check the render method of `Sidebar`
Function components cannot be given refs. Check the render method of `SidebarContent`
```

Te błędy są związane z komponentami `SidebarContent` i `ProfileSelector`, które nie są opakowane w `React.forwardRef()`. Naprawię to również.

### Pliki do modyfikacji:
1. `src/pages/NutritionInterview.tsx` - główna przebudowa logiki widoku
2. `src/components/layout/Sidebar.tsx` - naprawić ref dla SidebarContent
3. `src/components/profile/ProfileSelector.tsx` - naprawić ref

## Czas realizacji

- Przebudowa NutritionInterview.tsx: ~15 min
- Naprawa ostrzeżeń ref: ~5 min
- **Łącznie: ~20 min**

