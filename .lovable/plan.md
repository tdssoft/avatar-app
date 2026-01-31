

# Plan: 5 poprawek interfejsu

## Podsumowanie zmian

Wdrożę 5 poprawek:
1. Przekierowanie po aktywacji maila na /dashboard
2. Dodanie podglądu i pobierania plików
3. Przeniesienie "Twoje zdjęcie" do prawego górnego rogu
4. Przycisk "Wyloguj" pod "Program polecający"
5. Kolorystyka w odcieniach szarości/czerni (bez niebieskiego)

---

## Zmiana 1: Przekierowanie po aktywacji maila

### Plik: `src/contexts/AuthContext.tsx`

Zmienię `emailRedirectTo` w funkcji `signup`:
- Z: `${window.location.origin}/` (strona główna)
- Na: `${window.location.origin}/dashboard`

```typescript
// Linia 139 - zmiana:
const redirectUrl = `${window.location.origin}/dashboard`;
```

---

## Zmiana 2: Podgląd i pobieranie plików

### Plik: `src/components/dashboard/ResultsUpload.tsx`

Dodam przyciski przy każdym pliku:
- **Ikona oka** - podgląd (otwiera w nowej karcie)
- **Ikona pobierania** - pobiera plik

Dla podglądu/pobrania użyję `supabase.storage.from("results").createSignedUrl()` ponieważ bucket "results" jest prywatny.

Struktura listy plików zmieni się z:
```
[ plik.pdf ] [ X ]
```
Na:
```
[ plik.pdf ] [ Podgląd ] [ Pobierz ] [ X ]
```

---

## Zmiana 3: "Twoje zdjęcie" w prawym górnym rogu

### Plik: `src/pages/Results.tsx`

Obecnie:
```jsx
<div className="fixed bottom-6 right-6 hidden lg:block">
  <PhotoUpload className="w-48" />
</div>
```

Zmienię na:
```jsx
<div className="fixed top-20 right-6 hidden lg:block">
  <PhotoUpload className="w-48" />
</div>
```

Użyję `top-20` aby zmieścić się pod nagłówkiem (header ma 64px = h-16).

---

## Zmiana 4: Przycisk "Wyloguj" pod "Program polecający"

### Plik: `src/components/layout/Sidebar.tsx`

Obecnie "Wyloguj" jest w osobnej sekcji na samym dole z border-top.

Przeniosę przycisk "Wyloguj" jako ostatni element listy nawigacji, zaraz po "Program polecający":

```typescript
const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutGrid },
  { title: "Wyniki badań", url: "/dashboard/results", icon: Shield },
  { title: "Mój profil", url: "/dashboard/profile", icon: User },
  { title: "Pomoc", url: "/dashboard/help", icon: MessageCircle },
  { title: "Program polecający", url: "/dashboard/referrals", icon: Handshake },
];

// Przycisk Wyloguj będzie renderowany tuż pod listą nawigacji,
// bez border-top i bez osobnej sekcji
```

Usunę:
```jsx
{/* Logout */}
<div className="p-4 border-t border-border">
```

I dodam przycisk wylogowania bezpośrednio pod listą nawigacji w sekcji `<nav>`.

---

## Zmiana 5: Kolorystyka szarości/czerni (bez niebieskiego)

### Plik: `src/index.css`

Zmienię kolor akcentu z niebieskiego na czarny/szary:

Obecnie:
```css
--accent: 197 100% 42%;  /* niebieski */
--accent-foreground: 0 0% 100%;
```

Zmienię na:
```css
--accent: 0 0% 20%;  /* ciemnoszary */
--accent-foreground: 0 0% 100%;
```

### Pliki do przejrzenia pod kątem klas niebieskich:

Sprawdzę następujące pliki i zamienię `bg-accent/10`, `text-accent` na wersje szare:

1. **`src/pages/Referrals.tsx`** - ikony w sekcji nagród używają `text-accent` i `bg-accent/10`

Po zmianie zmiennej CSS `--accent` wszystkie te elementy automatycznie przyjmą nowy kolor.

---

## Podsumowanie plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/contexts/AuthContext.tsx` | Zmiana redirectUrl na /dashboard |
| `src/components/dashboard/ResultsUpload.tsx` | Dodanie podglądu i pobierania |
| `src/pages/Results.tsx` | Zmiana pozycji PhotoUpload z bottom na top |
| `src/components/layout/Sidebar.tsx` | Wyloguj pod Program polecający |
| `src/index.css` | Accent color na szary zamiast niebieskiego |

---

## Szczegóły techniczne

### Podgląd i pobieranie plików (Zmiana 2)

```typescript
// Funkcja do pobrania signed URL
const getSignedUrl = async (filePath: string): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from("results")
    .createSignedUrl(filePath, 60); // 60 sekund ważności
  
  if (error) return null;
  return data.signedUrl;
};

// Funkcja podglądu
const handlePreview = async (filePath: string) => {
  const url = await getSignedUrl(filePath);
  if (url) {
    window.open(url, "_blank");
  }
};

// Funkcja pobierania
const handleDownload = async (filePath: string, fileName: string) => {
  const url = await getSignedUrl(filePath);
  if (url) {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  }
};
```

### Nowy układ listy plików

```jsx
<li className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
  <div className="flex items-center gap-2">
    <FileCheck className="h-4 w-4 text-foreground" />
    <span className="text-sm text-foreground">{file.file_name}</span>
  </div>
  <div className="flex items-center gap-1">
    <button onClick={() => handlePreview(file.file_path)} title="Podgląd">
      <Eye className="h-4 w-4" />
    </button>
    <button onClick={() => handleDownload(file.file_path, file.file_name)} title="Pobierz">
      <Download className="h-4 w-4" />
    </button>
    <button onClick={() => handleDeleteFile(file.id, file.file_path)} title="Usuń">
      <X className="h-4 w-4" />
    </button>
  </div>
</li>
```

