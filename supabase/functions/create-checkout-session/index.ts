import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckoutRequest {
  packages: string[];
  origin: string;
}

const packagePrices: Record<string, { name: string; price: number }> = {
  optimal: { name: "OPTYMALNY PAKIET STARTOWY", price: 37000 }, // in grosze
  mini: { name: "MINI PAKIET STARTOWY", price: 22000 },
  update: { name: "AKTUALIZACJA PLANU ZDROWOTNEGO", price: 22000 },
  menu: { name: "JADŁOSPIS 7 dniowy", price: 17000 },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("create-checkout-session: received request");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("STRIPE_SECRET_KEY not configured");
      throw new Error("Stripe is not configured");
    }

    // Validate key format
    if (stripeKey.startsWith("pk_")) {
      console.error("Invalid key: publishable key (pk_*) provided instead of secret key (sk_*)");
      throw new Error("Invalid Stripe key: use secret key (sk_*), not publishable key (pk_*)");
    }

    if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
      console.error("Invalid key format. Expected sk_test_* or sk_live_*, got:", stripeKey.substring(0, 7) + "...");
      throw new Error("Invalid Stripe key format. Use secret key starting with sk_test_ or sk_live_");
    }

    const { packages, origin }: CheckoutRequest = await req.json();
    console.log("create-checkout-session: packages", packages, "origin", origin);

    if (!packages || packages.length === 0) {
      throw new Error("No packages selected");
    }

    if (!origin) {
      throw new Error("Origin is required");
    }

    // Build line items
    const lineItems = packages
      .filter((id) => packagePrices[id])
      .map((id) => ({
        price_data: {
          currency: "pln",
          product_data: {
            name: packagePrices[id].name,
          },
          unit_amount: packagePrices[id].price,
        },
        quantity: 1,
      }));

    if (lineItems.length === 0) {
      throw new Error("No valid packages selected");
    }

    // Create Stripe Checkout Session using fetch (no npm import needed)
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "success_url": `${origin}/payment/success`,
        "cancel_url": `${origin}/dashboard`,
        "invoice_creation[enabled]": "true",
        ...lineItems.reduce((acc, item, index) => ({
          ...acc,
          [`line_items[${index}][price_data][currency]`]: item.price_data.currency,
          [`line_items[${index}][price_data][product_data][name]`]: item.price_data.product_data.name,
          [`line_items[${index}][price_data][unit_amount]`]: item.price_data.unit_amount.toString(),
          [`line_items[${index}][quantity]`]: item.quantity.toString(),
        }), {}),
      }),
    });

    const session = await stripeResponse.json();
    console.log("create-checkout-session: session created", session.id);

    if (session.error) {
      console.error("Stripe error:", session.error);
      throw new Error(session.error.message || "Stripe error");
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("create-checkout-session error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
