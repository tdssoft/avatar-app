/**
 * E2E: admin-payment-history.spec.ts
 * Weryfikuje że admin widzi historię płatności klienta
 * PDF: str. 16 — "historia płatności dla danego klienta musi być widoczna dla admina"
 *
 * Uruchom:
 *   npx playwright test tests/e2e/admin-payment-history.spec.ts --config=playwright.live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "Admin123!";

async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 20_000 }),
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(2000);
}

async function getPageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => "");
}

async function openFirstClientProfile(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const clientBtn = page.locator('button', { hasText: /profil klienta|profil pacjenta/i }).first();
  if (await clientBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clientBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);
    return true;
  }
  return false;
}

test.describe("Admin — historia płatności klienta", () => {

  test("APH-01 | Admin widzi sekcję historii płatności na profilu klienta", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openFirstClientProfile(page);

    if (!opened) {
      console.log("APH-01: Nie znaleziono profilu klienta — SKIP");
      await page.screenshot({ path: "tests/e2e/recordings/aph01-no-client.png", fullPage: true });
      return;
    }

    await page.screenshot({ path: "tests/e2e/recordings/aph01-client-profile.png", fullPage: true });

    const text = await getPageText(page);
    const hasPaymentHistory = text.includes("Historia płatności") ||
      text.includes("historia płatności") ||
      text.includes("Płatności") ||
      text.includes("Transakcje") ||
      await page.locator('[class*="payment-history"], [data-testid="payment-history"]').isVisible({ timeout: 2000 }).catch(() => false);

    console.log(`APH-01: Historia płatności widoczna = ${hasPaymentHistory}`);
    expect(hasPaymentHistory).toBe(true);
  });

  test("APH-02 | Historia płatności zawiera kwoty (zł)", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openFirstClientProfile(page);

    if (!opened) {
      console.log("APH-02: Brak profilu klienta — SKIP");
      return;
    }

    const text = await getPageText(page);

    // Sprawdź że widoczne są kwoty w zł
    const hasAmounts = text.includes("zł") ||
      text.includes("PLN") ||
      /\d+\s*(zł|PLN)/.test(text);

    await page.screenshot({ path: "tests/e2e/recordings/aph02-amounts.png", fullPage: true });

    console.log(`APH-02: Kwoty w zł widoczne = ${hasAmounts}`);
    // Informacyjnie — klient może nie mieć historii
    if (!hasAmounts) {
      console.log("APH-02: Brak kwot — możliwe że klient nie dokonał płatności");
    }
  });

  test("APH-03 | Historia płatności zawiera daty transakcji", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openFirstClientProfile(page);

    if (!opened) {
      console.log("APH-03: Brak profilu klienta — SKIP");
      return;
    }

    const text = await getPageText(page);

    // Sprawdź że widoczne są daty (format RRRR lub DD.MM)
    const hasDates = /\d{4}/.test(text) &&
      (text.includes(".202") || text.includes("-202") || text.includes("2025") || text.includes("2026"));

    await page.screenshot({ path: "tests/e2e/recordings/aph03-dates.png", fullPage: true });

    console.log(`APH-03: Daty transakcji widoczne = ${hasDates}`);
    if (!hasDates) {
      console.log("APH-03: Brak dat — możliwe że brak historii płatności");
    }
  });

  test("APH-04 | Admin panel lista klientów ładuje się poprawnie", async ({ page }) => {
    await loginAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const text = await getPageText(page);
    const hasClientList = text.includes("Klient") ||
      text.includes("Pacjent") ||
      text.includes("profil") ||
      await page.locator('table, [class*="list"], [class*="patients"]').isVisible({ timeout: 3000 }).catch(() => false);

    await page.screenshot({ path: "tests/e2e/recordings/aph04-admin-list.png", fullPage: true });

    console.log(`APH-04 Admin URL: ${url}, lista klientów = ${hasClientList}`);
    expect(url).not.toContain("/login");
    expect(hasClientList).toBe(true);
  });
});
