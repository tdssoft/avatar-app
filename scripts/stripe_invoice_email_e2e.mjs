#!/usr/bin/env node
/**
 * End-to-end test:
 * 1) Creates & pays a Stripe test-mode invoice (with a real PDF)
 * 2) Sends a signed `invoice.paid` webhook to our Supabase Edge Function (behind Kong)
 * 3) The function should email the admin via Resend with the PDF attachment
 *
 * Required env:
 * - STRIPE_SECRET_KEY       (sk_test_...)
 * - STRIPE_WEBHOOK_SECRET   (any string; must match the value configured in Railway "functions" service)
 *
 * Optional env:
 * - WEBHOOK_URL             (default: production endpoint)
 * - CUSTOMER_EMAIL          (default: e2e+timestamp@example.com)
 * - INVOICE_AMOUNT_CENTS    (default: 1000)
 * - INVOICE_CURRENCY        (default: pln)
 * - INVOICE_DESCRIPTION     (default: "E2E test invoice")
 */

import crypto from "node:crypto";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ??
  "https://kong-production-d36f.up.railway.app/functions/v1/stripe-webhook";

if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY");
  process.exit(2);
}
if (!STRIPE_WEBHOOK_SECRET) {
  console.error("Missing STRIPE_WEBHOOK_SECRET");
  process.exit(2);
}

const CUSTOMER_EMAIL =
  process.env.CUSTOMER_EMAIL ?? `e2e+${Date.now()}@example.com`;
const INVOICE_AMOUNT_CENTS = Number(process.env.INVOICE_AMOUNT_CENTS ?? 1000);
const INVOICE_CURRENCY = (process.env.INVOICE_CURRENCY ?? "pln").toLowerCase();
const INVOICE_DESCRIPTION =
  process.env.INVOICE_DESCRIPTION ?? "E2E test invoice";

async function stripeFetch(path, { method, params, query } = {}) {
  const url = new URL(`https://api.stripe.com${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
  }

  const headers = {
    Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const res = await fetch(url, {
    method: method ?? "POST",
    headers,
    body: params ? new URLSearchParams(params).toString() : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg = json?.error?.message ?? text ?? `HTTP ${res.status}`;
    throw new Error(`Stripe API error (${method ?? "POST"} ${path}): ${msg}`);
  }

  return json;
}

function signStripeWebhook(payloadJson) {
  const body = JSON.stringify(payloadJson);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${body}`;
  const sig = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest("hex");

  return {
    body,
    header: `t=${timestamp},v1=${sig}`,
  };
}

async function main() {
  // 1) Create a customer
  const customer = await stripeFetch("/v1/customers", {
    params: { email: CUSTOMER_EMAIL },
  });

  // 2) Create an invoice item and invoice
  await stripeFetch("/v1/invoiceitems", {
    params: {
      customer: customer.id,
      amount: String(INVOICE_AMOUNT_CENTS),
      currency: INVOICE_CURRENCY,
      description: INVOICE_DESCRIPTION,
    },
  });

  const invoice = await stripeFetch("/v1/invoices", {
    params: {
      customer: customer.id,
      // Avoid requiring a saved payment method by paying "out of band".
      collection_method: "send_invoice",
      days_until_due: "0",
      auto_advance: "true",
    },
  });

  const finalized = await stripeFetch(`/v1/invoices/${invoice.id}/finalize`);
  let paid;
  try {
    paid = await stripeFetch(`/v1/invoices/${invoice.id}/pay`, {
      params: { paid_out_of_band: "true" },
    });
  } catch (err) {
    // If the invoice was already paid (e.g. due to automatic flows), continue.
    if (String(err?.message ?? "").includes("already paid")) {
      paid = await stripeFetch(`/v1/invoices/${invoice.id}`, { method: "GET" });
    } else {
      throw err;
    }
  }

  // Re-fetch with expanded line items for nicer email content.
  // `invoice_pdf` can appear shortly after finalization/payment, so we poll a bit.
  let invoiceFull = null;
  const startedAt = Date.now();
  const timeoutMs = 30_000;
  while (true) {
    invoiceFull = await stripeFetch(`/v1/invoices/${invoice.id}`, {
      method: "GET",
      query: { "expand[]": "lines.data" },
    });

    if (invoiceFull?.invoice_pdf) break;
    if (Date.now() - startedAt > timeoutMs) break;
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("Stripe invoice paid:", {
    id: paid.id,
    number: invoiceFull.number,
    customer_email: invoiceFull.customer_email ?? CUSTOMER_EMAIL,
    invoice_pdf: invoiceFull.invoice_pdf,
  });

  // 4) Send signed webhook to our Edge Function
  const event = {
    id: `evt_e2e_${Date.now()}`,
    type: "invoice.paid",
    data: { object: invoiceFull },
  };

  const signed = signStripeWebhook(event);

  const webhookRes = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signed.header,
    },
    body: signed.body,
  });

  const webhookText = await webhookRes.text();
  console.log("Webhook response:", webhookRes.status, webhookText);

  if (!webhookRes.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
