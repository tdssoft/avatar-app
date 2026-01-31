
# Plan: Ekrany panelu administracyjnego

## Podsumowanie
Na podstawie dostarczonych screenshotów, stworzę kompletny panel administracyjny dla konta admin, zawierający: dashboard z listą pacjentów, profil pacjenta z pełną funkcjonalnością, kreator zaleceń (rekomendacji) oraz zarządzanie partnerami.

---

## Nowe ekrany do stworzenia

### 1. Admin Dashboard - Lista pacjentów
- Tabela z pacjentami (Imię i nazwisko, Subskrypcja, Diagnoza, Akcja, Ostatnia komunikacja)
- Przycisk "+" do dodawania nowego pacjenta
- Modal tworzenia konta pacjenta (Imię, Nazwisko, Email, Numer telefonu)
- Przycisk "Profil pacjenta" przy każdym wierszu

### 2. Profil pacjenta (szczegóły)
- Nagłowek: "Pacjent: [Imię Nazwisko]"
- Sekcja "Zalecenia z dnia" z selektorem daty i przyciskiem "+"
- Upload pliku zaleceń zdrowotnych
- Sekcja "Pakiet Pacjenta" (info o platnosci)
- Prawy sidebar z danymi pacjenta (awatar, imię, email, telefon)
- Sekcja "Ankieta pacjenta" z przyciskiem "Przeglądaj"
- Sekcja "Pliki z poprzednimi wynikami"
- Sekcja "Notatki" z textarea i przyciskiem "Dodaj notatkę"
- Sekcja "Komunikacja SMS" z przyciskiem "Wyślij SMS"
- Sekcja "Pytania przez formularz" z przyciskiem "Odpowiedz"

### 3. Kreator zaleceń (Recommendations Creator)
- Checkbox lista ukladow ciala (limfatyczny, szkieletowy, nerwowy, miesniowy, oddechowy, pokarmowy, krazeniowy, moczowy, hormonalny, odpornosciowy, rozrodczy, powlokowy)
- Obrazek "Avatar" po lewej stronie
- Sekcja "Kreator PDF" z textarea:
  - Podsumowanie diagnozy
  - Zalecenia dietetyczne
  - Kuracja Program suplementacji
  - Linki do sklepu
  - Terapie wspierajace
- Przyciski "Powrot" i "Zapisz"

### 4. Strona Partnerzy
- Tabela "Partnerzy polecajacy" (Imie i nazwisko, Linki do sklepow, Ilosc zarejestrowanych kont)
- Przycisk "Dodaj link +" przy kazdym partnerze
- Modal "Dodaj link do sklepow"

---

## Struktura bazy danych (nowe tabele)

### Tabela: `patients` (rozszerzenie profilu dla admina)
```
- id: uuid (PK)
- user_id: uuid (FK do profiles)
- admin_notes: text
- subscription_status: text (Brak, Aktywna, etc.)
- diagnosis_status: text
- last_communication_at: timestamp
- created_at: timestamp
- updated_at: timestamp
```

### Tabela: `recommendations` (zalecenia zdrowotne)
```
- id: uuid (PK)
- patient_id: uuid (FK)
- created_by_admin_id: uuid
- recommendation_date: date
- body_systems: text[] (tablica wybranych ukladow)
- diagnosis_summary: text
- dietary_recommendations: text
- supplementation_program: text
- shop_links: text
- supporting_therapies: text
- pdf_url: text (wygenerowany PDF)
- created_at: timestamp
```

### Tabela: `patient_notes` (notatki admina)
```
- id: uuid (PK)
- patient_id: uuid (FK)
- admin_id: uuid
- note_text: text
- created_at: timestamp
```

### Tabela: `patient_messages` (komunikacja SMS/pytania)
```
- id: uuid (PK)
- patient_id: uuid (FK)
- admin_id: uuid (null jesli od pacjenta)
- message_type: text (sms, question, answer)
- message_text: text
- sent_at: timestamp
```

### Tabela: `partner_shop_links` (linki partnerow)
```
- id: uuid (PK)
- partner_user_id: uuid (FK do profiles)
- shop_url: text
- added_by_admin_id: uuid
- created_at: timestamp
```

### Rozszerzenie tabeli `profiles`
```
- role: text (user, admin) - default 'user'
- first_name: text
- last_name: text
- phone: text
```

---

## Struktura plikow

### Nowe strony (src/pages/admin/)
```
src/pages/admin/
  AdminDashboard.tsx      - Lista pacjentow
  PatientProfile.tsx      - Szczegoly pacjenta
  RecommendationCreator.tsx - Kreator zalecen
  Partners.tsx            - Zarzadzanie partnerami
```

### Nowe komponenty (src/components/admin/)
```
src/components/admin/
  AdminSidebar.tsx        - Menu boczne dla admina
  AdminLayout.tsx         - Layout panelu admina
  PatientTable.tsx        - Tabela pacjentow
  CreatePatientDialog.tsx - Modal tworzenia pacjenta
  PatientNotesSection.tsx - Sekcja notatek
  PatientSmsSection.tsx   - Sekcja SMS
  PatientQuestionsSection.tsx - Sekcja pytan
  BodySystemsSelector.tsx - Checkboxy ukladow ciala
  RecommendationForm.tsx  - Formularz zalecen
  PartnerTable.tsx        - Tabela partnerow
  AddLinkDialog.tsx       - Modal dodawania linku
```

### Nowe funkcje backendowe (supabase/functions/)
```
supabase/functions/
  admin-create-patient/   - Tworzenie konta pacjenta (z wysylka email)
  admin-send-sms/         - Wysylka SMS
  admin-generate-pdf/     - Generowanie PDF zalecen
```

---

## Routing

Nowe trasy w `App.tsx`:
```
/admin                     -> AdminDashboard
/admin/patient/:id         -> PatientProfile
/admin/patient/:id/recommendation/new -> RecommendationCreator
/admin/partners            -> Partners
```

---

## Komponenty UI - mapowanie na istniejace

| Element na screenie | Istniejacy komponent |
|---------------------|---------------------|
| Tabela pacjentow | Table, TableRow, etc. |
| Modal tworzenia | Dialog, DialogContent |
| Przyciski | Button |
| Pola tekstowe | Input, Textarea |
| Checkboxy | Checkbox |
| Selektory | Select |
| Karty | Card, CardContent |

---

## Bezpieczenstwo

1. **RLS Policies**: Wszystkie nowe tabele beda mialy polityki ograniczajace dostep tylko do adminow
2. **Weryfikacja roli**: Kazda operacja admin-only bedzie sprawdzac `profiles.role = 'admin'`
3. **Edge Functions**: Operacje wrazliwe (tworzenie kont, SMS) wykonywane przez funkcje backendowe

---

## Kolejnosc implementacji

1. Migracja bazy danych (nowe tabele + rozszerzenie profiles o role)
2. AdminLayout i AdminSidebar
3. AdminDashboard z tabela pacjentow
4. CreatePatientDialog + edge function
5. PatientProfile ze wszystkimi sekcjami
6. RecommendationCreator
7. Partners page
8. Testowanie end-to-end

---

## Szacowany zakres

- ~15 nowych plikow komponentow/stron
- 5-6 nowych tabel w bazie
- 2-3 nowe edge functions
- Rozszerzenie routingu

