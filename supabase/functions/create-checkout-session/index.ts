import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CheckoutRequest {
  packages: string[];
  origin: string;
  payment_method?: "p24" | "blik" | "card";
}

type PackagePrice = {
  name: string;
  price: number;
  billing: "one_time" | "monthly";
};

const packagePrices: Record<string, PackagePrice> = {
  optimal: { name: "Pełny Program Startowy", price: 37000, billing: "one_time" }, // in grosze
  mini: { name: "Mini Program Startowy", price: 22000, billing: "one_time" },
  update: { name: "Kontynuacja Programu Zdrowotnego", price: 22000, billing: "one_time" },
  menu: { name: "Jadłospis 7-dniowy", price: 17000, billing: "one_time" },
  autopilot: { name: "Autopilot Zdrowia - program stałego wsparcia", price: 2700, billing: "monthly" },
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

    // Validate key format.
    // Stripe secret keys can be standard (`sk_*`) or restricted (`rk_*`).
    if (stripeKey.startsWith("pk_")) {
      console.error(
        "Invalid key: publishable key (pk_*) provided instead of secret key (sk_*/rk_*)",
      );
      throw new Error(
        "Invalid Stripe key: use secret key (sk_* or rk_*), not publishable key (pk_*)",
      );
    }

    const validPrefixes = ["sk_test_", "sk_live_", "rk_test_", "rk_live_"];
    if (!validPrefixes.some((p) => stripeKey.startsWith(p))) {
      console.error(
        "Invalid key format. Expected sk_test_*, sk_live_*, rk_test_* or rk_live_*, got:",
        stripeKey.substring(0, 7) + "...",
      );
      throw new Error(
        "Invalid Stripe key format. Use secret key starting with sk_test_*, sk_live_*, rk_test_* or rk_live_*",
      );
    }

    const { packages, origin, payment_method }: CheckoutRequest = await req.json();
    console.log("create-checkout-session: packages", packages, "origin", origin, "payment_method", payment_method);

    if (!packages || packages.length === 0) {
      throw new Error("No packages selected");
    }

    if (!origin) {
      throw new Error("Origin is required");
    }

    const selectedPackageConfigs = packages
      .map((id) => packagePrices[id])
      .filter((pkg): pkg is PackagePrice => Boolean(pkg));

    // Build line items
    const lineItems = selectedPackageConfigs.map((pkg) => ({
      price_data: {
        currency: "pln",
        product_data: {
          name: pkg.name,
        },
        unit_amount: pkg.price,
        ...(pkg.billing === "monthly"
          ? { recurring: { interval: "month" as const } }
          : {}),
      },
      quantity: 1,
    }));

    if (lineItems.length === 0) {
      throw new Error("No valid packages selected");
    }

    const hasRecurring = selectedPackageConfigs.some((pkg) => pkg.billing === "monthly");
    const mode = hasRecurring ? "subscription" : "payment";

    const checkoutPayload: Record<string, string> = {
      mode,
      success_url: `${origin}/payment/success`,
      cancel_url: `${origin}/dashboard`,
    };

    if (mode === "payment") {
      checkoutPayload["invoice_creation[enabled]"] = "true";
    }

    lineItems.forEach((item, index) => {
      checkoutPayload[`line_items[${index}][price_data][currency]`] = item.price_data.currency;
      checkoutPayload[`line_items[${index}][price_data][product_data][name]`] = item.price_data.product_data.name;
      checkoutPayload[`line_items[${index}][price_data][unit_amount]`] = item.price_data.unit_amount.toString();
      checkoutPayload[`line_items[${index}][quantity]`] = item.quantity.toString();

      if (item.price_data.recurring?.interval) {
        checkoutPayload[`line_items[${index}][price_data][recurring][interval]`] = item.price_data.recurring.interval;
      }
    });

    // Create Stripe Checkout Session using fetch (no npm import needed)
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(checkoutPayload),
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
