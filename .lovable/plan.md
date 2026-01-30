

# Plan: Utworzenie strony płatności 1:1 z oryginałem

## Analiza screenshota

Na podstawie załączonego obrazu, strona płatności ma następujący układ:

```text
+----------------------------------------------------+-----------------------------+
| [Avatar Logo - centrum zdrowia]                    |                             |
|                                                    |                             |
| Diagnostyka i kuracja jednorazowa                  |                             |
|                                                    |                             |
| Wybierz jakie informacje diagnostyka powinna       |                             |
| zawierać. Od ilości informacji, zależy             |                             |
| finalna cena pakietu.                              |                             |
|                                                    |   [Avatar Logo - duże]      |
| [ ] OPTYMALNY PAKIET STARTOWY - 370,00 PLN         |                             |
|     (diagnoza + analiza + raport + zalecenia)      |   Przyszłość diagnostyki    |
|     - pełna analiza kondycji...                    |                             |
|     - Indywidualny plan terapii                    |   Zadbaj o swojego AVATARA  |
|     - wskazówki dietetyczne                        |   Zadbaj o swoje ciało      |
|                                                    |                             |
| [ ] MINI PAKIET STARTOWY - 220,00 PLN              |                             |
|     (analiza/mini-diagnostyka + raport + zalecenia)|                             |
|     - analiza kondycji organizmu...                |                             |
|     - Indywidualny plan terapii                    |                             |
|     - wskazówki dietetyczne                        |                             |
|                                                    |                             |
| [ ] AKTUALIZACJA PLANU ZDROWOTNEGO - 220,00 PLN    |                             |
|     (kontrola i korekta zaleceń...)                |                             |
|     - analiza kondycji organizmu, w tym diagnostyka|                             |
|     - kontynuacja planu terapii                    |                             |
|     - wskazówki dietetyczne                        |                             |
|                                                    |                             |
| [ ] JADŁOSPIS 7 dniowy - 170,00 PLN                |                             |
|     ...                                            |                             |
+----------------------------------------------------+-----------------------------+
| ← Powrót               Łączny koszt: X zł  [Dalej] | (stopka z sumą i nawigacją) |
+----------------------------------------------------+-----------------------------+
```

---

## Elementy do zaimplementowania

### 1. Nowa strona: `src/pages/Payment.tsx`

**Układ strony:**
- Dwukolumnowy layout (lewa kolumna z formularzem, prawa z panelem marketingowym)
- BEZ sidebara i headera dashboardu (to jest standalone checkout page)
- Białe tło z kartą w środku

**Lewa kolumna (formularz):**
- Logo Avatar (mniejsze, z napisem "centrum zdrowia")
- Tytuł: "Diagnostyka i kuracja jednorazowa" (h1, bold)
- Opis: szary tekst kursywą
- Lista pakietów z checkboxami (wykorzystam istniejący `PackageCard`)
- Separator na dole
- Stopka: "Powrót" (link) + "Łączny koszt: X zł" + "Dalej" (przycisk czarny)

**Prawa kolumna (panel marketingowy):**
- Szare tło
- Duże logo Avatar
- Tekst: "Przyszłość diagnostyki"
- Tekst: "Zadbaj o swojego AVATARA"
- Tekst: "Zadbaj o swoje ciało"

### 2. Dane pakietów

| ID | Nazwa | Cena | Podtytuł | Opis |
|----|-------|------|----------|------|
| optimal | OPTYMALNY PAKIET STARTOWY | 370,00 PLN | (diagnoza + analiza + raport + zalecenia) | pełna analiza kondycji organizmu on line (biorezonans), w tym raport zdrowotnych; Indywidualny plan terapii; wskazówki dietetyczne |
| mini | MINI PAKIET STARTOWY | 220,00 PLN | (analiza/mini-diagnostyka + raport + zalecenia) | analiza kondycji organizmu na podstawie wywiadu, załączonych badań lub mini-diagnostyki on line (niedobory, alergie, obciążenia); Indywidualny plan terapii; wskazówki dietetyczne |
| update | AKTUALIZACJA PLANU ZDROWOTNEGO | 220,00 PLN | (kontrola i korekta zaleceń na podstawie osiągniętych postępów) | analiza kondycji organizmu, w tym diagnostyka; kontynuacja planu terapii; wskazówki dietetyczne |
| menu | JADŁOSPIS 7 dniowy | 170,00 PLN | - | (szczegóły do uzupełnienia) |

