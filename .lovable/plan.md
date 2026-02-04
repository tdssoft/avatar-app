
# Plan: Pełna funkcjonalność panelu Partnerzy z zarządzaniem i widocznością poleceń

## Zidentyfikowane problemy

### 1. Pusta lista partnerów - brak dostępu RLS
**Główny problem**: Tabela `referrals` ma politykę RLS, która pozwala użytkownikom widzieć tylko SWOJE polecenia:
```sql
Policy: "Users can view referrals they made"
Using: (auth.uid() = referrer_user_id)
```

Admin NIE MA polityki SELECT dla tabeli `referrals`, więc zapytanie w `Partners.tsx` (linia 52-54) zwraca pustą tablicę i lista partnerów wychodzi pusta.

### 2. Brak funkcji zarządzania partnerami
Obecnie strona Partners pozwala tylko:
- Wyświetlać partnerów (gdy RLS pozwoli)
- Dodawać linki do sklepów

**Brakuje**:
- Ręcznego dodawania partnerów
- Usuwania linków do sklepów
- Edycji danych partnera
- Widoku szczegółów partnera (lista poleconych klientów)

### 3. Brakujące imię/nazwisko partnera
Użytkownik `c2a69448-3c62-4e0c-8d2a-a0f1df823899` (który ma 2 polecenia) nie ma wypełnionego `first_name` i `last_name` w profilu - wyświetli się jako "Nieznany partner".

---

## Rozwiązanie

### Część 1: Naprawienie RLS dla tabeli `referrals`

Dodanie polityki pozwalającej adminom widzieć wszystkie polecenia:

```sql
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

### Część 2: Rozszerzenie funkcjonalności strony Partners

#### A. Wyświetlanie wszystkich użytkowników z kodem polecającym
Zmiana logiki filtrowania - pokazywać WSZYSTKICH użytkowników z `referral_code`, nie tylko tych z poleceniami.

#### B. Dodanie przycisków zarządzania:
- **Usuń link** - przy każdym linku do sklepu (ikona kosza)
- **Zobacz poleconych** - przycisk otwierający dialog z listą klientów poleconych przez tego partnera

#### C. Rozszerzenie tabeli o kolumny:
- Kod polecający (widoczny dla admina)
- Status partnera (aktywny/nieaktywny)

### Część 3: Widok poleconych klientów

Dialog pokazujący:
- Imię i nazwisko poleconego klienta
- Email
- Data rejestracji
- Status (pending/active)

---

## Zmiany w plikach

### 1. Migracja SQL
```sql
-- Dodanie polityki RLS dla adminów na tabelę referrals
CREATE POLICY "Admins can view all referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Dodanie polityki UPDATE dla adminów (do zmiany statusu)
CREATE POLICY "Admins can update referrals"
ON public.referrals
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
```

### 2. `src/pages/admin/Partners.tsx`

**Zmiany:**
- Usunięcie filtra `referralCounts[p.user_id] > 0` - pokazać wszystkich z kodem polecającym
- Dodanie kolumny "Kod polecający"
- Dodanie przycisku "Usuń" przy linkach do sklepów
- Dodanie przycisku "Zobacz poleconych" otwierającego nowy dialog
- Dodanie funkcji `handleDeleteLink(linkId)`
- Dodanie dialogu `ReferredClientsDialog` z listą poleconych klientów

**Nowa struktura tabeli:**
| Imię i nazwisko | Kod polecający | Linki do sklepów | Poleceni | Akcje |
|-----------------|----------------|------------------|----------|-------|
| Partner X       | ABC123         | Link1 🗑, Link2 🗑 | 5        | Dodaj link, Zobacz poleconych |

### 3. Nowy komponent: Dialog "Poleceni klienci"

Wyświetla listę osób poleconych przez danego partnera:
- Pobiera dane z `referrals` WHERE `referrer_user_id = partnerId`
- Pokazuje imię, email, datę rejestracji, status

---

## Przepływ po zmianach

```text
Administrator wchodzi na /admin/partners
         │
         ▼
┌─────────────────────────────────────┐
│  Zapytanie do profiles              │
│  WHERE referral_code IS NOT NULL    │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Zapytanie do referrals             │
│  (teraz działa - admin ma RLS)      │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Wyświetl WSZYSTKICH partnerów      │
│  z ich kodami i liczbą poleceń      │
└─────────────────┬───────────────────┘
                  │
      ┌───────────┼───────────┐
      ▼           ▼           ▼
┌──────────┐ ┌──────────┐ ┌────────────┐
│ Dodaj    │ │ Usuń     │ │ Zobacz     │
│ link     │ │ link     │ │ poleconych │
└──────────┘ └──────────┘ └────────────┘
```

---

## Szczegóły techniczne

### Usuwanie linków do sklepów
```typescript
const handleDeleteLink = async (linkId: string) => {
  const { error } = await supabase
    .from("partner_shop_links")
    .delete()
    .eq("id", linkId);
  
  if (error) {
    toast.error("Nie udało się usunąć linku");
    return;
  }
  
  toast.success("Link został usunięty");
  fetchPartners();
};
```

### Dialog z poleconymi klientami
```typescript
interface ReferredClient {
  id: string;
  referred_email: string;
  referred_name: string;
  status: "pending" | "active";
  created_at: string;
}

const fetchReferredClients = async (partnerId: string) => {
  const { data } = await supabase
    .from("referrals")
    .select("id, referred_email, referred_name, status, created_at")
    .eq("referrer_user_id", partnerId)
    .order("created_at", { ascending: false });
  
  return data || [];
};
```

---

## Korzyści

1. **Widoczność partnerów** - admin widzi wszystkich użytkowników z kodem polecającym
2. **Pełne zarządzanie** - dodawanie/usuwanie linków, podgląd poleconych
3. **Przejrzystość** - widoczne kody polecające i statystyki
4. **Spójność z widokiem pacjentów** - kolumna "Polecony przez" w tabeli pacjentów pokazuje dane partnera

---

## Szacowany czas implementacji

~15 minut:
- Migracja SQL: 2 min
- Modyfikacja Partners.tsx: 10 min
- Testowanie: 3 min
