/**
 * GoTrue send_email hook — receives auth email requests from Supabase Auth
 * and forwards them via Brevo API (instead of SMTP).
 *
 * Called by GoTrue for: recovery, signup confirmation, invite, email_change, magic_link
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { sendBrevoEmail } from "../_shared/brevo-email.ts";
import { getEmailFrom } from "../_shared/email-config.ts";

const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.eavatar.diet";

// Verify HMAC-SHA256 webhook signature from GoTrue
// Secret format in env: "v1,whsec_<base64>" — actual key is base64-decoded after "whsec_"
async function verifySignature(body: string, signatureHeader: string | null): Promise<boolean> {
  if (!HOOK_SECRET || !signatureHeader) return false;
  try {
    // Extract raw base64 key from "v1,whsec_BASE64" format
    const rawB64 = HOOK_SECRET.replace(/^v1,whsec_/, "");
    const keyBytes = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    // Signature header format: "v1,BASE64_SIG"
    const sigB64 = signatureHeader.replace(/^v1,/, "");
    const sigBytes = Uint8Array.from(atob(sigB64), (c) => c.charCodeAt(0));
    const bodyBytes = new TextEncoder().encode(body);
    return await crypto.subtle.verify("HMAC", key, sigBytes, bodyBytes);
  } catch {
    return false;
  }
}

interface AuthEmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: string;
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildVerifyUrl(
  siteUrl: string,
  tokenHash: string,
  type: string,
  redirectTo?: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  const params = new URLSearchParams({ token: tokenHash, type });
  if (redirectTo) params.set("redirect_to", redirectTo);
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function buildEmailHtml(actionType: string, actionLink: string, firstName: string): string {
  const titles: Record<string, string> = {
    recovery: "Resetowanie hasła",
    signup: "Potwierdź adres e-mail",
    invite: "Zaproszenie do AVATAR",
    email_change_current: "Potwierdź zmianę e-maila",
    email_change_new: "Potwierdź nowy adres e-mail",
    magiclink: "Link do logowania",
    reauthentication: "Potwierdzenie tożsamości",
  };
  const buttonLabels: Record<string, string> = {
    recovery: "Ustaw nowe hasło →",
    signup: "Potwierdź konto →",
    invite: "Aktywuj konto →",
    email_change_current: "Potwierdź zmianę →",
    email_change_new: "Potwierdź nowy e-mail →",
    magiclink: "Zaloguj się →",
    reauthentication: "Potwierdź →",
  };
  const title = titles[actionType] ?? "Akcja wymagana";
  const buttonLabel = buttonLabels[actionType] ?? "Kontynuuj →";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;margin:0;padding:0;background-color:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);padding:40px;border-radius:16px 16px 0 0;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:600;">${title}</h1>
    </div>
    <div style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="color:#333333;font-size:16px;line-height:1.6;">
        Cześć${firstName ? ` <strong>${firstName}</strong>` : ""}!
      </p>
      <p style="color:#333333;font-size:16px;line-height:1.6;">
        Kliknij poniższy przycisk, aby kontynuować:
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${actionLink}" style="display:inline-block;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:8px;font-weight:600;font-size:16px;">
          ${buttonLabel}
        </a>
      </div>
      <p style="color:#999999;font-size:12px;line-height:1.6;text-align:center;">
        Link jest ważny przez 24 godziny. Jeśli nie prosiłeś/aś o tę akcję, zignoruj ten email.
      </p>
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#999999;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} AVATAR centrum zdrowia. Wszystkie prawa zastrzeżone.
      </p>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  // GoTrue only uses POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const bodyText = await req.text();

  // Verify signature (skip if no secret configured — dev mode)
  if (HOOK_SECRET) {
    const sig = req.headers.get("x-supabase-signature");
    const valid = await verifySignature(bodyText, sig);
    if (!valid) {
      console.error("[auth-email-hook] Invalid signature");
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  let payload: AuthEmailPayload;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { user, email_data } = payload;
  const actionType = email_data.email_action_type ?? "recovery";
  const siteUrl = email_data.site_url ?? APP_URL;
  const tokenHash = email_data.token_hash ?? "";
  const redirectTo = email_data.redirect_to ?? `${APP_URL}/dashboard`;

  const firstName = (user.user_metadata?.firstName as string) ??
    (user.user_metadata?.first_name as string) ?? "";

  // Build the action link
  const actionLink = buildVerifyUrl(siteUrl, tokenHash, actionType, redirectTo);

  const subjects: Record<string, string> = {
    recovery: "Resetowanie hasła – AVATAR",
    signup: "Potwierdź swój adres e-mail – AVATAR",
    invite: "Zaproszenie do AVATAR",
    email_change_current: "Potwierdź zmianę adresu e-mail – AVATAR",
    email_change_new: "Potwierdź nowy adres e-mail – AVATAR",
    magiclink: "Twój link do logowania – AVATAR",
    reauthentication: "Potwierdzenie tożsamości – AVATAR",
  };

  const subject = subjects[actionType] ?? "Akcja wymagana – AVATAR";
  const html = buildEmailHtml(actionType, actionLink, firstName);
  const fromEmail = getEmailFrom();
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");

  if (!brevoApiKey) {
    console.error("[auth-email-hook] BREVO_API_KEY not set");
    return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500 });
  }

  try {
    await sendBrevoEmail({
      apiKey: brevoApiKey,
      from: fromEmail,
      to: user.email,
      subject,
      html,
    });
    console.log(`[auth-email-hook] Sent ${actionType} email to ${user.email}`);
    return new Response(JSON.stringify({}), { status: 200 });
  } catch (err) {
    console.error(`[auth-email-hook] Failed to send ${actionType} email:`, err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }
});