### 3. Modyfikacja routingu: `src/App.tsx`

- Dodanie nowej trasy: `/payment`
- Import komponentu `Payment`

### 4. Modyfikacja Dashboard: `src/pages/Dashboard.tsx`

- Dodanie `onSelect` do `PlanCard` z nawigacją do `/payment`
- Użycie `useNavigate` z react-router-dom

---

## Szczegóły techniczne

### Struktura Payment.tsx:

```tsx
const Payment = () => {
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const navigate = useNavigate();

  const packages = [
    { id: "optimal", name: "OPTYMALNY PAKIET STARTOWY", price: 370, ... },
    { id: "mini", name: "MINI PAKIET STARTOWY", price: 220, ... },
    { id: "update", name: "AKTUALIZACJA PLANU ZDROWOTNEGO", price: 220, ... },
    { id: "menu", name: "JADŁOSPIS 7 dniowy", price: 170, ... },
  ];

  const totalCost = packages
    .filter(p => selectedPackages.includes(p.id))
    .reduce((sum, p) => sum + p.price, 0);

  const handleToggle = (id: string) => {
    setSelectedPackages(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column */}
      <div className="flex-1 p-8 lg:p-16">
        <img src={avatarLogo} alt="Avatar" className="h-16 mb-8" />
        <h1>Diagnostyka i kuracja jednorazowa</h1>
        <p>Wybierz jakie informacje...</p>
        
        {packages.map(pkg => (
          <PackageCard
            key={pkg.id}
            id={pkg.id}
            name={pkg.name}
            price={`${pkg.price},00 PLN`}
            subtitle={pkg.subtitle}
            description={pkg.description}
            isSelected={selectedPackages.includes(pkg.id)}
            onToggle={handleToggle}
          />
        ))}
        
        <Separator />
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)}>← Powrót</button>
          <span>Łączny koszt: {totalCost} zł</span>
          <Button>Dalej</Button>
        </div>
      </div>
      
      {/* Right column - marketing panel */}
      <div className="hidden lg:flex w-1/3 bg-muted flex-col items-center justify-center">
        <img src={avatarLogo} alt="Avatar" className="h-32 mb-8" />
        <h2>Przyszłość diagnostyki</h2>
        <p>Zadbaj o swojego AVATARA</p>
        <p>Zadbaj o swoje ciało</p>
      </div>
    </div>
  );
};
```

### Styl prawego panelu:
- Tło: jasnoszare (`bg-muted` lub `bg-gray-100`)
- Logo: większe niż w lewej kolumnie
- Tekst wycentrowany pionowo i poziomo
- Font: "Przyszłość diagnostyki" - bold, większy
- Tekst pomocniczy - mniejszy, szary

---

## Pliki do utworzenia/modyfikacji

1. **`src/pages/Payment.tsx`** (NOWY) - strona płatności
2. **`src/App.tsx`** (MODYFIKACJA) - dodanie trasy `/payment`
3. **`src/pages/Dashboard.tsx`** (MODYFIKACJA) - dodanie nawigacji do payment po kliknięciu "Kupuję"

---

## Przepływ użytkownika

1. Użytkownik na Dashboard klika "Kupuję" przy pakiecie
2. Przekierowanie do `/payment`
3. Strona wyświetla listę pakietów z checkboxami
4. Użytkownik zaznacza wybrane opcje - suma się aktualizuje
5. Kliknięcie "Dalej" - przejście do płatności (Stripe - do implementacji później)
6. Kliknięcie "Powrót" - powrót do Dashboard

