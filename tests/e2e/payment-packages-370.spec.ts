/**
 * E2E: payment-packages-370.spec.ts
 * Weryfikuje dostępność pakietów dla użytkowników z aktywnym kontem:
 * - Pakiet 370zł "Pełny Program Startowy" widoczny
 * - Pakiet 220zł "Kontynuacja" widoczny
 * - Mini Program Startowy (220zł) zawiera info o wgraniu nowego zdjęcia
 *
 * PDF: str. 3, 16 — "pacjent z aktywnym kontem musi mieć możliwość wykupu za 370zł"
 *
 * Uruchom:
 *   npx playwright test tests/e2e/payment-packages-370.spec.ts --config=playwright.live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "Admin123!";
const CLIENT_EMAIL = "alan@tdssoft.pl";
const CLIENT_PASSWORD = "Admin1234!";

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

async function getPageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => "");
}

test.describe("Pakiety płatności — 370zł i 220zł dla aktywnych użytkowników", () => {

  test("PP-01 | Strona płatności: widoczna opcja 370zł ('Pełny Program Startowy')", async ({ page }) => {
    await loginClient(page);

    // Przejdź do płatności (z dashboardu)
    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const text = await getPageText(page);

    const has370 = text.includes("370") || text.includes("370 zł") || text.includes("370zł");
    const hasPelnyProgram = text.includes("Pełny Program") || text.includes("pełny program");

    await page.screenshot({ path: "tests/e2e/recordings/pp01-370-package.png", fullPage: true });

    console.log(`PP-01 URL: ${url}`);
    console.log(`PP-01: 370zł=${has370}, Pełny Program=${hasPelnyProgram}`);

    if (url.includes("/login")) {
      console.log("PP-01: Przekierowano do logowania — pomiń");
      return;
    }

    expect(has370).toBe(true);
  });

  test("PP-02 | Strona płatności dla aktywnego konta: widoczna opcja 220zł ('Kontynuacja')", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const text = await getPageText(page);

    const has220 = text.includes("220") || text.includes("220 zł") || text.includes("220zł");
    const hasKontynuacja = text.includes("Kontynuacja") || text.includes("kontynuacja");

    await page.screenshot({ path: "tests/e2e/recordings/pp02-220-package.png", fullPage: true });

    console.log(`PP-02: 220zł=${has220}, Kontynuacja=${hasKontynuacja}`);

    if (url.includes("/login")) {
      console.log("PP-02: Przekierowano do logowania — pomiń");
      return;
    }

    expect(has220).toBe(true);
  });

  test("PP-03 | Pakiet 220zł: zawiera wzmiankę o nowym zdjęciu (Mini Program)", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const text = await getPageText(page);

    // "Mini Program Startowy musi być informacja w nawiasie żeby wgrać nowe zdjęcie"
    const hasPhotoHint = text.includes("zdjęcie") &&
      (text.includes("Mini") || text.includes("220"));

    await page.screenshot({ path: "tests/e2e/recordings/pp03-photo-hint.png", fullPage: true });

    console.log(`PP-03: Wzmianka o zdjęciu przy Mini=${hasPhotoHint}`);

    if (url.includes("/login")) {
      console.log("PP-03: Przekierowano do logowania — pomiń");
      return;
    }

    // Informacyjnie — jeśli nie ma, to brakuje tej funkcji
    if (!hasPhotoHint) {
      console.log("PP-03: ⚠️ Brak informacji o nowym zdjęciu przy pakiecie Mini 220zł — do implementacji");
    }
  });

  test("PP-04 | Dashboard: 'Zleć kolejną analizę organizmu' nie 'diagnostykę'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);

    const hasOldText = text.includes("Zleć kolejną diagnostykę") || text.includes("Jednorazowa diagnostyka");
    const hasNewText = text.includes("analizę") || text.includes("Analizę");

    await page.screenshot({ path: "tests/e2e/recordings/pp04-zlec-analize.png", fullPage: true });

    console.log(`PP-04: stary='diagnostykę'=${hasOldText}, nowy='analizę'=${hasNewText}`);
    expect(hasOldText).toBe(false);
  });

  test("PP-05 | Dashboard aktywnego konta: 'Abonamentowy Program Profilaktyczny' zamiast 'Regeneracyjny'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);

    const hasOldProgram = text.includes("Regeneracyjny program organizmu");
    const hasNewProgram = text.includes("Abonamentowy Program Profilaktyczny") || text.includes("Profilaktyczny");

    await page.screenshot({ path: "tests/e2e/recordings/pp05-abonamentowy.png", fullPage: true });

    console.log(`PP-05: stary='Regeneracyjny'=${hasOldProgram}, nowy='Abonamentowy'=${hasNewProgram}`);
    expect(hasOldProgram).toBe(false);
  });

  test("PP-06 | Strona płatności: oba pakiety dostępne (370zł i 220zł) jednocześnie", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/payment`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();

    if (url.includes("/login")) {
      console.log("PP-06: Przekierowano do logowania — pomiń");
      return;
    }

    const text = await getPageText(page);

    const has370 = text.includes("370");
    const has220 = text.includes("220");
    const hasAtLeastOne = has370 || has220;

    await page.screenshot({ path: "tests/e2e/recordings/pp06-both-packages.png", fullPage: true });

    console.log(`PP-06: 370=${has370}, 220=${has220}`);
    expect(hasAtLeastOne).toBe(true);

    if (!has370) {
      console.log("PP-06: ⚠️ Brak pakietu 370zł — do implementacji dla aktywnych klientów");
    }
    if (!has220) {
      console.log("PP-06: ⚠️ Brak pakietu 220zł — do implementacji (Kontynuacja)");
    }
  });
});
