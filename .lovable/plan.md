
# Plan naprawy stylu i układu aplikacji do wersji 1:1 z Avatar Diet

## Analiza roznic

Po dokladnym porownaniu screenshotow widze nastepujace kluczowe roznice:

### 1. Dashboard - uklad strony glownej

**Oryginal (app.eavatar.diet):**
- Naglowek: "Witamy w Avatar!" (bez emoji, bez imienia)
- Header z nazwa uzytkownika "Alan Urban" i ikoną dzwonka po prawej stronie
- Dwukolumnowy uklad:
  - Lewa strona: Karta "Twoje zdjecie" z opcja wgrywania
  - Prawa strona: Sekcja "Wybierz odpowiedni plan aby rozpoczac diagnostyke:" z kartami pakietow:
    - "Diagnostyka i kuracja miesieczna" (od 90 zl/miesiac) - przycisk "Kupuje"
    - "Diagnostyka i kuracja jednorazowa" (od 150 zl) - przycisk "Kupuje"
- Sekcja "Zalecenia zdrowotne"
- Sekcja "Jesli posiadasz wyniki poprzednich badan, wgraj je tutaj:"

**Moja implementacja:**
- Naglowek: "Witaj, Alan!" z emoji
- Brak headera z uzytkownikiem
- Siatka 2x2 z kartami quick actions (zupelnie inny uklad)
- Sekcja "Wgraj pliki" na dole

### 2. Sidebar - menu boczne

**Oryginal:**
- Logo Avatar
- Menu: Dashboard, Wyniki badan, Moj profil, Pomoc, Pogram polecajacy, Wyloguj
- Ikony sa inne (np. Dashboard ma ikone z 4 kwadratamiw kracie)
- Brak sekcji "Zalogowany jako"

**Moja implementacja:**
- Logo Avatar
- Sekcja "Zalogowany jako: Alan Urban"
- Menu: Strona glowna, Wyniki, Profil, Program polecajacy, Pomoc
- Inne ikony i nazwy

### 3. Style ogolne

**Oryginal:**
- Karty pakietow sa prostsze - bialy prostokat z tekstem i przyciskiem "Kupuje" po prawej
- Czysty, minimalistyczny design
- Header z nazwa uzytkownika i bell icon na gorze

**Moja implementacja:**
- Karty z kolorowymi ikonami
- Zbyt duzo elementow graficznych

---

## Plan zmian

### Faza 1: Naprawa Sidebar

**Plik: `src/components/layout/Sidebar.tsx`**

Zmiany:
1. Usuniecie sekcji "Zalogowany jako"
2. Zmiana kolejnosci i nazw menu:
   - Dashboard (ikona: LayoutGrid)
   - Wyniki badan (ikona: CircleDot)
   - Moj profil (ikona: User)
   - Pomoc (ikona: HelpCircle)
   - Pogram polecajacy (ikona: Megaphone)
   - Wyloguj (ikona: LogOut)
3. Zmiana ikon na odpowiednie do oryginalow

### Faza 2: Naprawa DashboardLayout

**Plik: `src/components/layout/DashboardLayout.tsx`**

Zmiany:
1. Dodanie headera z nazwa uzytkownika i ikoną dzwonka po prawej stronie
2. Struktura: Logo | ... content ... | "Alan Urban" + bell icon

### Faza 3: Naprawa Dashboard

**Plik: `src/pages/Dashboard.tsx`**

Kompleksowa zmiana ukladu:

```text
+------------------------------------------+
| Witamy w Avatar!                          |
+------------------------------------------+
|                                           |
| +----------------+  +-------------------+ |
| | Twoje zdjecie  |  | Wybierz plan...   | |
| | [info icon]    |  |                   | |
| | Wgraj swoje    |  | Diagnostyka i     | |
| |   zdjecie      |  | kuracja miesieczna| |
| +----------------+  | od 90 zl/miesiac  | |
|                     | [Kupuje]          | |
|                     +-------------------+ |
|                     | Diagnostyka i     | |
|                     | kuracja jednor... | |
|                     | od 150 zl         | |
|                     | [Kupuje]          | |
|                     +-------------------+ |
+------------------------------------------+
| Zalecenia zdrowotne                       |
| Tutaj znajdziesz materialy...            |
+------------------------------------------+
| Jesli posiadasz wyniki poprzednich...    |
| [drag & drop area]                        |
+------------------------------------------+
```

Nowe komponenty:
1. Karta "Twoje zdjecie" - lewa kolumna, biala karta z ikona info i linkiem "Wgraj swoje zdjecie"
2. Sekcja wyboru pakietow - prawa kolumna z dwoma kartami pakietow
3. Karty pakietow - prosty design: tytul, opis, cena po prawej, przycisk "Kupuje"
4. Sekcja "Zalecenia zdrowotne" - tekst informacyjny
5. Sekcja upload - "Jesli posiadasz wyniki poprzednich badan, wgraj je tutaj:"

### Faza 4: Dodanie komponentu pakietu dla Dashboard

**Nowy plik: `src/components/dashboard/PlanCard.tsx`**

Prosty komponent karty pakietu:
- Tytul po lewej
- Opis pod tytulem
- Cena po prawej stronie
- Przycisk "Kupuje" po prawej

---

## Szczegoly techniczne

### Zmiany w ikonych Sidebar

| Obecna nazwa | Nowa nazwa | Obecna ikona | Nowa ikona |
|--------------|------------|--------------|------------|
| Strona glowna | Dashboard | Home | LayoutGrid |
| Wyniki | Wyniki badan | FileText | CircleDot |
| Profil | Moj profil | User | User |
| Program polecajacy | Pogram polecajacy | Users | Megaphone |
| Pomoc | Pomoc | HelpCircle | HelpCircle |

### Struktura Dashboard (nowa)

```
Dashboard.tsx
├── Header section
│   └── "Witamy w Avatar!"
├── Main content (2 columns)
│   ├── Left: Photo card
│   │   └── "Twoje zdjecie" + upload link
│   └── Right: Plans section
│       ├── Title: "Wybierz odpowiedni plan..."
│       ├── PlanCard: Miesieczna (90 zl)
│       └── PlanCard: Jednorazowa (150 zl)
├── Health recommendations section
│   └── "Zalecenia zdrowotne" + description
└── Upload section
    └── "Jesli posiadasz wyniki..." + drop zone
```

### Struktura DashboardLayout (nowa)

```
DashboardLayout.tsx
├── Sidebar (left)
└── Main area (right)
    ├── Header bar
    │   └── User name + avatar + bell icon (right aligned)
    └── Content area
        └── {children}
```

---

## Pliki do modyfikacji

1. **`src/components/layout/Sidebar.tsx`** - nowe menu, usuniecie "Zalogowany jako"
2. **`src/components/layout/DashboardLayout.tsx`** - dodanie headera z uzytkownikiem
3. **`src/pages/Dashboard.tsx`** - calkowita zmiana ukladu na zgodny z oryginalem
4. **`src/components/dashboard/PlanCard.tsx`** (nowy) - komponent karty pakietu

---

## Podsumowanie

Plan zakłada:
1. Naprawa Sidebar - menu identyczne z oryginalem
2. Dodanie headera z nazwa uzytkownika i dzwonkiem
3. Całkowita przebudowa Dashboard na uklad 1:1 z oryginalem
4. Zachowanie funkcjonalnosci Programu polecającego (jako dodatkowa funkcja)

Program polecający pozostanie jako dodatkowa funkcjonalnosc w menu, zgodnie z Twoim zyczeniem.
