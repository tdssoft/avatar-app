/**
 * Wysyła brakujące faktury Stripe do admina przez Brevo
 *
 * Użycie:
 *   node scripts/resend-invoices.mjs              # faktury z ostatnich 7 dni
 *   node scripts/resend-invoices.mjs --days 30    # faktury z ostatnich 30 dni
 *   node scripts/resend-invoices.mjs --id in_xxx  # konkretna faktura
 */

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
const ADMIN_EMAIL = "avatar.mieszek@gmail.com";
const FROM_EMAIL = "AVATAR SP. Z O. O. <invoices@eavatar.diet>";

// --- Parsuj argumenty ---
const args = process.argv.slice(2);
const specificId = args.includes("--id") ? args[args.indexOf("--id") + 1] : null;
const days = args.includes("--days") ? parseInt(args[args.indexOf("--days") + 1]) : 7;

async function stripe(path, params = {}) {
  const url = new URL(`https://api.stripe.com/v1/${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${STRIPE_KEY}` },
  });
  if (!res.ok) throw new Error(`Stripe ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function sendViaBrevo(invoice, pdfBase64) {
  const amount = ((invoice.amount_paid || 0) / 100).toFixed(2);
  const currency = (invoice.currency || "pln").toUpperCase();
  const date = invoice.created
    ? new Date(invoice.created * 1000).toLocaleDateString("pl-PL", {
        year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="color:#2563eb">📄 Faktura ${invoice.number || invoice.id}</h2>
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb"><strong>Nr faktury:</strong></td>
            <td>${invoice.number || invoice.id}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb"><strong>Klient:</strong></td>
            <td>${invoice.customer_name || invoice.customer_email || "—"}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb"><strong>Email klienta:</strong></td>
            <td>${invoice.customer_email || "—"}</td></tr>
        <tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb"><strong>Kwota:</strong></td>
            <td><strong style="color:#16a34a">${amount} ${currency}</strong></td></tr>
        <tr><td style="padding:8px 0"><strong>Data:</strong></td>
            <td>${date}</td></tr>
      </table>
      <p style="margin-top:20px;color:#6b7280;font-size:12px">
        Wygenerowano przez skrypt resend-invoices — eavatar.diet
      </p>
    </div>`;

  const payload = {
    sender: { email: "noreply@eavatar.diet", name: "AVATAR SP. Z O. O." },
    to: [{ email: ADMIN_EMAIL }],
    subject: `📄 Faktura ${invoice.number || invoice.id} — ${amount} ${currency}`,
    htmlContent: html,
    attachment: [{
      content: pdfBase64,
      name: `faktura-${invoice.number || invoice.id}.pdf`,
    }],
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": BREVO_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
  return res.json();
}

async function processInvoice(invoice) {
  console.log(`\n📋 Faktura: ${invoice.number || invoice.id}`);
  console.log(`   Klient: ${invoice.customer_email || "—"}`);
  console.log(`   Kwota: ${((invoice.amount_paid || 0) / 100).toFixed(2)} ${(invoice.currency||"pln").toUpperCase()}`);
  console.log(`   Status: ${invoice.status}`);

  if (invoice.status !== "paid") {
    console.log("   ⏭️  Pomijam (nieopłacona)");
    return false;
  }

  // Pobierz PDF
  const pdfUrl = invoice.invoice_pdf;
  if (!pdfUrl) {
    console.log("   ❌ Brak URL do PDF");
    return false;
  }

  console.log("   📥 Pobieram PDF...");
  const pdfRes = await fetch(pdfUrl);
  if (!pdfRes.ok) throw new Error(`PDF fetch failed: ${pdfRes.status}`);
  const buf = await pdfRes.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const pdfBase64 = btoa(binary);
  console.log(`   ✅ PDF: ${(buf.byteLength / 1024).toFixed(0)} KB`);

  // Wyślij przez Brevo
  console.log(`   📧 Wysyłam do ${ADMIN_EMAIL}...`);
  const result = await sendViaBrevo(invoice, pdfBase64);
  console.log(`   🎉 Wysłano! ID: ${result.messageId || JSON.stringify(result)}`);
  return true;
}

async function main() {
  console.log("🚀 RESEND INVOICES — eavatar.diet");
  console.log("=".repeat(50));
  console.log(`📧 Admin: ${ADMIN_EMAIL}`);

  let invoices = [];

  if (specificId) {
    console.log(`\n🔍 Pobiera fakturę: ${specificId}`);
    const inv = await stripe(`invoices/${specificId}`);
    invoices = [inv];
  } else {
    const since = Math.floor(Date.now() / 1000) - days * 86400;
    console.log(`\n🔍 Faktury z ostatnich ${days} dni (od ${new Date(since * 1000).toLocaleDateString("pl-PL")})...`);
    const list = await stripe("invoices", {
      limit: 100,
      status: "paid",
      "created[gte]": since,
    });
    invoices = list.data || [];
    console.log(`   Znaleziono: ${invoices.length}`);
  }

  if (!invoices.length) {
    console.log("\n📭 Brak faktur do wysłania.");
    return;
  }

  let sent = 0;
  for (const inv of invoices) {
    try {
      const ok = await processInvoice(inv);
      if (ok) sent++;
    } catch (err) {
      console.error(`   ❌ Błąd dla ${inv.id}: ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Wysłano ${sent}/${invoices.length} faktur do ${ADMIN_EMAIL}`);
}

main().catch(err => {
  console.error("\n❌ Błąd krytyczny:", err.message);
  process.exit(1);
});
