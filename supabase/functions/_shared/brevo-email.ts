export interface BrevoEmailOptions {
  apiKey: string;
  from: string; // "AVATAR <noreply@eavatar.diet>" or plain "noreply@eavatar.diet"
  to: string | string[];
  replyTo?: string;
  subject: string;
  html: string;
}

export async function sendBrevoEmail(opts: BrevoEmailOptions): Promise<void> {
  const fromEmail = opts.from.match(/<(.+)>/)?.[1] || opts.from;
  const fromName = opts.from.match(/^(.+?)\s*</)?.[1]?.trim() || "AVATAR";

  const payload: Record<string, unknown> = {
    sender: { name: fromName, email: fromEmail },
    to: (Array.isArray(opts.to) ? opts.to : [opts.to]).map((e) => ({ email: e })),
    subject: opts.subject,
    htmlContent: opts.html,
  };
  if (opts.replyTo) payload.replyTo = { email: opts.replyTo };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": opts.apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
}
