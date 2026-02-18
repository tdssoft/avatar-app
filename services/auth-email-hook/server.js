import http from "node:http";

import { Webhook } from "standardwebhooks";

const PORT = Number.parseInt(process.env.PORT || "3000", 10);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const RESEND_REPLY_TO = process.env.RESEND_REPLY_TO;

// This must match GOTRUE_HOOK_SEND_EMAIL_SECRETS (single secret is fine).
// GoTrue supports a secret format like: `v1,whsec_...` (and multiple separated by `|`).
const HOOK_SECRET = process.env.GOTRUE_SEND_EMAIL_HOOK_SECRET;

if (!RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
if (!RESEND_FROM_EMAIL) throw new Error("Missing RESEND_FROM_EMAIL");
if (!HOOK_SECRET) throw new Error("Missing GOTRUE_SEND_EMAIL_HOOK_SECRET");

function normalizeHookSecret(secret) {
  const first = String(secret).split("|")[0]?.trim();
  // Standard Webhooks format can prefix version: `v1,whsec_...`
  const maybeWhsec = first.includes(",") ? first.split(",").slice(1).join(",").trim() : first;
  return maybeWhsec;
}

const webhook = new Webhook(normalizeHookSecret(HOOK_SECRET));

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function safeHttpsUrl(url) {
  // GoTrue can end up producing http:// in SiteURL due to upstream proxies.
  // Railway public domains support https, so prefer it for links.
  if (typeof url !== "string") return "";
  if (url.startsWith("https://")) return url;
  if (url.startsWith("http://")) return "https://" + url.slice("http://".length);
  return url;
}

function buildVerifyLink(siteUrl, tokenHash, emailActionType, redirectTo) {
  const base = safeHttpsUrl(siteUrl).replace(/\/+$/, "");
  const params = new URLSearchParams();
  params.set("token", tokenHash);
  params.set("type", emailActionType);
  if (redirectTo) params.set("redirect_to", redirectTo);
  // We force /auth/v1/verify to align with Kong routing.
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function subjectFor(action) {
  switch (action) {
    case "signup":
      return "Potwierdz swoj adres email";
    case "recovery":
      return "Reset hasla";
    case "magiclink":
      return "Link do logowania";
    case "invite":
      return "Zaproszenie do aplikacji";
    case "email_change":
      return "Potwierdz zmiane adresu email";
    default:
      return "Wiadomosc z AVATAR";
  }
}

function htmlFor({ action, email, link, otp }) {
  const title = subjectFor(action);
  const otpBlock = otp
    ? `<p style="margin:16px 0 0;color:#1f2937;font-size:14px">Kod jednorazowy: <b>${otp}</b></p>`
    : "";
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial">
    <div style="max-width:560px;margin:0 auto;padding:24px">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        <h1 style="margin:0 0 8px;font-size:18px;line-height:1.2;color:#0f172a">${title}</h1>
        <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5">
          Konto: <b>${email}</b>
        </p>
        <a href="${link}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:600;font-size:14px">
          Kontynuuj
        </a>
        ${otpBlock}
        <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5">
          Jesli przycisk nie dziala, wklej link do przegladarki:<br/>
          <span style="word-break:break-all">${link}</span>
        </p>
      </div>
      <p style="margin:12px 0 0;color:#94a3b8;font-size:11px">
        Jesli to nie Ty inicjowales te akcje, zignoruj ta wiadomosc.
      </p>
    </div>
  </body>
</html>`;
}

async function sendViaResend({ to, subject, html }) {
  const body = {
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject,
    html,
  };
  if (RESEND_REPLY_TO) body.reply_to = [RESEND_REPLY_TO];

  const rsp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!rsp.ok) {
    const text = await rsp.text().catch(() => "");
    throw new Error(`Resend error ${rsp.status}: ${text}`);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method !== "POST") {
      return json(res, 405, { error: "method_not_allowed" });
    }

    const raw = await readRawBody(req);
    const payload = raw.toString("utf8");

    const headers = {
      "webhook-id": req.headers["webhook-id"],
      "webhook-timestamp": req.headers["webhook-timestamp"],
      "webhook-signature": req.headers["webhook-signature"],
    };

    // Throws on invalid signature.
    webhook.verify(payload, headers);

    const data = JSON.parse(payload);

    const emailData = data?.email_data || {};
    const to = data?.user?.email || data?.email;
    const action = emailData?.email_action_type || data?.email_action_type;
    // GoTrue payloads can vary across versions/configs - accept several aliases.
    const tokenHash =
      emailData?.token_hash ||
      emailData?.tokenHash ||
      emailData?.hashed_token ||
      emailData?.token;
    const siteUrl =
      emailData?.site_url ||
      emailData?.siteUrl ||
      process.env.GOTRUE_SITE_URL ||
      process.env.SITE_URL ||
      process.env.APP_URL ||
      "https://app.eavatar.diet";
    const redirectTo = emailData?.redirect_to || emailData?.redirectTo;
    const otp = emailData?.token;

    if (!to || !action || !tokenHash) {
      console.error("invalid auth hook payload");
      return json(res, 400, { error: "invalid_payload" });
    }

    const link = buildVerifyLink(siteUrl, tokenHash, action, redirectTo);
    const subject = subjectFor(action);
    const html = htmlFor({ action, email: to, link, otp });

    await sendViaResend({ to, subject, html });

    return json(res, 200, {});
  } catch (err) {
    console.error("hook error", err);
    // Keep response JSON for GoTrue hook requirements.
    return json(res, 400, { error: "hook_failed", message: String(err?.message || err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`auth-email-hook listening on :${PORT}`);
});
