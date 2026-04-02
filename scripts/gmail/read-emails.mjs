/**
 * GMAIL READER - czyta emaile z konta klienta
 *
 * Użycie:
 *   node scripts/gmail/read-emails.mjs                    # ostatnie 10 emaili
 *   node scripts/gmail/read-emails.mjs --from noreply@    # filtruj po nadawcy
 *   node scripts/gmail/read-emails.mjs --subject "faktura" # filtruj po temacie
 *   node scripts/gmail/read-emails.mjs --unread            # tylko nieprzeczytane
 *   node scripts/gmail/read-emails.mjs --limit 5           # ilość wyników
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const TOKENS_PATH = join(ROOT, ".gmail-tokens.json");
const ENV_PATH = join(ROOT, ".env.gmail");

// Parsuj argumenty CLI
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, arg, i, arr) => {
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const val = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true;
      acc.push([key, val]);
    }
    return acc;
  }, [])
);

// Załaduj konfigurację
if (!existsSync(ENV_PATH)) {
  console.error("❌ Brak .env.gmail — najpierw uruchom: node scripts/gmail/setup-oauth.mjs");
  process.exit(1);
}
if (!existsSync(TOKENS_PATH)) {
  console.error("❌ Brak .gmail-tokens.json — najpierw uruchom: node scripts/gmail/setup-oauth.mjs");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(ENV_PATH, "utf-8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => line.split("=").map((s) => s.trim()))
);

let tokens = JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));

// Odśwież access token jeśli wygasł
async function refreshAccessToken() {
  console.log("🔄 Odświeżam access token...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);

  tokens.access_token = data.access_token;
  tokens.expiry_date = Date.now() + data.expires_in * 1000;
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  return tokens.access_token;
}

async function getAccessToken() {
  if (Date.now() > tokens.expiry_date - 60000) {
    return await refreshAccessToken();
  }
  return tokens.access_token;
}

// Wywołanie Gmail API
async function gmailApi(endpoint, params = {}) {
  const token = await getAccessToken();
  const query = new URLSearchParams(params).toString();
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}${query ? "?" + query : ""}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  return res.json();
}

// Zdekoduj base64 URL-safe
function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

// Wyciągnij treść wiadomości
function extractBody(payload) {
  if (payload.body?.data) return decodeBase64(payload.body.data);

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return null;
}

// Pobierz szczegóły wiadomości
async function getMessage(id) {
  const msg = await gmailApi(`messages/${id}`, { format: "full" });

  const headers = Object.fromEntries(
    (msg.payload?.headers || []).map((h) => [h.name.toLowerCase(), h.value])
  );

  const body = extractBody(msg.payload || {});

  return {
    id: msg.id,
    date: headers.date || "",
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "(brak tematu)",
    snippet: msg.snippet || "",
    body: body ? body.slice(0, 500) + (body.length > 500 ? "..." : "") : "(brak treści)",
    unread: (msg.labelIds || []).includes("UNREAD"),
    labels: msg.labelIds || [],
  };
}

// Główna funkcja
async function main() {
  console.log(`\n📬 Gmail Reader — ${tokens.email}`);
  console.log("=".repeat(50));

  // Buduj query
  const queryParts = [];
  if (args.from) queryParts.push(`from:${args.from}`);
  if (args.subject) queryParts.push(`subject:${args.subject}`);
  if (args.unread) queryParts.push("is:unread");
  if (args.after) queryParts.push(`after:${args.after}`); // np. 2024/01/01
  if (args.q) queryParts.push(args.q);

  const query = queryParts.join(" ");
  const maxResults = parseInt(args.limit) || 10;

  console.log(`\n🔍 Szukam${query ? `: "${query}"` : " (wszystkie)"} | limit: ${maxResults}\n`);

  try {
    // Pobierz listę wiadomości
    const listRes = await gmailApi("messages", {
      ...(query ? { q: query } : {}),
      maxResults,
    });

    const messages = listRes.messages || [];

    if (messages.length === 0) {
      console.log("📭 Brak wiadomości spełniających kryteria.\n");
      return;
    }

    console.log(`📩 Znaleziono ${messages.length} wiadomości:\n`);

    // Pobierz szczegóły każdej wiadomości
    for (let i = 0; i < messages.length; i++) {
      const msg = await getMessage(messages[i].id);

      console.log(`─── ${i + 1}/${messages.length} ${msg.unread ? "🔵 NOWA" : "   "}`);
      console.log(`   📅 ${msg.date}`);
      console.log(`   👤 Od: ${msg.from}`);
      console.log(`   📌 Temat: ${msg.subject}`);
      console.log(`   💬 Podgląd: ${msg.snippet.slice(0, 100)}...`);
      console.log(`   🆔 ID: ${msg.id}`);
      console.log();
    }

    // Podsumowanie
    const unreadCount = (await gmailApi("messages", { q: "is:unread", maxResults: 1 })).resultSizeEstimate || 0;
    console.log(`=`.repeat(50));
    console.log(`📊 Nieprzeczytanych (szacunkowo): ${unreadCount}`);
    console.log(`✅ Gotowe\n`);
  } catch (err) {
    console.error(`\n❌ Błąd: ${err.message}\n`);
    if (err.message.includes("invalid_grant")) {
      console.log("💡 Token wygasł. Uruchom ponownie: node scripts/gmail/setup-oauth.mjs\n");
    }
    process.exit(1);
  }
}

main();
