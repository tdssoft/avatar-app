

# Plan: Więcej koloru w UI - styl jak na stronie Avatar

## Analiza referencji

Na podstawie załączonego zrzutu strony Avatar widzę:

| Element | Styl na stronie Avatar |
|---------|------------------------|
| Główne tło sekcji | Turkusowe (#00B5D8) - nie białe! |
| Karty/przyciski | Białe na turkusowym tle |
| Nagłówki | Białe na turkusowym tle |
| Nawigacja górna | Kolorowe przyciski (zielony, teal, różowy) |
| Tekst na turkusie | Biały |

**Obecnie w aplikacji**: Białe tło z turkusowymi elementami
**Docelowo**: Turkusowe tło z białymi kartami (jak na stronie Avatar)

---

## Zakres zmian

### 1. Główne tło aplikacji - zmiana z białego na turkusowe

**Pliki do zmiany:**

| Komponent | Zmiana |
|-----------|--------|
| `DashboardLayout.tsx` | Główny obszar: `bg-primary` zamiast `bg-background` |
| `AdminLayout.tsx` | Główny obszar: `bg-primary` zamiast `bg-background` |
| `AuthLayout.tsx` | Prawa strona już jest `bg-secondary`, lewa może być `bg-primary` |
| Header | Białe tło z cieniem, tekst ciemny |

### 2. Sidebar - utrzymanie jasnego tła

Sidebar pozostaje jasny (biały/lekko turkusowy) dla kontrastu z głównym obszarem.

### 3. Karty - białe z lekkim cieniem

Karty pozostają białe (`bg-card`), ale zyskują lepszy kontrast na turkusowym tle.

### 4. Teksty na głównym tle

Na turkusowym tle tekst powinien być biały:
- Nagłówki stron → `text-white`
- Opisy → `text-white/80`

### 5. Przyciski nawigacyjne (opcjonalne rozszerzenie)

Dodanie kolorowych przycisków jak na stronie:
- Zielony (limonka)
- Teal
- Różowy

---

## Szczegółowe zmiany w plikach

### `src/components/layout/DashboardLayout.tsx`

```tsx
// PRZED:
<div className="min-h-screen bg-background flex">
  ...
  <main className="flex-1 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8">

// PO:
<div className="min-h-screen bg-background flex">
  ...
  {/* Główny content z turkusowym tłem */}
  <main className="flex-1 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8 bg-primary">
```

### `src/components/layout/AdminLayout.tsx`

```tsx
// Analogiczna zmiana - turkusowe tło głównego obszaru
<main className="flex-1 min-h-0 p-6 md:p-8 lg:p-12 pt-6 lg:pt-8 bg-primary">
```

### `src/pages/Dashboard.tsx`

```tsx
// Nagłówki na turkusowym tle = biały tekst
<h1 className="text-2xl md:text-3xl font-bold text-white">
  Witamy w Avatar!
</h1>

<h2 className="text-lg font-bold text-white mb-4">
  Twoja ścieżka pracy z ciałem...
</h2>
```

### `src/pages/admin/AdminDashboard.tsx`

```tsx
// Analogicznie - białe teksty na turkusowym tle
<h1 className="text-2xl font-semibold text-white">Lista pacjentów</h1>
<p className="text-white/80 mt-1">Zarządzaj kontami...</p>
```

### `src/components/layout/AuthLayout.tsx`

```tsx
// Lewa strona (formularz) - turkusowe tło
<div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-primary">
  <div className="w-full max-w-md bg-card rounded-xl p-8 shadow-lg">
    {children}
  </div>
</div>
```

---

## Przed/Po wizualizacja

```text
PRZED (zbyt białe):
┌─────────────────────────────────┐
│ [Sidebar] │ BIAŁE TŁO          │
│           │ turkusowe elementy  │
│           │ białe karty         │
└─────────────────────────────────┘

PO (jak Avatar):
┌─────────────────────────────────┐
│ [Sidebar] │ TURKUSOWE TŁO      │
│  jasny    │ białe nagłówki      │
│           │ białe karty         │
└─────────────────────────────────┘
```

---

## Podsumowanie plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/layout/DashboardLayout.tsx` | Turkusowe tło main, biały header |
| `src/components/layout/AdminLayout.tsx` | Turkusowe tło main, biały header |
| `src/components/layout/AuthLayout.tsx` | Turkusowe tło lewej strony |
| `src/pages/Dashboard.tsx` | Białe teksty na turkusowym tle |
| `src/pages/admin/AdminDashboard.tsx` | Białe teksty na turkusowym tle |
| `src/pages/Profile.tsx` | Białe nagłówki |
| `src/pages/Results.tsx` | Białe nagłówki |
| `src/pages/Referrals.tsx` | Białe nagłówki |
| `src/pages/Help.tsx` | Białe nagłówki |
| `src/pages/Recommendations.tsx` | Białe nagłówki |
| Inne strony dashboardu | Analogiczne zmiany |

---

## Efekt końcowy

Po wdrożeniu aplikacja będzie mieć:
- Duże turkusowe tła (jak na stronie Avatar)
- Białe karty i formularze na turkusowym tle
- Jasny sidebar dla kontrastu
- Biały tekst na głównych sekcjach
- Profesjonalny, kolorowy wygląd zgodny z marką

