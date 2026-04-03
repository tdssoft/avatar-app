import { expect, test } from "@playwright/test";

const BASE_URL = "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "E2ETest2026!";

test.describe("Admin – Aktywuj dostęp (grant access)", () => {
  test("Kliknięcie 'Aktywuj dostęp' nie powoduje białej strony", async ({ page }) => {
    // Collect all console errors and JS errors
    const consoleErrors: string[] = [];
    const jsErrors: string[] = [];
    const networkErrors: { url: string; status: number; body?: string }[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
        console.log("CONSOLE ERROR:", msg.text());
      }
    });

    page.on("pageerror", (err) => {
      jsErrors.push(err.message + "\n" + err.stack);
      console.log("JS ERROR:", err.message);
      console.log("STACK:", err.stack);
    });

    page.on("response", async (response) => {
      if (!response.ok() && response.url().includes("supabase")) {
        let body = "";
        try { body = await response.text(); } catch { /* ignore */ }
        networkErrors.push({ url: response.url(), status: response.status(), body });
        console.log(`NETWORK ERROR [${response.status()}]:`, response.url(), body.slice(0, 200));
      }
    });

    // Step 1: Zaloguj jako admin
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await emailInput.fill(ADMIN_EMAIL);
    await passwordInput.fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /log.?in|zaloguj|sign.?in/i }).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    console.log("After login URL:", page.url());
    expect(page.url()).toContain("/admin");

    // Step 2: Przejdź do panelu admina
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Step 3: Znajdź pacjenta z przyciskiem "Aktywuj dostęp"
    // Najpierw zbierz wszystkie linki do profili pacjentów
    const profileLinks = page.locator("a[href*='/admin/patient/']");
    const linksCount = await profileLinks.count();
    console.log("Total patient profile links:", linksCount);

    let patientUrl = "";
    let activateProfileBtnFound = false;

    // Przejrzyj do 10 pacjentów żeby znaleźć "Aktywuj dostęp"
    const hrefs: string[] = [];
    for (let i = 0; i < Math.min(linksCount, 10); i++) {
      const href = await profileLinks.nth(i).getAttribute("href");
      if (href && !hrefs.includes(href)) hrefs.push(href);
    }

    for (const href of hrefs) {
      await page.goto(`${BASE_URL}${href}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1500);

      const btn = page.getByRole("button", { name: /Aktywuj dostęp/i }).first();
      if (await btn.count() > 0) {
        patientUrl = page.url();
        activateProfileBtnFound = true;
        console.log("Found 'Aktywuj dostęp' at:", patientUrl);
        break;
      }
    }

    if (!activateProfileBtnFound) {
      console.warn("Nie znaleziono pacjenta z przyciskiem 'Aktywuj dostęp' — wszyscy mają już aktywny dostęp");
      // Wróć do pierwszego pacjenta i sprawdź że strona działa
      await page.goto(`${BASE_URL}${hrefs[0]}`);
      await page.waitForLoadState("networkidle");
      const bodyLen = await page.evaluate(() => document.body.innerText.length);
      expect(bodyLen).toBeGreaterThan(100);
      return;
    }

    await page.screenshot({ path: "tests/e2e/recordings/03-before-activate.png" });

    // Step 4: Kliknij "Aktywuj dostęp" (otwiera dialog)
    const activateBtn = page.getByRole("button", { name: /Aktywuj dostęp/i }).first();
    await activateBtn.click();
    await page.waitForTimeout(800);

    await page.screenshot({ path: "tests/e2e/recordings/04-dialog-open.png" });

    // Step 5: Wypełnij dialog
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Wybierz powód
    const comboboxes = dialog.locator('[role="combobox"]');
    const comboCount = await comboboxes.count();
    console.log("Comboboxes in dialog:", comboCount);

    if (comboCount >= 1) {
      await comboboxes.first().click();
      await page.waitForTimeout(400);
      const options = page.locator('[role="option"]');
      const optCount = await options.count();
      console.log("Options for reason:", optCount);
      if (optCount > 0) {
        await options.first().click();
        await page.waitForTimeout(300);
      }
    }

    if (comboCount >= 2) {
      await comboboxes.nth(1).click();
      await page.waitForTimeout(400);
      const options = page.locator('[role="option"]');
      const optCount = await options.count();
      console.log("Options for package:", optCount);
      if (optCount > 0) {
        await options.first().click();
        await page.waitForTimeout(300);
      }
    }

    await page.screenshot({ path: "tests/e2e/recordings/05-dialog-filled.png" });

    // Step 6: Kliknij "Aktywuj dostęp" w dialogu (confirm)
    const confirmBtn = dialog.getByRole("button", { name: /Aktywuj dostęp/i }).first();
    const isEnabled = await confirmBtn.isEnabled().catch(() => false);
    console.log("Confirm button enabled:", isEnabled);

    if (isEnabled) {
      // Śledź zapytania do edge function
      const grantRequests: { url: string; status: number; body?: string }[] = [];
      page.on("response", async (response) => {
        if (response.url().includes("admin-grant-access") || response.url().includes("functions")) {
          let body = "";
          try { body = await response.text(); } catch { /* ignore */ }
          grantRequests.push({ url: response.url(), status: response.status(), body });
          console.log(`GRANT ACCESS RESPONSE [${response.status()}]:`, response.url(), body.slice(0, 500));
        }
      });

      await confirmBtn.click();
      // Poczekaj na zakończenie wszystkich żądań sieciowych
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
        console.log("networkidle timeout - continuing");
      });
      await page.waitForTimeout(2000);

      console.log("Grant access requests:", JSON.stringify(grantRequests, null, 2));
    } else {
      console.log("Confirm button is DISABLED - dialog not fully filled");
    }

    // Step 7: Sprawdź stan strony po kliknięciu
    await page.screenshot({ path: "tests/e2e/recordings/06-after-confirm.png" });

    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);

    const bodyText = await page.evaluate(() => document.body.innerText);
    const bodyLen = bodyText.length;
    console.log("Body text length:", bodyLen);
    console.log("Body text (first 500):", bodyText.slice(0, 500));

    console.log("=== SUMMARY ===");
    console.log("JS Errors:", jsErrors);
    console.log("Console Errors:", consoleErrors);
    console.log("Network Errors:", JSON.stringify(networkErrors, null, 2));

    // Główna asercja: strona nie powinna być biała
    expect(bodyLen, "Strona crashuje - biała strona (body <100 znaków)").toBeGreaterThan(100);

    // Nie powinno być błędów JS
    expect(jsErrors, "Błędy JavaScript na stronie").toHaveLength(0);
  });
});
