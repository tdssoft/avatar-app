/**
 * E2E: payment-methods.spec.ts
 * Weryfikuje że płatności BLIK/P24/Karta NIE zwracają błędu "Edge Function returned a non-2xx status code"
 * PDF: str. 17-18 — wszystkie metody płatności dawały błąd edge function
 *
 * Uruchom:
 *   npx playwright test tests/e2e/payment-methods.spec.ts --config=playwright.live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "Admin123!";
const CLIENT_EMAIL = "alan@tdssoft.pl";
const CLIENT_PASSWORD = "Admin1234!";

async function loginClient(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill(CLIENT_EMAIL);
  await page.locator('input[type="password"]').first().fill(CLIENT_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await Promise.race([
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
    page.waitForURL(/\/payment/, { timeout: 20_000 }),
    page.waitForURL(/\/interview/, { timeout: 20_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(2000);
}

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

async function checkNoEdgeFunctionError(page: Page): Promise<boolean> {
  const text = await page.evaluate(() => document.body.innerText).catch(() => "");
  const html = await page.content().catch(() => "");
  const hasError =
    text.includes("Edge Function returned a non-2xx") ||
    html.includes("Edge Function returned a non-2xx") ||
    text.includes("Błąd płatności") ||
    html.includes("Błąd płatności");
  return !hasError;
}

test.describe("Płatności — brak błędu Edge Function", () => {

  test("PM-01 | BLIK: przejście do kroku Płatność nie powoduje błędu Edge Function", async ({ page }) => {
    await loginClient(page);
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    console.log(`PM-01 URL: ${url}`);

    // Jeśli przekierowany do /payment — wybierz pierwszy pakiet
    if (url.includes("/payment") || url.includes("/dashboard")) {
      // Szukaj przycisku "Kupuję" lub "Dalej"
      const buyBtn = page.locator('button', { hasText: /kupuję/i }).first();
      if (await buyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await buyBtn.click();
        await page.waitForTimeout(1500);
      }
    }

    // Szukaj metody płatności BLIK
    const blikOption = page.locator('text=BLIK').first();
    if (await blikOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await blikOption.click();
      await page.waitForTimeout(500);
    }

    // Kliknij "Przejdź do płatności"
    const payBtn = page.locator('button', { hasText: /przejdź do płatności/i }).first();
    if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "tests/e2e/recordings/pm01-blik.png", fullPage: true });

    const noError = await checkNoEdgeFunctionError(page);
    console.log(`PM-01 BLIK: brak błędu Edge Function = ${noError}`);
    expect(noError).toBe(true);
  });

  test("PM-02 | P24: przejście do kroku Płatność nie powoduje błędu Edge Function", async ({ page }) => {
    await loginClient(page);
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Wybierz pakiet jeśli widoczny
    const buyBtn = page.locator('button', { hasText: /kupuję/i }).first();
    if (await buyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(1500);
    }

    // Szukaj P24
    const p24Option = page.locator('text=P24').or(page.locator('text=Przelewy24')).first();
    if (await p24Option.isVisible({ timeout: 5000 }).catch(() => false)) {
      await p24Option.click();
      await page.waitForTimeout(500);
    }

    const payBtn = page.locator('button', { hasText: /przejdź do płatności/i }).first();
    if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "tests/e2e/recordings/pm02-p24.png", fullPage: true });

    const noError = await checkNoEdgeFunctionError(page);
    console.log(`PM-02 P24: brak błędu Edge Function = ${noError}`);
    expect(noError).toBe(true);
  });

  test("PM-03 | Karta: przejście do kroku Płatność nie powoduje błędu Edge Function", async ({ page }) => {
    await loginClient(page);
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const buyBtn = page.locator('button', { hasText: /kupuję/i }).first();
    if (await buyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(1500);
    }

    // Szukaj Karta / CARD
    const cardOption = page.locator('text=Karta').or(page.locator('[data-value="card"]')).first();
    if (await cardOption.isVisible({ timeout: 5000 }).catch(() => false)) {
      await cardOption.click();
      await page.waitForTimeout(500);
    }

    const payBtn = page.locator('button', { hasText: /przejdź do płatności/i }).first();
    if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await payBtn.click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: "tests/e2e/recordings/pm03-card.png", fullPage: true });

    const noError = await checkNoEdgeFunctionError(page);
    console.log(`PM-03 Karta: brak błędu Edge Function = ${noError}`);
    expect(noError).toBe(true);
  });

  test("PM-04 | Stripe redirect: po płatności URL zawiera stripe.com lub powrót do app", async ({ page }) => {
    await loginClient(page);
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const buyBtn = page.locator('button', { hasText: /kupuję/i }).first();
    if (await buyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(1500);
    }

    const payBtn = page.locator('button', { hasText: /przejdź do płatności/i }).first();
    if (await payBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Monitoruj nawigację przed kliknięciem
      const navigationPromise = page.waitForNavigation({ timeout: 10_000 }).catch(() => null);
      await payBtn.click();
      await navigationPromise;
      await page.waitForTimeout(2000);
    }

    const finalUrl = page.url();
    console.log(`PM-04 Stripe redirect URL: ${finalUrl}`);

    // Oczekujemy albo redirect na stripe, albo pozostanie na app bez błędu
    const isStripeRedirect = finalUrl.includes("stripe.com") || finalUrl.includes("checkout.stripe");
    const isAppPage = finalUrl.includes("eavatar.diet");
    const noError = await checkNoEdgeFunctionError(page);

    await page.screenshot({ path: "tests/e2e/recordings/pm04-redirect.png", fullPage: true });

    console.log(`PM-04: stripe=${isStripeRedirect}, app=${isAppPage}, noError=${noError}`);
    expect(isStripeRedirect || (isAppPage && noError)).toBe(true);
  });

  test("PM-05 | Strona płatności ładuje się bez błędów Edge Function (bez auth)", async ({ page }) => {
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const noError = await checkNoEdgeFunctionError(page);
    console.log(`PM-05 URL: ${url}, brak błędu: ${noError}`);

    await page.screenshot({ path: "tests/e2e/recordings/pm05-payment-page.png", fullPage: true });

    // Strona albo przekierowuje do logowania, albo ładuje się bez błędu
    const redirectedToLogin = url.includes("/login");
    expect(redirectedToLogin || noError).toBe(true);
  });
});
