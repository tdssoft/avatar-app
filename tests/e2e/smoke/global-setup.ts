import { chromium, FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";

const stateFile = path.resolve("tests/artifacts/auth/admin.json");

export default async function globalSetup(_config: FullConfig) {
  // Re-use saved state if fresh (< 10 min old)
  if (fs.existsSync(stateFile)) {
    const age = Date.now() - fs.statSync(stateFile).mtimeMs;
    if (age < 10 * 60 * 1000) {
      console.log("[global-setup] Reusing cached auth state");
      return;
    }
  }

  const baseURL = "http://localhost:5174";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("[global-setup] Logging in as admin…");
  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
  await emailInput.fill("admin@eavatar.diet");

  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill("Admin123!");

  await page.keyboard.press("Enter");

  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 30_000 }),
    page.waitForURL(/\/dashboard/, { timeout: 30_000 }),
  ]).catch(() => {});

  await page.waitForTimeout(1500);
  await context.storageState({ path: stateFile });
  await browser.close();
  console.log("[global-setup] Auth state saved →", stateFile);
}
