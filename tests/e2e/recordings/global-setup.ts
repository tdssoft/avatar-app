/**
 * Global setup — authenticate admin once, reuse storageState.
 * Works against both local dev and production (app.eavatar.diet).
 */
import { chromium, FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

const authFile = path.resolve("tests/artifacts/auth/admin.json");
const MAX_AGE_MS = 10 * 60 * 1000; // 10 min

export default async function globalSetup(config: FullConfig) {
  // Reuse cached auth if still fresh
  if (fs.existsSync(authFile)) {
    const age = Date.now() - fs.statSync(authFile).mtimeMs;
    if (age < MAX_AGE_MS) {
      console.log("[global-setup] Reusing cached auth (age:", Math.round(age / 1000), "s)");
      return;
    }
  }

  // Always authenticate via production URL (CORS blocks localhost → Supabase).
  // The JWT token works for both local dev and production since they share the same Supabase.
  const baseURL = "https://app.eavatar.diet";
  console.log("[global-setup] Logging in via:", baseURL);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

  // Debug: log page content if login form not found
  const emailField = page.locator('#email');
  if (!(await emailField.isVisible({ timeout: 5_000 }).catch(() => false))) {
    // Maybe already logged in or redirected
    const currentUrl = page.url();
    console.log("[global-setup] No email field found, current URL:", currentUrl);
    if (currentUrl.includes("/admin") || currentUrl.includes("/dashboard")) {
      console.log("[global-setup] Already logged in, saving state");
      fs.mkdirSync(path.dirname(authFile), { recursive: true });
      await ctx.storageState({ path: authFile });
      await browser.close();
      return;
    }
  }

  await emailField.fill("admin@eavatar.diet");
  await page.locator('#password').fill("Admin123!");

  // Try submit button — button text is "Log in"
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait for either a redirect or a URL change
  await page.waitForURL(
    (url) => !url.pathname.includes("/login"),
    { timeout: 30_000 },
  );
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  await ctx.storageState({ path: authFile });
  console.log("[global-setup] Auth saved to", authFile);

  await browser.close();
}
