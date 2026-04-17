const DEFAULT_FROM_EMAIL = "AVATAR <noreply@eavatar.diet>";
const DEFAULT_ADMIN_EMAILS = ["avatar.mieszek@gmail.com", "admin@eavatar.diet"];
const DEFAULT_APP_URL = "https://app.eavatar.diet";

export function getEmailFrom(): string {
  return Deno.env.get("FROM_EMAIL")?.trim() || DEFAULT_FROM_EMAIL;
}

export function getEmailReplyTo(): string | undefined {
  const replyTo = Deno.env.get("REPLY_TO_EMAIL")?.trim();
  return replyTo || undefined;
}

export function getAdminEmail(): string {
  return Deno.env.get("ADMIN_EMAIL")?.trim() || DEFAULT_ADMIN_EMAILS[0];
}

// Returns all admin emails (comma-separated env var or defaults)
export function getAdminEmails(): string[] {
  const env = Deno.env.get("ADMIN_EMAILS")?.trim();
  if (env) return env.split(",").map((e) => e.trim()).filter(Boolean);
  return DEFAULT_ADMIN_EMAILS;
}

export function getAppUrl(): string {
  return Deno.env.get("APP_URL")?.trim() || DEFAULT_APP_URL;
}
