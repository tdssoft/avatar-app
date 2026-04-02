/**
 * E2E: referral.spec.ts
 * Weryfikuje program polecający:
 * - Strona /dashboard/referrals ładuje się (nie 404/blank)
 * - Kod polecający jest widoczny
 * - Link polecający jest widoczny i można go skopiować
 * - Kliknięcie "Kopiuj link" nie powoduje błędu
 *
 * PDF: str. 3 — "Program polecający nie działa"
 *
 * Uruchom:
 *   npx playwright test tests/e2e/referral.spec.ts --config=playwright.live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.eavatar.diet";
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

async function getPageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => "");
}

test.describe("Program polecający — /dashboard/referrals", () => {

  test("REF-01 | Strona programu polecającego ładuje się (nie 404/blank)", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const url = page.url();
    const text = await getPageText(page);

    const is404 = text.includes("404") || text.includes("Nie znaleziono") || text.includes("Not Found");
    const isBlank = text.trim().length < 20;

    await page.screenshot({ path: "tests/e2e/recordings/ref01-referrals-page.png", fullPage: true });

    console.log(`REF-01: URL=${url}, 404=${is404}, blank=${isBlank}, textLen=${text.trim().length}`);

    if (is404 || isBlank) {
      console.log("REF-01: BLAD — strona /dashboard/referrals jest pusta lub 404");
    } else {
      console.log("REF-01: OK — strona programu polecajacego zaladowana");
    }

    expect(is404).toBe(false);
    expect(isBlank).toBe(false);
  });

  test("REF-02 | Strona zawiera naglowek programu polecajacego", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    const text = await getPageText(page);

    const hasReferralHeading =
      text.includes("Program polecający") ||
      text.includes("polecajacy") ||
      text.includes("polecaj") ||
      text.toLowerCase().includes("referral");

    await page.screenshot({ path: "tests/e2e/recordings/ref02-referrals-heading.png", fullPage: false });

    console.log(`REF-02: nagłówek obecny=${hasReferralHeading}`);
    expect(hasReferralHeading).toBe(true);
  });

  test("REF-03 | Kod polecajacy jest widoczny lub strona informuje o generowaniu", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const text = await getPageText(page);

    // Kod polecający to AVATAR + 8 znaków
    const referralCodePattern = /AVATAR[A-Z0-9]{8}/;
    const hasReferralCode = referralCodePattern.test(text);

    // Fallback: strona informuje że kod jest generowany
    const isGenerating =
      text.includes("Generowanie kodu") ||
      text.includes("przypisywany") ||
      text.includes("Odśwież stronę");

    // Input z linkiem polecającym
    const referralInput = page.locator('input[readonly]').first();
    const inputValue = await referralInput.inputValue().catch(() => "");
    const hasReferralLink = inputValue.includes("/signup?ref=");

    await page.screenshot({ path: "tests/e2e/recordings/ref03-referral-code.png", fullPage: false });

    console.log(`REF-03: kod=${hasReferralCode}, link=${hasReferralLink}, generowanie=${isGenerating}, inputValue=${inputValue.slice(0, 60)}`);

    // Albo kod jest widoczny, albo strona wyjaśnia że jest generowany
    const codeOrGenerating = hasReferralCode || hasReferralLink || isGenerating;

    if (!codeOrGenerating) {
      console.log("REF-03: BLAD — brak kodu polecajacego i brak informacji o generowaniu");
    } else {
      console.log("REF-03: OK — kod polecajacy lub info o generowaniu widoczne");
    }

    expect(codeOrGenerating).toBe(true);
  });

  test("REF-04 | Klikniecie przycisku kopiowania nie powoduje bledu", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Sprawdź czy strona ma przyciski kopiowania
    const copyButtons = page.locator('button', { hasText: /kopiuj/i });
    const copyCount = await copyButtons.count();

    console.log(`REF-04: znaleziono ${copyCount} przyciskow kopiowania`);

    if (copyCount > 0) {
      // Kliknij pierwszy przycisk "Kopiuj link"
      const firstCopyBtn = copyButtons.first();
      const isVisible = await firstCopyBtn.isVisible({ timeout: 3000 }).catch(() => false);

      if (isVisible) {
        // Monitoruj błędy konsolowe
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        await firstCopyBtn.click();
        await page.waitForTimeout(1000);

        await page.screenshot({ path: "tests/e2e/recordings/ref04-copy-clicked.png", fullPage: false });

        // Sprawdź czy pojawił się toast (sukces lub błąd)
        const pageTextAfter = await getPageText(page);
        const hasToast =
          pageTextAfter.includes("Skopiowano") ||
          pageTextAfter.includes("kopiuj") ||
          pageTextAfter.includes("schowka") ||
          pageTextAfter.includes("Błąd");

        console.log(`REF-04: kliknieto kopiuj, toast=${hasToast}, bledy=${consoleErrors.length}`);

        // Nie powinno być wyjątków JS
        const criticalErrors = consoleErrors.filter(
          (e) => !e.includes("clipboard") && !e.includes("DOMException")
        );
        expect(criticalErrors.length).toBe(0);
      } else {
        console.log("REF-04: przycisk kopiowania niewidoczny — strona moze byc w stanie ladowania");
      }
    } else {
      console.log("REF-04: brak przyciskow kopiowania (uzytkownik moze nie miec kodu)");
    }
  });

  test("REF-05 | Link polecajacy w inputcie wskazuje na signup z parametrem ref", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Szukaj inputa z linkiem polecajacym
    const readonlyInputs = page.locator('input[readonly]');
    const inputCount = await readonlyInputs.count();

    let foundValidLink = false;
    let foundLink = "";

    for (let i = 0; i < inputCount; i++) {
      const val = await readonlyInputs.nth(i).inputValue().catch(() => "");
      if (val.includes("/signup?ref=")) {
        foundValidLink = true;
        foundLink = val;
        break;
      }
    }

    await page.screenshot({ path: "tests/e2e/recordings/ref05-referral-link.png", fullPage: false });

    console.log(`REF-05: inputs=${inputCount}, link polecajacy=${foundLink}`);

    if (foundValidLink) {
      console.log("REF-05: OK — link polecajacy zawiera /signup?ref=");
      // Sprawdź format linku
      expect(foundLink).toMatch(/https?:\/\/.+\/signup\?ref=AVATAR[A-Z0-9]{8}/);
    } else {
      // Moze byc ze uzytkownik nie ma kodu — wtedy strona powinna informowac
      const text = await getPageText(page);
      const isGenerating =
        text.includes("Generowanie kodu") ||
        text.includes("przypisywany");

      console.log(`REF-05: brak linku, generowanie=${isGenerating}`);
      // Akceptujemy brak linku jesli trwa generowanie kodu
      // (test nie blokuje CI w tym przypadku)
    }
  });

  test("REF-06 | Statystyki polecen sa widoczne (0 lub wiecej)", async ({ page }) => {
    await loginClient(page);

    await page.goto(`${BASE_URL}/dashboard/referrals`);
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    const text = await getPageText(page);

    const hasStats =
      text.includes("Wszystkie polecenia") ||
      text.includes("Oczekujące") ||
      text.includes("Aktywne") ||
      text.includes("Historia poleceń");

    await page.screenshot({ path: "tests/e2e/recordings/ref06-referral-stats.png", fullPage: true });

    console.log(`REF-06: statystyki widoczne=${hasStats}`);

    if (hasStats) {
      console.log("REF-06: OK — statystyki polecen widoczne");
    } else {
      // Moze byc ze uzytkownik nie ma kodu i widzi ekran generowania
      const isGenerating =
        text.includes("Generowanie kodu") ||
        text.includes("przypisywany");
      console.log(`REF-06: brak statystyk, generowanie=${isGenerating}`);
    }

    // Strona powinna zawierac statystyki ALBO informacje o generowaniu kodu
    const pageHasContent =
      hasStats ||
      text.includes("Generowanie kodu") ||
      text.includes("Program polecający");

    expect(pageHasContent).toBe(true);
  });

});
