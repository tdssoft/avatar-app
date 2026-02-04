
# Plan: Zmiana kolorystyki UI na paletę marki Avatar

## Analiza palety z obrazu

Na podstawie załączonego zrzutu ekranu strony Avatar Centrum Zdrowia zidentyfikowałem następujące kolory marki:

| Element | Kolor HEX | Kolor HSL |
|---------|-----------|-----------|
| Główny turkus (tło) | #00B5D8 | 189 100% 42% |
| Zielony (akcent 1) | #A6D62B | 73 70% 50% |
| Teal (akcent 2) | #0097A7 | 186 100% 33% |
| Różowy (akcent 3) | #F06292 | 340 85% 66% |
| Biały (karty) | #FFFFFF | 0 0% 100% |
| Ciemny szary (tekst) | #333333 | 0 0% 20% |

## Zakres zmian

### 1. Aktualizacja pliku `src/index.css`

Zmiany w sekcji `:root` z CSS variables:

```css
:root {
  --background: 0 0% 100%;           /* biały - bez zmian */
  --foreground: 0 0% 20%;            /* ciemny szary dla tekstu */
  
  --primary: 189 100% 42%;           /* główny turkus Avatar */
  --primary-foreground: 0 0% 100%;   /* biały tekst na turkusie */
  
  --secondary: 189 30% 95%;          /* jasny turkusowy tint */
  --secondary-foreground: 189 100% 25%;
  
  --accent: 73 70% 50%;              /* limonkowy zielony */
  --accent-foreground: 0 0% 100%;    /* biały tekst */
  
  --muted: 189 20% 96%;              /* delikatny turkusowy szary */
  --muted-foreground: 0 0% 45%;
  
  --ring: 189 100% 42%;              /* turkus dla focus ring */
  
  /* Sidebar - delikatny turkusowy odcień */
  --sidebar-background: 189 25% 97%;
  --sidebar-primary: 189 100% 42%;
  --sidebar-accent: 0 0% 100%;
}
```

### 2. Opcjonalne dodanie kolorów akcent w `tailwind.config.ts`

Dodanie dodatkowych kolorów marki dla różnych akcji:

```typescript
colors: {
  // ... existing
  avatar: {
    cyan: "hsl(189, 100%, 42%)",
    lime: "hsl(73, 70%, 50%)",
    teal: "hsl(186, 100%, 33%)",
    pink: "hsl(340, 85%, 66%)",
  }
}
```

## Wpływ na komponenty

Po zmianie CSS variables automatycznie zaktualizują się:

| Komponent | Zmiana |
|-----------|--------|
| Przyciski (Button) | primary = turkus, hover = ciemniejszy turkus |
| Sidebar | tło z lekkim turkusowym tintem |
| Linki | kolor akcentu = zielony |
| Focus rings | turkusowe obramowanie |
| Karty | bez zmian (białe) |
| Tekst | ciemnoszary |

## Pliki do modyfikacji

1. **`src/index.css`** - główna zmiana kolorów CSS variables
2. **`tailwind.config.ts`** - opcjonalne dodanie kolorów `avatar.*`

## Uwagi

- Utrzymuję flat design zgodnie z memory projektu
- Kolory zdefiniowane w HSL zgodnie z wymogami systemu
- Zmiany są globalne - jeden plik aktualizuje całą aplikację
- Możliwość użycia `bg-avatar-lime`, `bg-avatar-pink` itp. dla specyficznych elementów
