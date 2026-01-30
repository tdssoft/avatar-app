

# Plan naprawy strony "Wyniki badań" do wersji 1:1

## Analiza różnic

### Oryginał (app.eavatar.diet):
1. **Nagłówek**: "Witamy w Avatar!" (identyczny jak na Dashboard)
2. **Sekcja "Zalecenia z dnia"**: etykieta + dropdown "Wybierz zalecenie"
3. **Karta "Brak plików wynikowych"**: prosta biała karta z tekstem
4. **Sekcja "Zadaj pytanie lub opisz dolegliwości"**:
   - Tytuł sekcji (bold)
   - Opis: "Jeśli masz wątpliwości, lub chcesz poznać szczegóły naszych usług zadaj nam pytanie a my odpowiemy mailowo."
   - Textarea z placeholder "Treść pytania"
   - Czarny przycisk "Wyślij"
5. **Sekcja "Zleć kolejną diagnostykę:"** (widoczna na dole)
6. **Panel boczny "Twoje zdjęcie"** (widoczny w prawym dolnym rogu)

### Moja implementacja (BŁĘDNA):
- Nagłówek: "Twoje wyniki" z podtytułem "Historia Twoich diagnoz i planów terapii"
- Tabela z historią diagnoz (Nazwa, Data, Status)
- Karty z wynikami diagnoz i wnioskami

**Problem**: Moja implementacja to zupełnie inny ekran - stworzyłem "historię diagnoz" zamiast "ekranu zaleceń/wyników"

---

## Plan zmian

### Plik: `src/pages/Results.tsx`

Kompletna przebudowa strony na układ 1:1 z oryginałem:

```text
+--------------------------------------------------+
| Witamy w Avatar!                                 |
+--------------------------------------------------+
|                                                  |
| Zalecenia z dnia  [Wybierz zalecenie ▼]          |
|                                                  |
| +----------------------------------------------+ |
| | Brak plików wynikowych                       | |
| +----------------------------------------------+ |
|                                                  |
| Zadaj pytanie lub opisz dolegliwości             |
|                                                  |
| Jeśli masz wątpliwości, lub chcesz poznać        |
| szczegóły naszych usług zadaj nam pytanie        |
| a my odpowiemy mailowo.                          |
|                                                  |
| +----------------------------------------------+ |
| | Treść pytania                                | |
| |                                              | |
| +----------------------------------------------+ |
|                                                  |
| [Wyślij]                                         |
|                                                  |
| Zleć kolejną diagnostykę:                        |
| ...                                              |
|                                                  |
+--------------------------------------------------+
|                            +-------------------+ |
|                            | Twoje zdjęcie     | |
|                            +-------------------+ |
+--------------------------------------------------+
```

### Elementy do implementacji:

1. **Nagłówek** - "Witamy w Avatar!" (h1, bold, bez podtytułu)

2. **Sekcja zalecenia**:
   - Label "Zalecenia z dnia"
   - Select/Dropdown z opcją "Wybierz zalecenie" jako placeholder
   - Użycie komponentu `Select` z shadcn/ui

3. **Karta wyników**:
   - Prosta biała karta (Card)
   - Tekst: "Brak plików wynikowych" (bold)

4. **Sekcja pytanie**:
   - Tytuł: "Zadaj pytanie lub opisz dolegliwości" (h2, bold)
   - Opis: szary tekst wyjaśniający
   - Textarea z placeholder "Treść pytania"
   - Przycisk "Wyślij" (czarny, variant="default")

5. **Sekcja diagnostyka**:
   - Tytuł: "Zleć kolejną diagnostykę:" (h2, bold)
   - Miejsce na dodatkową treść (karty pakietów lub placeholder)

6. **Panel boczny** (opcjonalnie w prawym dolnym rogu):
   - Karta "Twoje zdjęcie" - taka sama jak na Dashboard

---

## Szczegóły techniczne

### Struktura komponentu:

```tsx
const Results = () => {
  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Nagłówek */}
        <h1>Witamy w Avatar!</h1>
        
        {/* Sekcja zalecenia */}
        <div className="flex items-center gap-4">
          <Label>Zalecenia z dnia</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz zalecenie" />
            </SelectTrigger>
            <SelectContent>
              {/* opcje zaleceń */}
            </SelectContent>
          </Select>
        </div>
        
        {/* Karta wyników */}
        <Card>
          <CardContent>
            <p className="font-bold">Brak plików wynikowych</p>
          </CardContent>
        </Card>
        
        {/* Sekcja pytanie */}
        <div>
          <h2>Zadaj pytanie lub opisz dolegliwości</h2>
          <p>Jeśli masz wątpliwości...</p>
          <Textarea placeholder="Treść pytania" />
          <Button>Wyślij</Button>
        </div>
        
        {/* Sekcja diagnostyka */}
        <div>
          <h2>Zleć kolejną diagnostykę:</h2>
          {/* placeholder lub karty pakietów */}
        </div>
      </div>
      
      {/* Opcjonalnie: panel Twoje zdjęcie (fixed/absolute) */}
    </DashboardLayout>
  );
};
```

### Style i spacing:

- Nagłówek: `text-2xl md:text-3xl font-bold` bez margin-bottom na podtytuł
- Sekcja zalecenia: `flex items-center gap-4 mb-6`
- Select: szerokość około 200px, border-radius standardowy
- Karta wyników: biała, bez shadow, border standardowy
- Sekcja pytanie: margin-top około 32px
- Textarea: pełna szerokość, wysokość około 120px
- Przycisk: czarny (variant default), margin-top 16px

---

## Pliki do modyfikacji

1. **`src/pages/Results.tsx`** - kompletna przebudowa na układ 1:1

---

## Podsumowanie

Obecna implementacja była całkowicie błędna - stworzyłem "historię diagnoz" zamiast "ekranu zaleceń i pytań". Nowa implementacja będzie dokładnym odwzorowaniem oryginalnego ekranu z:
- Dropdown do wyboru zaleceń
- Kartą informującą o braku wyników
- Formularzem kontaktowym
- Sekcją zlecania diagnostyki

