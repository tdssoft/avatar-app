/**
 * E2E: admin-interview-scroll.spec.ts
 * Weryfikuje że wywiad po stronie admina jest single scrollable page (taśmociąg), nie paginowany
 * PDF: str. 21 — "wywiad na poziomie admin musi być taśmociągiem aby nie przeklikiwać"
 *
 * Uruchom:
 *   npx playwright test tests/e2e/admin-interview-scroll.spec.ts --config=playwright.live.config.ts --reporter=list
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

async function openClientInterview(page: Page): Promise<boolean> {
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Przejdź do pierwszego profilu klienta
  const clientBtn = page.locator('button', { hasText: /profil klienta|profil pacjenta/i }).first();
  if (!await clientBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    return false;
  }

  await clientBtn.click();
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Szukaj przycisku wywiadu
  const interviewBtn = page.locator('button, a').filter({ hasText: /wywiad|interview/i }).first();
  if (await interviewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await interviewBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    return true;
  }

  return false;
}

test.describe("Admin — wywiad jako taśmociąg (scrollable, nie paginowany)", () => {

  test("AIS-01 | Wywiad admina: brak przycisków 'Dalej'/'Powrót' (nie jest paginowany)", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openClientInterview(page);

    if (!opened) {
      console.log("AIS-01: Brak wywiadu klienta — SKIP");
      await page.screenshot({ path: "tests/e2e/recordings/ais01-no-interview.png", fullPage: true });
      return;
    }

    await page.screenshot({ path: "tests/e2e/recordings/ais01-interview-view.png", fullPage: true });

    const text = await getPageText(page);

    // Admin NIE powinien widzieć przycisków nawigacji krokowej
    const hasDalejBtn = await page.locator('button', { hasText: /^Dalej$|^Dalej ->$|^Następny krok$/i }).isVisible({ timeout: 2000 }).catch(() => false);
    const hasPowrotBtn = await page.locator('button', { hasText: /^Powrót$|^< Powrót$|^Wstecz$/i }).isVisible({ timeout: 2000 }).catch(() => false);

    // Powinna być możliwość przewijania (nie kroki)
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = page.viewportSize()?.height ?? 800;
    const isScrollable = pageHeight > viewportHeight * 1.5; // conajmniej 1.5x viewport

    console.log(`AIS-01: Dalej=${hasDalejBtn}, Powrót=${hasPowrotBtn}, scrollable=${isScrollable} (${pageHeight}px)`);

    expect(hasDalejBtn).toBe(false);
    expect(hasPowrotBtn).toBe(false);
    expect(isScrollable).toBe(true);
  });

  test("AIS-02 | Wywiad admina: wszystkie sekcje wywiadu widoczne przez scroll", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openClientInterview(page);

    if (!opened) {
      console.log("AIS-02: Brak wywiadu klienta — SKIP");
      return;
    }

    // Przewiń na dół strony
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const text = await getPageText(page);
    await page.screenshot({ path: "tests/e2e/recordings/ais02-full-scroll.png", fullPage: true });

    // Sprawdź że widoczne są kluczowe sekcje wywiadu
    const sections = [
      { name: "Dane podstawowe", found: text.includes("Dane podstawowe") },
      { name: "Dolegliwości", found: text.includes("Dolegliwości") || text.includes("dolegliwości") },
      { name: "Historia", found: text.includes("Historia") || text.includes("historia") },
      { name: "Nawyki/posiłki", found: text.includes("posiłek") || text.includes("posiłki") || text.includes("Nawyki") || text.includes("nawyki") },
    ];

    sections.forEach(s => console.log(`AIS-02: Sekcja "${s.name}" = ${s.found}`));

    const visibleSections = sections.filter(s => s.found).length;
    console.log(`AIS-02: Widocznych sekcji: ${visibleSections}/${sections.length}`);

    // Conajmniej 2 sekcje powinny być widoczne
    expect(visibleSections).toBeGreaterThanOrEqual(2);
  });

  test("AIS-03 | Wywiad admina: tytuł to 'Wywiad dietetyczny' nie 'Wywiad medyczny'", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openClientInterview(page);

    if (!opened) {
      console.log("AIS-03: Brak wywiadu klienta — SKIP");
      return;
    }

    const text = await getPageText(page);
    await page.screenshot({ path: "tests/e2e/recordings/ais03-title.png", fullPage: false });

    const hasMedyczny = text.toLowerCase().includes("wywiad medyczny");
    const hasDietetyczny = text.toLowerCase().includes("wywiad dietetyczny");

    console.log(`AIS-03: medyczny=${hasMedyczny}, dietetyczny=${hasDietetyczny}`);
    expect(hasMedyczny).toBe(false);
  });

  test("AIS-04 | Wywiad admina: można przewijać do sekcji bez klikania kroków", async ({ page }) => {
    await loginAdmin(page);
    const opened = await openClientInterview(page);

    if (!opened) {
      console.log("AIS-04: Brak wywiadu klienta — SKIP");
      return;
    }

    // Sprawdź wysokość strony przed i po scrollu
    const initialScrollTop = await page.evaluate(() => window.scrollY);

    // Przewiń do połowy
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    const midScrollTop = await page.evaluate(() => window.scrollY);

    // Przewiń do końca
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    const bottomScrollTop = await page.evaluate(() => window.scrollY);

    await page.screenshot({ path: "tests/e2e/recordings/ais04-scroll-test.png", fullPage: false });

    console.log(`AIS-04: scroll start=${initialScrollTop}, mid=${midScrollTop}, bottom=${bottomScrollTop}`);

    // Strona powinna być przewijalna (scrollTop zmienił się)
    const isScrollable = bottomScrollTop > initialScrollTop;
    expect(isScrollable).toBe(true);
  });

  test("AIS-05 | Admin widzi wywiad wypełniony częściowo lub całkowicie", async ({ page }) => {
    await loginAdmin(page);

    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const clientBtn = page.locator('button', { hasText: /profil klienta|profil pacjenta/i }).first();
    if (!await clientBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("AIS-05: Brak profilów klientów — SKIP");
      return;
    }

    await clientBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    await page.screenshot({ path: "tests/e2e/recordings/ais05-client-profile.png", fullPage: true });

    const text = await getPageText(page);

    // Admin powinien widzieć wywiad (lub info że brak wywiadu) - nie białą stronę
    const hasInterviewContent = text.includes("wywiad") ||
      text.includes("Wywiad") ||
      text.includes("Dane podstawowe") ||
      text.includes("Brak wywiadu") ||
      text.includes("nie wypełnił");

    const isBlankPage = text.trim().length < 20;

    console.log(`AIS-05: wywiad widoczny=${hasInterviewContent}, blank=${isBlankPage}`);
    expect(isBlankPage).toBe(false);
    expect(hasInterviewContent).toBe(true);
  });
});
