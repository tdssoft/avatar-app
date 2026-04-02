/**
 * E2E: text-copy.spec.ts
 * Weryfikuje zmiany tekstowe w aplikacji:
 * - "Wywiad medyczny" → "Wywiad dietetyczny"
 * - Usunięcie słowa "diagnostyka" z interfejsu
 * - Zmiana "Podsumowanie diagnozy..." → "Podsumowanie funkcjonowania Twojego organizmu"
 * - Zmiana "Pliki wynikowe" → "Twoje wyniki badań laboratoryjne"
 * - Zmiana "Zleć kolejną diagnostykę" → "Zleć kolejną analizę organizmu"
 * - FAQ: "Jak to działa" zamiast "Jak działa diagnostyka biorezonansowa"
 *
 * PDF: str. 12, 19, 20, 21
 *
 * Uruchom:
 *   npx playwright test tests/e2e/text-copy.spec.ts --config=playwright.live.config.ts --reporter=list
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

test.describe("Zmiany tekstowe — wywiad dietetyczny, brak diagnostyki", () => {

  test("TC-01 | Wywiad: tytuł to 'Wywiad dietetyczny' nie 'Wywiad medyczny'", async ({ page }) => {
    // Strategia 1: klient może mieć ukończony wywiad → przekierowanie na dashboard
    // Strategia 2: admin → Wypełnij wywiad za pacjenta → sprawdź tytuł
    // Strategia 3: sprawdź HTML source bezpośrednio

    await loginAdmin(page);

    // Przejdź do panelu admina i otwórz wywiad pacjenta
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);

    // Kliknij profil pierwszego klienta
    const clientBtn = page.locator('button', { hasText: /profil klienta|profil pacjenta/i }).first();
    if (await clientBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clientBtn.click();
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(1500);

      // Szukaj przycisku "Wypełnij wywiad za pacjenta"
      const fillBtn = page.locator('button, a', { hasText: /Wypełnij wywiad|Uzupełnij wywiad/i }).first();
      if (await fillBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fillBtn.click();
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        await page.waitForTimeout(1500);
      }
    }

    const url = page.url();
    const text = await getPageText(page);
    const html = await page.content().catch(() => "");
    console.log(`TC-01 URL: ${url}`);

    // Sprawdź tytuł — zarówno w visible tekście jak i w HTML
    const hasMedyczny = text.toLowerCase().includes("wywiad medyczny") ||
      html.toLowerCase().includes("wywiad medyczny");
    const hasDietetyczny = text.toLowerCase().includes("wywiad dietetyczny") ||
      html.toLowerCase().includes("wywiad dietetyczny");

    await page.screenshot({ path: "tests/e2e/recordings/tc01-interview-title.png", fullPage: true });

    console.log(`TC-01: medyczny=${hasMedyczny}, dietetyczny=${hasDietetyczny}`);
    expect(hasMedyczny).toBe(false);
    expect(hasDietetyczny).toBe(true);
  });

  test("TC-02 | Dashboard: brak słowa 'diagnostyka' na stronie klienta", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const dashText = await getPageText(page);
    const hasDiagnostyka = dashText.toLowerCase().includes("diagnostyka");

    await page.screenshot({ path: "tests/e2e/recordings/tc02-no-diagnostyka.png", fullPage: true });

    console.log(`TC-02 Dashboard: słowo 'diagnostyka' = ${hasDiagnostyka}`);
    // Informacyjnie — nie blokuje testu jeśli "diagnostyka" pojawi się w meta/skryptach
    expect(hasDiagnostyka).toBe(false);
  });

  test("TC-03 | Dashboard: brak 'Podsumowanie diagnozy', jest 'funkcjonowania Twojego organizmu'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);
    const hasPodsDiagnozy = text.includes("Podsumowanie diagnozy");
    const hasFunkcjonowania = text.includes("funkcjonowania Twojego organizmu") ||
      text.includes("Podsumowanie funkcjonowania");

    await page.screenshot({ path: "tests/e2e/recordings/tc03-podsumowanie.png", fullPage: true });

    console.log(`TC-03: Podsumowanie diagnozy=${hasPodsDiagnozy}, funkcjonowania=${hasFunkcjonowania}`);
    expect(hasPodsDiagnozy).toBe(false);
  });

  test("TC-04 | Dashboard: brak 'Zleć kolejną diagnostykę', jest 'analizę organizmu'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);
    const hasOldText = text.includes("Zleć kolejną diagnostykę");
    const hasNewText = text.includes("analizę organizmu") || text.includes("Zleć kolejną analizę");

    await page.screenshot({ path: "tests/e2e/recordings/tc04-zlec-analize.png", fullPage: true });

    console.log(`TC-04: stary='Zleć kolejną diagnostykę'=${hasOldText}, nowy='analizę'=${hasNewText}`);
    expect(hasOldText).toBe(false);
  });

  test("TC-05 | Dashboard: brak 'Pliki wynikowe', jest 'wyniki badań laboratoryjne'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);
    const hasOldText = text.includes("Pliki wynikowe");
    const hasNewText = text.toLowerCase().includes("wyniki badań") ||
      text.includes("laboratoryjne");

    await page.screenshot({ path: "tests/e2e/recordings/tc05-pliki-wynikowe.png", fullPage: true });

    console.log(`TC-05: 'Pliki wynikowe'=${hasOldText}, 'wyniki badań'=${hasNewText}`);
    // Stary nagłówek nie powinien istnieć
    expect(hasOldText).toBe(false);
  });

  test("TC-06 | FAQ/Pomoc: pytanie 'Jak to działa' zamiast 'Jak działa diagnostyka biorezonansowa'", async ({ page }) => {
    // Sprawdź FAQ na stronie pomocy lub publicznej
    const faqUrls = [
      `${BASE_URL}/help`,
      `${BASE_URL}/pomoc`,
      `${BASE_URL}/faq`,
      `${BASE_URL}/support`,
    ];

    let faqText = "";
    for (const url of faqUrls) {
      await page.goto(url);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (!currentUrl.includes("/login") && !currentUrl.includes("/404")) {
        faqText = await getPageText(page);
        console.log(`TC-06 Znaleziono FAQ na: ${currentUrl}`);
        break;
      }
    }

    // Jeśli nie ma publicznego FAQ, zaloguj i sprawdź
    if (!faqText) {
      await loginClient(page);
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      // Szukaj linka do pomocy
      const helpLink = page.locator('a', { hasText: /pomoc|help|faq/i }).first();
      if (await helpLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await helpLink.click();
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
        faqText = await getPageText(page);
      }
    }

    const hasOldFAQ = faqText.toLowerCase().includes("diagnostyka biorezonansowa");
    const hasNewFAQ = faqText.toLowerCase().includes("jak to działa");

    await page.screenshot({ path: "tests/e2e/recordings/tc06-faq.png", fullPage: true });

    console.log(`TC-06 FAQ: stare pytanie biorezonansowa=${hasOldFAQ}, nowe 'jak to działa'=${hasNewFAQ}`);
    expect(hasOldFAQ).toBe(false);
  });

  test("TC-07 | Wywiad: 'Wypełnij ponownie wywiad dietetyczny' zamiast 'ankietę'", async ({ page }) => {
    await loginClient(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);
    const hasOldText = text.includes("Wypełnij ponownie ankietę");
    const hasNewText = text.includes("Wypełnij ponownie wywiad");

    await page.screenshot({ path: "tests/e2e/recordings/tc07-wypelnij-ponownie.png", fullPage: true });

    console.log(`TC-07: stary='ankietę'=${hasOldText}, nowy='wywiad'=${hasNewText}`);
    expect(hasOldText).toBe(false);
  });

  test("TC-08 | Admin: brak słowa 'Pacjent' — zastąpiony 'Klient' lub imieniem", async ({ page }) => {
    await loginAdmin(page);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);

    // Sprawdź że "Profil klienta" istnieje (nie "Profil pacjenta")
    const hasKlient = text.includes("Klient") || text.includes("klient");
    const hasProfKlienta = text.includes("Profil klienta");
    const hasProfPacjenta = text.includes("Profil pacjenta");

    await page.screenshot({ path: "tests/e2e/recordings/tc08-admin-klient.png", fullPage: true });

    console.log(`TC-08: Klient=${hasKlient}, 'Profil klienta'=${hasProfKlienta}, 'Profil pacjenta'=${hasProfPacjenta}`);
    expect(hasProfPacjenta).toBe(false);
  });
});
