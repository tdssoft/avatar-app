
# Plan: Automatyczne wysyłanie faktur Stripe do administratora

## Cel
Po każdej pomyślnej płatności:
1. Stripe automatycznie generuje fakturę dla klienta
2. Webhook pobiera PDF faktury ze Stripe
3. Kopia faktury (PDF) jest wysyłana na email administratora

---

## Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLOW PŁATNOŚCI Z FAKTURĄ                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. create-checkout-session → invoice_creation[enabled]=true            │
│  2. Klient płaci przez Stripe Checkout                                  │
│  3. Stripe generuje fakturę PDF (automatycznie)                         │
│  4. Stripe wysyła webhook → invoice.paid                                │
│  5. stripe-webhook pobiera invoice_pdf z API Stripe                     │
│  6. Email z załącznikiem PDF → Administrator                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Część 1: Modyfikacja create-checkout-session

### Plik: `supabase/functions/create-checkout-session/index.ts`

Dodanie parametru `invoice_creation[enabled]=true` do zapytania Stripe:

```typescript
body: new URLSearchParams({
  "mode": "payment",
  "success_url": `${origin}/payment/success`,
  "cancel_url": `${origin}/dashboard`,
  "invoice_creation[enabled]": "true",  // NOWE - włącza generowanie faktury
  // ... reszta line_items
}),
```

Dzięki temu Stripe automatycznie:
- Tworzy obiekt Invoice
- Generuje PDF faktury
- Wysyła email z fakturą do klienta (jeśli włączone w Dashboard)

---

## Część 2: Nowa Edge Function - stripe-webhook

### Plik: `supabase/functions/stripe-webhook/index.ts`

Funkcja obsługująca webhook `invoice.paid`:

| Element | Opis |
|---------|------|
| Zdarzenie | `invoice.paid` (lepsze niż checkout.session.completed - zawiera gotową fakturę) |
| Weryfikacja | Podpis Stripe (STRIPE_WEBHOOK_SECRET) |
| Pobieranie PDF | GET `/v1/invoices/{id}/pdf` |
| Wysyłka | Resend z załącznikiem PDF |

### Główna logika:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const handler = async (req: Request): Promise<Response> => {
  // 1. Weryfikacja podpisu Stripe
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  
  const body = await req.text();
  
  // Weryfikacja HMAC (uproszczona - lub użycie biblioteki stripe)
  // ...
  
  const event = JSON.parse(body);
  
  // 2. Obsługa invoice.paid
  if (event.type === "invoice.paid") {
    const invoice = event.data.object;
    
    // 3. Pobranie PDF faktury
    const pdfResponse = await fetch(
      `https://api.stripe.com/v1/invoices/${invoice.id}/pdf`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
    
    // 4. Wysłanie emaila z załącznikiem do admina
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    await resend.emails.send({
      from: "AVATAR <noreply@eavatar.diet>",
      to: ["alan.urban23@gmail.com"],
      subject: `Faktura ${invoice.number} - Nowa płatność AVATAR`,
      html: `
        <h1>Nowa płatność</h1>
        <p><strong>Numer faktury:</strong> ${invoice.number}</p>
        <p><strong>Kwota:</strong> ${(invoice.amount_paid / 100).toFixed(2)} PLN</p>
        <p><strong>Klient:</strong> ${invoice.customer_email}</p>
        <p>W załączniku znajduje się kopia faktury PDF.</p>
      `,
      attachments: [
        {
          filename: `faktura-${invoice.number}.pdf`,
          content: pdfBase64,
        },
      ],
    });
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};

serve(handler);
```

---

## Część 3: Konfiguracja

### Plik: `supabase/config.toml`

Dodanie nowej funkcji:

```toml
[functions.stripe-webhook]
verify_jwt = false
```

### Wymagany nowy sekret: STRIPE_WEBHOOK_SECRET

Po wdrożeniu funkcji należy:
1. Wejść w Stripe Dashboard → Developers → Webhooks
2. Dodać endpoint: `https://llrmskcwsfmubooswatz.supabase.co/functions/v1/stripe-webhook`
3. Wybrać zdarzenie: `invoice.paid`
4. Skopiować "Signing secret" → dodać jako STRIPE_WEBHOOK_SECRET

---

## Podsumowanie zmian

| Plik | Akcja |
|------|-------|
| `supabase/functions/create-checkout-session/index.ts` | Dodanie `invoice_creation[enabled]=true` |
| `supabase/functions/stripe-webhook/index.ts` | NOWY - obsługa webhook + wysyłka faktury PDF |
| `supabase/config.toml` | Dodanie konfiguracji stripe-webhook |

### Wymagane sekrety:

| Sekret | Status |
|--------|--------|
| `STRIPE_SECRET_KEY` | Już skonfigurowany |
| `RESEND_API_KEY` | Już skonfigurowany |
| `STRIPE_WEBHOOK_SECRET` | Do dodania po wdrożeniu |

---

## Rezultat końcowy

Po wdrożeniu:
1. Każda płatność automatycznie generuje fakturę w Stripe
2. Klient otrzymuje email z fakturą od Stripe (domyślne ustawienie)
3. Administrator otrzymuje kopię faktury PDF na alan.urban23@gmail.com
4. Email zawiera wszystkie szczegóły transakcji + załącznik PDF
