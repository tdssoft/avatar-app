/**
 * Globalne logowanie przed wszystkimi testami.
 * Zapisuje stan sesji admina do pliku JSON, żeby każdy test
 * startował już zalogowany — bez ryzyka rate-limit Supabase.
 */
import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ADMIN_EMAIL = 'admin@eavatar.diet';
const ADMIN_PASS  = 'Admin123!';

export default async function globalSetup(config: FullConfig) {
  const authDir = path.resolve('tests/artifacts/auth');
  fs.mkdirSync(authDir, { recursive: true });

  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5174';
  const stateFile = path.join(authDir, 'admin.json');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log(`\n[global-setup] Logowanie na ${baseURL}/login …`);

  await page.goto(`${baseURL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Wpisz email i hasło
  const emailInput = page.locator('input[type="email"], input[name="email"], input[id*="email"]').first();
  await emailInput.fill(ADMIN_EMAIL);
  await page.waitForTimeout(400);

  const passInput = page.locator('input[type="password"]').first();
  await passInput.fill(ADMIN_PASS);
  await page.waitForTimeout(600);

  await page.keyboard.press('Enter');

  // Czekaj na przekierowanie po logowaniu
  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 30000 }),
    page.waitForURL(/\/dashboard/, { timeout: 30000 }),
  ]).catch(() => {});

  await page.waitForTimeout(1500);

  const finalUrl = page.url();
  console.log(`[global-setup] Po logowaniu URL: ${finalUrl}`);

  if (!finalUrl.includes('/admin') && !finalUrl.includes('/dashboard')) {
    console.warn('[global-setup] UWAGA: logowanie mogło się nie powieść!');
  }

  // Zapisz stan sesji
  await context.storageState({ path: stateFile });
  console.log(`[global-setup] Sesja zapisana → ${stateFile}\n`);

  await browser.close();
}
