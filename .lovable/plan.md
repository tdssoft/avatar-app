

# Plan: Interaktywny panel z overlayem układów ciała

## Podsumowanie
Zastąpię obecny system checkboxów interaktywnym panelem, gdzie użytkownik klika na przyciski układów ciała, a wybrane systemy są nakładane na bazową sylwetkę jako przezroczyste warstwy, tworząc kompozyt wizualny.

---

## Jak to będzie działać

1. **Bazowa sylwetka** - po lewej stronie wyświetla się szary obrys ludzkiego ciała (podstawa)
2. **Przyciski układów** - lista przycisków z nazwami układów ciała
3. **Nakładanie warstw** - po kliknięciu przycisku:
   - Przycisk zmienia kolor na aktywny (podświetlenie)
   - Odpowiadający obraz układu nakłada się na sylwetkę z przezroczystością
   - Można wybrać wiele układów - wszystkie nakładają się na siebie
4. **Efekt końcowy** - użytkownik widzi kompozyt wszystkich wybranych układów na jednej sylwetce

---

## Struktura komponentu

### Nowy komponent: `BodySystemsOverlay.tsx`
```
src/components/admin/BodySystemsOverlay.tsx
```

Komponent zawiera:
- Kontener z `position: relative` dla nakładania warstw
- Bazowy obraz sylwetki (szary obrys)
- Obrazy układów z `position: absolute` nakładane na bazę
- Lista przycisków do wyboru układów

---

## Dostępne obrazy układów

Na podstawie przesłanych plików:
| ID układu | Plik obrazu |
|-----------|-------------|
| limfatyczny | układ-limfatyczny.png |
| nerwowy | układ-nerwowy.png |
| miesniowy | układ-mięśniowy.png |
| oddechowy | układ-oddechowy.png |
| krazeniowy | układ-krążeniowy.png |
| moczowy | układ-moczowy.png |
| hormonalny | układ-hormonalny.png |
| odpornosciowy | układ-odpornościowy.png |

Brakujące układy (szkieletowy, pokarmowy, rozrodczy, powłokowy) będą wyświetlane jako przyciski, ale bez nakładki obrazu do momentu dostarczenia grafik.

---

## Zmiany w plikach

### 1. Dodanie obrazów do projektu
Skopiuję przesłane pliki do:
```
src/assets/body-systems/
  base-silhouette.png     <- bazowa sylwetka (z image-40.png lub image-41.png)
  limfatyczny.png
  nerwowy.png
  miesniowy.png
  oddechowy.png
  krazeniowy.png
  moczowy.png
  hormonalny.png
  odpornosciowy.png
```

### 2. Nowy komponent `BodySystemsOverlay.tsx`
```typescript
// Interfejs
interface BodySystemsOverlayProps {
  selectedSystems: string[];
  onToggle: (systemId: string) => void;
}

// Mapa układów do obrazów
const systemImages = {
  limfatyczny: limfatycznyImg,
  nerwowy: nerwowyImg,
  // ... etc
};

// Renderowanie
<div className="relative w-full aspect-[3/4]">
  {/* Bazowa sylwetka */}
  <img src={baseSilhouette} className="absolute inset-0 w-full h-full" />
  
  {/* Nakładki wybranych układów */}
  {selectedSystems.map(systemId => (
    systemImages[systemId] && (
      <img 
        key={systemId}
        src={systemImages[systemId]} 
        className="absolute inset-0 w-full h-full opacity-80 transition-opacity"
      />
    )
  ))}
</div>

{/* Przyciski układów */}
<div className="grid grid-cols-2 gap-2">
  {bodySystemsOptions.map(system => (
    <button
      onClick={() => onToggle(system.id)}
      className={cn(
        "p-3 rounded-lg border transition-all",
        selectedSystems.includes(system.id) 
          ? "bg-primary text-white border-primary" 
          : "bg-card hover:bg-accent"
      )}
    >
      {system.label}
    </button>
  ))}
</div>
```

### 3. Aktualizacja `RecommendationCreator.tsx`
- Usunięcie karty z checkboxami
- Import i użycie `BodySystemsOverlay`
- Zachowanie istniejącej logiki `selectedSystems` i `handleSystemToggle`

---

## Wizualizacja interfejsu

```
+----------------------------------+-----------------------------+
|  [Interaktywna sylwetka]         |   KREATOR PDF               |
|                                  |                             |
|   +------------------------+     |   Podsumowanie diagnozy     |
|   |   ████████████████     |     |   [textarea]                |
|   |   █ BAZOWA SYLWETKA █  |     |                             |
|   |   █  + nakładki     █  |     |   Zalecenia dietetyczne     |
|   |   █  wybranych      █  |     |   [textarea]                |
|   |   █  układów        █  |     |                             |
|   |   ████████████████     |     |   Program suplementacji     |
|   +------------------------+     |   [textarea]                |
|                                  |                             |
|   [Limfatyczny] [Szkieletowy]    |   Linki do sklepu           |
|   [Nerwowy]     [Mięśniowy]      |   [textarea]                |
|   [Oddechowy]   [Pokarmowy]      |                             |
|   [Krążeniowy]  [Moczowy]        |   Terapie wspierające       |
|   [Hormonalny]  [Odpornościowy]  |   [textarea]                |
|   [Rozrodczy]   [Powłokowy]      |                             |
|                                  |   [Powrót] [Zapisz]         |
+----------------------------------+-----------------------------+
```

---

## Efekty wizualne

1. **Animacje przy wyborze**:
   - Płynne pojawianie się nakładki (`transition-opacity`)
   - Podświetlenie aktywnego przycisku

2. **Przezroczystość warstw**:
   - Każdy układ ma 80% opacity
   - Nakładające się układy tworzą głębszy kolor

3. **Hover na przyciskach**:
   - Delikatne podświetlenie przy najechaniu
   - Kursor pointer

---

## Kolejność implementacji

1. Dodanie plików obrazów do `src/assets/body-systems/`
2. Utworzenie komponentu `BodySystemsOverlay.tsx`
3. Aktualizacja `RecommendationCreator.tsx` z nowym komponentem
4. Testowanie interakcji i wyglądu

