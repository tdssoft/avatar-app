/**
 * GMAIL OAUTH2 SETUP - uruchom raz aby uzyskać refresh_token
 *
 * WYMAGANIA:
 * 1. Ustaw GMAIL_CLIENT_ID i GMAIL_CLIENT_SECRET w pliku .env.gmail
 *    (skopiuj .env.gmail.example)
 * 2. Uruchom: node scripts/gmail/setup-oauth.mjs
 * 3. Otwórz link w przeglądarce (lub wyślij klientowi)
 * 4. Po autoryzacji token zostanie zapisany do .gmail-tokens.json
 */

import http from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

// Załaduj konfigurację
const envPath = join(ROOT, ".env.gmail");
if (!existsSync(envPath)) {
  console.error("\n❌ Brak pliku .env.gmail\n");
  console.log("Utwórz plik .env.gmail w katalogu głównym projektu:");
  console.log("  GMAIL_CLIENT_ID=twoj_client_id");
  console.log("  GMAIL_CLIENT_SECRET=twoj_client_secret");
  console.log("  GMAIL_TARGET_EMAIL=avatar.mieszek@gmail.com\n");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => line.split("=").map((s) => s.trim()))
);

const CLIENT_ID = env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = env.GMAIL_CLIENT_SECRET;
const TARGET_EMAIL = env.GMAIL_TARGET_EMAIL || "avatar.mieszek@gmail.com";
const REDIRECT_URI = "http://localhost:8080/oauth/callback";
const TOKENS_PATH = join(ROOT, ".gmail-tokens.json");

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("\n❌ Brak GMAIL_CLIENT_ID lub GMAIL_CLIENT_SECRET w .env.gmail\n");
  process.exit(1);
}

// Generuj URL autoryzacji
const authUrl =
  `https://accounts.google.com/o/oauth2/auth` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
  `&response_type=code` +
  `&scope=${encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly")}` +
  `&access_type=offline` +
  `&prompt=consent` +
  `&login_hint=${encodeURIComponent(TARGET_EMAIL)}`;

console.log("\n🔐 GMAIL OAUTH2 SETUP");
console.log("=".repeat(50));
console.log(`\nKonto: ${TARGET_EMAIL}`);
console.log("\n📋 Wyślij ten link klientowi (lub otwórz sam):\n");
console.log(authUrl);
console.log("\n" + "=".repeat(50));
console.log("⏳ Czekam na autoryzację na http://localhost:8080 ...\n");

// Uruchom lokalny serwer do przechwycenia callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost:8080");

  if (url.pathname !== "/oauth/callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    console.error(`\n❌ Błąd autoryzacji: ${error}\n`);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>❌ Błąd: ${error}</h2><p>Zamknij tę kartę i spróbuj ponownie.</p>`);
    server.close();
    return;
  }

  if (!code) {
    res.writeHead(400);
    res.end("Brak kodu autoryzacji");
    return;
  }

  console.log("✅ Otrzymano kod autoryzacji, wymieniam na token...");

  try {
    // Wymień code na token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      throw new Error(tokens.error_description || tokens.error);
    }

    // Zapisz tokeny
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: Date.now() + tokens.expires_in * 1000,
      email: TARGET_EMAIL,
      created_at: new Date().toISOString(),
    };

    writeFileSync(TOKENS_PATH, JSON.stringify(tokenData, null, 2));

    console.log("\n🎉 SUKCES! Token zapisany do .gmail-tokens.json");
    console.log(`   Email: ${TARGET_EMAIL}`);
    console.log(`   Refresh token: ${tokens.refresh_token ? "✅ otrzymany" : "❌ brak!"}`);
    console.log("\n➡️  Możesz teraz uruchomić: node scripts/gmail/read-emails.mjs\n");

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Gmail Access - eavatar</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f0fdf4">
          <h1 style="color:#16a34a">✅ Autoryzacja zakończona sukcesem!</h1>
          <p>Dostęp do Gmaila <strong>${TARGET_EMAIL}</strong> został przyznany.</p>
          <p style="color:#666">Możesz zamknąć tę kartę.</p>
        </body>
      </html>
    `);

    server.close();
  } catch (err) {
    console.error("\n❌ Błąd wymiany tokenu:", err.message);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<h2>❌ Błąd: ${err.message}</h2>`);
    server.close();
  }
});

server.listen(8080, async () => {
  // Spróbuj automatycznie otworzyć przeglądarkę (macOS/Linux)
  try {
    const { exec } = await import("child_process");
    exec(`open "${authUrl}" 2>/dev/null || xdg-open "${authUrl}" 2>/dev/null`);
  } catch {}
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error("\n❌ Port 8080 jest zajęty. Zamknij inne procesy na tym porcie.\n");
  } else {
    console.error("\n❌ Błąd serwera:", err.message);
  }
  process.exit(1);
});
