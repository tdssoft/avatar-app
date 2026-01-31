

# Plan: Naprawa funkcjonalności wgrywania plików

## Zidentyfikowany problem

Wgrywanie plików i zdjęć nie działa z powodu **konfliktu między dwoma systemami autoryzacji**:

1. **Obecny system logowania** (LoginForm + AuthContext) - używa `localStorage` do przechowywania danych użytkownika (mockowy system)
2. **Komponenty wgrywania** (PhotoUpload + ResultsUpload) - używają `supabase.auth.getUser()` do weryfikacji użytkownika

**Rezultat**: Po zalogowaniu przez formularz, komponenty wgrywania nie widzą użytkownika, ponieważ sprawdzają Supabase Auth, który jest pusty. Dlatego nic się nie dzieje po wybraniu pliku.

---

## Rozwiązanie

Zintegruję system autoryzacji z Supabase Auth, aby wszystkie komponenty korzystały z tego samego źródła prawdy o zalogowanym użytkowniku.

---

## Zmiany do wprowadzenia

### 1. Aktualizacja AuthContext

Zmienię AuthContext aby używał Supabase Auth zamiast localStorage:
- `login()` - wywoła `supabase.auth.signInWithPassword()`
- `signup()` - wywoła `supabase.auth.signUp()`
- `logout()` - wywoła `supabase.auth.signOut()`
- Nasłuchiwanie na zmiany sesji przez `supabase.auth.onAuthStateChange()`

### 2. Aktualizacja LoginForm

- Usunięcie mockowego logowania
- Wykorzystanie Supabase Auth do prawdziwego logowania
- Obsługa błędów z Supabase (np. "Invalid login credentials")

### 3. Aktualizacja SignupWizard

- Usunięcie mockowej rejestracji
- Wykorzystanie Supabase Auth do rejestracji
- Automatyczne tworzenie profilu użytkownika po rejestracji

### 4. Włączenie auto-confirm dla emaili (opcjonalnie)

Domyślnie Supabase wymaga weryfikacji email. Jeśli chcesz testować bez weryfikacji, możemy to wyłączyć.

---

## Przepływ po naprawie

1. Użytkownik wypełnia formularz logowania
2. Aplikacja wywołuje `supabase.auth.signInWithPassword()`
3. Supabase zwraca sesję z tokenem
4. AuthContext aktualizuje stan użytkownika
5. Użytkownik przechodzi na Dashboard
6. PhotoUpload wywołuje `supabase.auth.getUser()` - **zwraca zalogowanego użytkownika**
7. Użytkownik może wgrywać pliki

---

## Pliki do modyfikacji

1. **`src/contexts/AuthContext.tsx`** - integracja z Supabase Auth
2. **`src/components/auth/LoginForm.tsx`** - dostosowanie do nowego AuthContext
3. **`src/components/auth/SignupWizard.tsx`** - dostosowanie do Supabase Auth

---

## Szczegóły techniczne

### Nowy AuthContext:

```typescript
// Nasłuchiwanie zmian sesji
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session?.user) {
        // Pobierz profil użytkownika z bazy
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        
        setUser({
          id: session.user.id,
          email: session.user.email,
          ...profile
        });
      } else {
        setUser(null);
      }
    }
  );
  
  return () => subscription.unsubscribe();
}, []);

// Login
const login = async (email: string, password: string) => {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return !error;
};
```

---

## Uwaga dotycząca testowania

Po wdrożeniu tej zmiany:
- Będziesz musiał **utworzyć nowe konto** przez formularz rejestracji (stare konta z localStorage nie będą działać)
- Lub możemy włączyć auto-confirm dla emaili, aby nie musieć weryfikować adresu email podczas testów

