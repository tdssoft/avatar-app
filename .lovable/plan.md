
# Plan: Ujednolicenie kolorystyki UI w całej aplikacji

## Problem
Strona `AdminDashboard` (Lista pacjentów) wygląda dobrze z białą kartą i białymi nagłówkami na turkusowym tle, ale pozostałe strony nadal używają starych klas kolorów (`text-foreground`, `text-muted-foreground`), które źle wyglądają na turkusowym tle.

## Wzorzec do zastosowania (z AdminDashboard.tsx)
1. **Nagłówki** → `text-white`
2. **Opisy** → `text-white/80`
3. **Przyciski akcji w nagłówku** → `bg-white text-primary hover:bg-white/90`
4. **Główna zawartość** → opakowana w `<div className="bg-card rounded-xl shadow-lg p-6">`

## Strony do aktualizacji

### Panel Administratora (6 stron)
| Plik | Zmiany |
|------|--------|
| `Partners.tsx` | Nagłówek → `text-white`, opis → `text-white/80`, przycisk → biały, Card opakowanie |
| `ExportData.tsx` | Nagłówek → `text-white`, opis → `text-white/80` |
| `ImportPatients.tsx` | Nagłówek → `text-white`, opis → `text-white/80` |
| `PatientProfile.tsx` | Nagłówek → `text-white`, opis → `text-white/80` |
| `RecommendationCreator.tsx` | Nagłówek → `text-white`, opis → `text-white/80` |

### Panel Użytkownika (7 stron - już częściowo zaktualizowane)
| Plik | Status | Zmiany potrzebne |
|------|--------|------------------|
| `Dashboard.tsx` | ✅ Gotowe | — |
| `Profile.tsx` | ✅ Gotowe | — |
| `Results.tsx` | ✅ Gotowe | — |
| `Referrals.tsx` | ✅ Gotowe | — |
| `Help.tsx` | ✅ Gotowe | — |
| `Recommendations.tsx` | ✅ Gotowe | — |
| `NutritionInterview.tsx` | ❌ | Nagłówek → `text-white`, opis → `text-white/80` |

### Strony bez layoutu (standalone)
| Plik | Zmiany |
|------|--------|
| `Payment.tsx` | Tło → `bg-primary`, teksty → `text-white` |
| `PaymentSuccess.tsx` | Brak zmian (używa białej karty na środku) |

---

## Szczegółowe zmiany

### 1. `Partners.tsx` (linie 240-255)

**Przed:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Partnerzy polecający</h1>
<p className="text-muted-foreground mt-1">
```

**Po:**
```tsx
<h1 className="text-2xl font-semibold text-white">Partnerzy polecający</h1>
<p className="text-white/80 mt-1">
```

Dodatkowo:
- Przycisk "Dodaj partnera" → `bg-white text-primary hover:bg-white/90`

### 2. `ExportData.tsx` (linie 117-125)

**Przed:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Eksport danych</h1>
<p className="text-muted-foreground">Eksportuj dane pacjentów do pliku CSV</p>
```

**Po:**
```tsx
<h1 className="text-2xl font-semibold text-white">Eksport danych</h1>
<p className="text-white/80">Eksportuj dane pacjentów do pliku CSV</p>
```

### 3. `ImportPatients.tsx` (linie 195-203)

**Przed:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Import pacjentów</h1>
<p className="text-muted-foreground">Importuj dane pacjentów z pliku CSV</p>
```

**Po:**
```tsx
<h1 className="text-2xl font-semibold text-white">Import pacjentów</h1>
<p className="text-white/80">Importuj dane pacjentów z pliku CSV</p>
```

### 4. `PatientProfile.tsx` (linie 425-433)

**Przed:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Pacjent: {fullName}</h1>
<p className="text-muted-foreground">Zarządzaj danymi pacjenta i zaleceniami</p>
```

**Po:**
```tsx
<h1 className="text-2xl font-semibold text-white">Pacjent: {fullName}</h1>
<p className="text-white/80">Zarządzaj danymi pacjenta i zaleceniami</p>
```

### 5. `RecommendationCreator.tsx` (linie 237-249 i 186-197)

**Przed:**
```tsx
<h1 className="text-2xl font-semibold text-foreground">Kreator zaleceń</h1>
<p className="text-muted-foreground">Utwórz nowe zalecenia dla pacjenta</p>
```

**Po:**
```tsx
<h1 className="text-2xl font-semibold text-white">Kreator zaleceń</h1>
<p className="text-white/80">Utwórz nowe zalecenia dla pacjenta</p>
```

### 6. `NutritionInterview.tsx`

Nagłówek sekcji w komponencie - zmiana kolorów dla głównego tytułu strony.

### 7. `Payment.tsx` (linie 106-189)

Zmiana tła głównego kontenera na turkusowe i dostosowanie kolorów tekstów.

---

## Efekt końcowy

Po wdrożeniu wszystkie strony będą miały spójny wygląd:
- Turkusowe tło głównego obszaru (z layoutu `AdminLayout` / `DashboardLayout`)
- Białe nagłówki i opisy na turkusowym tle
- Białe karty z zawartością formularzy i tabel
- Przyciski akcji w nagłówku w białym kolorze z turkusowym tekstem

## Pliki do modyfikacji (łącznie 7)

1. `src/pages/admin/Partners.tsx`
2. `src/pages/admin/ExportData.tsx`
3. `src/pages/admin/ImportPatients.tsx`
4. `src/pages/admin/PatientProfile.tsx`
5. `src/pages/admin/RecommendationCreator.tsx`
6. `src/pages/NutritionInterview.tsx`
7. `src/pages/Payment.tsx`
