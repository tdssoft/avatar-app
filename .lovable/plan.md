

# Plan: Strona Wyboru Pakietów Diagnostycznych Avatar

## Opis projektu
Stworzenie strony wyboru pakietów diagnostycznych dla "Avatar centrum zdrowia" - dokładna replika projektu ze zrzutu ekranu, z dynamicznym sumowaniem cen i przekierowaniem na płatność Stripe.

---

## Ekran główny - Wybór Pakietów

### Nagłówek
- Logo Avatar (przesłane przez użytkownika) wycentrowane na górze
- Tytuł: "Wybierz zestaw usług diagnostycznych"
- Podtytuł: "Oferta obejmuje dobór diety w oparciu o diagnostykę..."

### Lista pakietów z checkboxami
Każdy pakiet jako karta z:
- Checkbox do zaznaczenia
- Nazwa pakietu
- Opis pakietu  
- Cena

**Pakiety:**
1. **Jadłospis** - 249 zł
2. **Profilaktyka** - 349 zł
3. **Aktualizacja** - 149 zł
4. **Pakiet Startowy** - 549 zł

### Dynamiczne sumowanie cen
- Suma wyświetlana w stopce: "Do zapłaty: X zł"
- Automatyczna aktualizacja po zaznaczeniu/odznaczeniu checkboxa
- Wyświetlanie 0 zł gdy nic nie jest zaznaczone

### Przyciski nawigacji
- **Powrót** (szary) → przekierowanie do strony głównej
- **Dalej** (zielony) → przekierowanie do linku Stripe checkout

---

## Styl wizualny
- Ciemne tło gradientowe (czarny → granat)
- Zielone akcenty (#4CAF50 lub podobny)
- Karty pakietów z półprzezroczystym tłem
- Zaokrąglone rogi elementów
- Nowoczesna, czytelna typografia

---

## Funkcjonalność
- Responsywny design (desktop + mobile)
- Stan checkboxów zarządzany przez React state
- Dynamiczne obliczanie sumy zaznaczonych pakietów
- Animacje przy zaznaczaniu opcji

