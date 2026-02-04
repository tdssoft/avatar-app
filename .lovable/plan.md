
# Plan: Automatyczne przekierowanie admina na /admin po zalogowaniu

## Cel
Po zalogowaniu użytkownika z rolą administratora, system powinien automatycznie przekierować go na `/admin` zamiast `/dashboard`.

## Analiza obecnego stanu

**Przepływ logowania:**
1. Użytkownik wypełnia formularz w `LoginForm.tsx`
2. Wywołuje `login()` z `AuthContext`
3. Po sukcesie → `navigate("/dashboard")` (linia 41)

**Problem:**
- Logowanie zawsze przekierowuje na `/dashboard`
- Brak sprawdzenia roli admina przy logowaniu

**Istniejące mechanizmy:**
- Hook `useAdminRole` sprawdza rolę admina w tabeli `user_roles`
- `AuthContext.login()` zwraca `{ success: true }` po pomyślnym logowaniu

## Rozwiązanie

### Podejście: Sprawdzenie roli admina w `LoginForm.tsx`

Po pomyślnym logowaniu, przed przekierowaniem, sprawdzimy czy użytkownik ma rolę admina i odpowiednio przekierujemy.

## Zmiany w plikach

### 1. `src/components/auth/LoginForm.tsx`

**Dodać:**
- Import `supabase` do sprawdzenia roli
- Funkcję `checkIsAdmin(userId)` która odpytuje tabelę `user_roles`
- Logikę w `onSubmit` która po sukcesie:
  1. Pobiera `user.id` z kontekstu
  2. Sprawdza czy jest adminem
  3. Przekierowuje na `/admin` (admin) lub `/dashboard` (zwykły user)

```text
Przepływ po zmianach:

┌─────────────────┐
│  Użytkownik     │
│  klika "Zaloguj"│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ login() sukces  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Sprawdź rolę    │
│ w user_roles    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│ Admin │  │ Zwykły   │
│       │  │ user     │
└───┬───┘  └────┬─────┘
    │           │
    ▼           ▼
┌───────┐  ┌──────────┐
│/admin │  │/dashboard│
└───────┘  └──────────┘
```

## Szczegóły implementacji

```typescript
// W LoginForm.tsx - nowa funkcja pomocnicza
const checkIsAdmin = async (userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  
  return !!data;
};

// W onSubmit - zmieniona logika przekierowania
const onSubmit = async (data: LoginFormData) => {
  setIsLoading(true);
  try {
    const result = await login(data.email, data.password);
    if (result.success) {
      // Pobierz aktualnego użytkownika i sprawdź rolę
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isAdmin = await checkIsAdmin(user.id);
        navigate(isAdmin ? "/admin" : "/dashboard");
      } else {
        navigate("/dashboard");
      }
    } else {
      // ... obsługa błędów (bez zmian)
    }
  } catch {
    // ... (bez zmian)
  } finally {
    setIsLoading(false);
  }
};
```

## Korzyści

1. **Szybka nawigacja** - admin od razu trafia do panelu administracyjnego
2. **Czytelny kod** - logika sprawdzenia roli w jednym miejscu
3. **Zgodność z istniejącym wzorcem** - używamy tej samej logiki co w `useAdminRole`

## Ryzyko

- Dodatkowe zapytanie do bazy przy logowaniu (minimalne opóźnienie ~50-100ms)
- Można zoptymalizować w przyszłości przez cache lub JWT claims

## Szacowany czas implementacji

~5 minut - jedna prosta zmiana w jednym pliku.
