
# Plan: Konfiguracja Resend API i testy E2E wszystkich powiadomień email

## Aktualny stan systemu

### Zaimplementowane (już działające):
| Funkcja | Edge Function | Status |
|---------|---------------|--------|
| Email powitalny dla nowego użytkownika | `post-signup` | ✅ Gotowe |
| Powiadomienie admina o nowej rejestracji | `post-signup` | ✅ Gotowe |
| Email z linkiem do pobrania zalecenia | `send-recommendation-email` | ✅ Gotowe |

### Do zaimplementowania (TODO w kodzie):
| Funkcja | Lokalizacja | Status |
|---------|-------------|--------|
| Email z hasłem dla ręcznie utworzonego konta | `admin-create-patient` (linia 167) | ❌ Tylko komentarz TODO |
| Powiadomienie admina o pytaniu pacjenta | `Results.tsx` (linia 99) | ❌ Brak edge function |
| Powiadomienie admina o nowym zgłoszeniu | `ContactFormDialog.tsx` (linia 55) | ❌ Brak edge function |

---

## Konfiguracja Resend

**Stan obecny:** 
- `RESEND_API_KEY` jest już skonfigurowany w sekretach projektu ✅
- Domena nadawcy: `noreply@eavatar.diet` (już używana w edge functions)
- Email admina: `alan.urban23@gmail.com`

---

## Plan implementacji

### Część 1: Dodanie wysyłki emaila z hasłem (admin-create-patient)

Rozszerzenie funkcji `admin-create-patient` o wysyłkę emaila z danymi logowania:

```typescript
// Dodać import Resend
import { Resend } from "https://esm.sh/resend@2.0.0";

// Po utworzeniu konta - wysłać email z hasłem
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

await resend.emails.send({
  from: "AVATAR <noreply@eavatar.diet>",
  to: [email],
  subject: "Twoje konto w AVATAR zostało utworzone",
  html: `
    <h1>Witaj ${firstName}!</h1>
    <p>Administrator utworzył dla Ciebie konto w systemie AVATAR.</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Hasło tymczasowe:</strong> ${tempPassword}</p>
    <p>Zalecamy zmianę hasła po pierwszym logowaniu.</p>
    <a href="https://avatar-app.lovable.app/login">Zaloguj się</a>
  `
});
```

### Część 2: Nowa edge function - powiadomienia o pytaniach

Utworzenie funkcji `send-question-notification` wywoływanej przy:
- Pytaniu z `Results.tsx` (patient_messages)
- Zgłoszeniu z `ContactFormDialog.tsx` (support_tickets)

**Struktura funkcji:**
```typescript
// supabase/functions/send-question-notification/index.ts
interface QuestionNotificationRequest {
  type: "patient_question" | "support_ticket";
  user_email: string;
  user_name: string;
  subject?: string;       // tylko dla support_tickets
  message: string;
  profile_name?: string;  // opcjonalny profil
}
```

**Email do admina:**
- Temat: `📩 Nowe pytanie od [Imię Nazwisko]` lub `📩 Nowe zgłoszenie: [Temat]`
- Treść: Dane użytkownika, treść pytania, link do panelu admina

### Część 3: Integracja w frontend

**Results.tsx** - po zapisie pytania:
```typescript
// Po sukcesie zapisu do patient_messages
await supabase.functions.invoke("send-question-notification", {
  body: {
    type: "patient_question",
    user_email: user.email,
    user_name: `${profile.first_name} ${profile.last_name}`,
    message: question.trim(),
  }
});
```

**ContactFormDialog.tsx** - po zapisie zgłoszenia:
```typescript
// Po sukcesie zapisu do support_tickets
await supabase.functions.invoke("send-question-notification", {
  body: {
    type: "support_ticket",
    user_email: user.email,
    user_name: profile?.full_name || user.email,
    subject: subject.trim(),
    message: message.trim(),
  }
});
```

---

## Plan testów E2E

### Test 1: Email powitalny + powiadomienie admina (post-signup)
```text
1. Otwórz /signup
2. Zarejestruj nowego użytkownika:
   - Imię: TestEmail
   - Nazwisko: User
   - Email: [prawdziwy email do testu]
3. Sprawdź skrzynkę użytkownika:
   ✓ Email powitalny "Witamy w AVATAR!"
4. Sprawdź skrzynkę admina (alan.urban23@gmail.com):
   ✓ Email "🎉 Nowa rejestracja: TestEmail User"
```

### Test 2: Email z danymi logowania (admin-create-patient)
```text
1. Zaloguj jako admin
2. Przejdź do /admin/partners
3. Kliknij "Dodaj partnera"
4. Utwórz partnera z prawdziwym emailem
5. Sprawdź skrzynkę partnera:
   ✓ Email z tymczasowym hasłem
```

### Test 3: Powiadomienie o pytaniu pacjenta (Results.tsx)
```text
1. Zaloguj jako pacjent
2. Przejdź do /dashboard/results
3. Wpisz pytanie i kliknij "Wyślij"
4. Sprawdź skrzynkę admina:
   ✓ Email "📩 Nowe pytanie od [Pacjent]"
```

### Test 4: Powiadomienie o zgłoszeniu support (ContactFormDialog)
```text
1. Zaloguj jako użytkownik
2. Otwórz formularz kontaktowy (Pomoc)
3. Wpisz temat i wiadomość, wyślij
4. Sprawdź skrzynkę admina:
   ✓ Email "📩 Nowe zgłoszenie: [Temat]"
```

### Test 5: Email z linkiem do zalecenia (send-recommendation-email)
```text
1. Zaloguj jako admin
2. Przejdź do /admin/recommendations
3. Stwórz zalecenie dla pacjenta
4. Wyślij email z zaleceniem
5. Sprawdź skrzynkę pacjenta:
   ✓ Email z linkiem do pobrania (7 dni ważności)
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `supabase/functions/admin-create-patient/index.ts` | Dodać wysyłkę emaila z hasłem |
| `supabase/functions/send-question-notification/index.ts` | **Nowa funkcja** |
| `supabase/config.toml` | Dodać konfigurację nowej funkcji |
| `src/pages/Results.tsx` | Wywołać edge function po zapisie pytania |
| `src/components/support/ContactFormDialog.tsx` | Wywołać edge function po zapisie zgłoszenia |

---

## Matryca przypadków email

| Scenariusz | Odbiorca | Temat | Edge Function |
|------------|----------|-------|---------------|
| Rejestracja użytkownika | Użytkownik | "Witamy w AVATAR!" | post-signup |
| Rejestracja użytkownika | Admin | "🎉 Nowa rejestracja" | post-signup |
| Utworzenie konta przez admina | Użytkownik | "Twoje konto zostało utworzone" | admin-create-patient |
| Pytanie pacjenta | Admin | "📩 Nowe pytanie" | send-question-notification |
| Zgłoszenie support | Admin | "📩 Nowe zgłoszenie" | send-question-notification |
| Gotowe zalecenie | Pacjent | "Nowe zalecenie" | send-recommendation-email |
