const DEFAULT_FROM_EMAIL = "AVATAR <alan.urban23@gmail.com>";
const DEFAULT_ADMIN_EMAIL = "alan.urban23@gmail.com";
const DEFAULT_APP_URL = "https://app.eavatar.diet";

export function getEmailFrom(): string {
  return Deno.env.get("RESEND_FROM_EMAIL")?.trim() || DEFAULT_FROM_EMAIL;
}

export function getEmailReplyTo(): string | undefined {
  const replyTo = Deno.env.get("RESEND_REPLY_TO")?.trim();
  return replyTo || undefined;
}

export function getAdminEmail(): string {
  return Deno.env.get("ADMIN_EMAIL")?.trim() || DEFAULT_ADMIN_EMAIL;
}

export function getAppUrl(): string {
  return Deno.env.get("APP_URL")?.trim() || DEFAULT_APP_URL;
}
