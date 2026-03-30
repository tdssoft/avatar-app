/**
 * LIVE test: alan@tdssoft.pl zapisuje draft wywiadu → admin dostaje email "edytował wywiad"
 */
import { test, expect } from "@playwright/test";

const PROFILE_ID = "b1b248a9-159e-4c66-9344-66b56801be6e";
const STEP_KEY = `avatar_interview_v2_step_${PROFILE_ID}`;

test("LIVE: alan@tdssoft.pl zapisuje draft → email do admina", async ({ page }) => {
  // Ustaw krok 5 w localStorage (połowa wywiadu)
  await page.addInitScript(({ stepKey }) => {
    localStorage.setItem(stepKey, "5");
  }, { stepKey: STEP_KEY });

  // Logowanie
  await page.goto("https://app.eavatar.diet/login");
  await page.locator('input[type="email"]').fill("alan@tdssoft.pl");
  await page.locator('input[type="password"]').fill("Avatar2026!");
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  console.log("✅ Zalogowano jako alan@tdssoft.pl");

  // Przejdź do wywiadu
  await page.goto("https://app.eavatar.diet/interview");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);

  console.log("URL:", page.url());

  // Sprawdź że jest na kroku 5 (np. "Nawyki żywieniowe" lub podobny)
  const heading = page.locator("h2, h1").first();
  console.log("Nagłówek kroku:", await heading.innerText().catch(() => "brak"));

  // Screenshot przed zapisem
  await page.screenshot({ path: "tests/e2e/recordings/draft-before-save.png" });

  // Kliknij "Zapisz roboczo"
  const saveBtn = page.getByRole("button", { name: "Zapisz roboczo" });
  await expect(saveBtn).toBeVisible({ timeout: 10_000 });
  await saveBtn.click();
  console.log("✅ Kliknięto 'Zapisz roboczo'");

  // Poczekaj na toast
  await page.waitForTimeout(2000);
  const toast = page.locator("[data-radix-toast-viewport]").first();
  const toastText = await toast.innerText().catch(() => "brak toastu");
  console.log("Toast:", toastText);

  await page.screenshot({ path: "tests/e2e/recordings/draft-after-save.png" });
  console.log("✅ Test zakończony — sprawdź email na avatar.mieszek@gmail.com");
});
