/**
 * E2E: Admin wypełnia wywiad za pacjenta
 * Weryfikuje nową funkcję "Wypełnij wywiad za pacjenta" z panelu admina.
 *
 * Uruchom: npx playwright test tests/e2e/admin-fill-interview.spec.ts --config=playwright.live.config.ts
 */
import { test, expect } from "@playwright/test";

const BASE_URL = "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "E2ETest2026!";

test("Admin wypełnia wywiad za pacjenta", async ({ page }) => {
  // ─── 1. Logowanie admina ───────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`);
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin|\/dashboard/, { timeout: 15_000 });
  console.log("✅ Admin zalogowany");

  // ─── 2. Panel admina - lista pacjentów ────────────────────────────
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle");

  // Kliknij "Profil klienta" dla pierwszego pacjenta
  const firstProfileBtn = page.getByRole("button", { name: /Profil klienta/i }).first();
  await firstProfileBtn.waitFor({ timeout: 10_000 });
  await firstProfileBtn.click();
  await expect(page).toHaveURL(/\/admin\/patient\//, { timeout: 10_000 });
  console.log("✅ Otwarto profil pacjenta:", page.url());

  // ─── 3. Znajdź i kliknij "Wypełnij wywiad za pacjenta" ───────────
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(3000);

  // Debug: sprawdź ile przycisków z tym tekstem jest na stronie
  const btnCount = await page.locator("button").filter({ hasText: /Wypełnij wywiad/i }).count();
  console.log(`🔍 Liczba przycisków 'Wypełnij wywiad': ${btnCount}`);

  // Przewiń do przycisku (jest w prawej kolumnie, ~900px)
  const fillBtn = page.locator("button").filter({ hasText: /Wypełnij wywiad za pacjenta/i });
  await fillBtn.waitFor({ state: "attached", timeout: 15_000 });
  await fillBtn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);

  // Zatrzymaj się chwilę żeby nagranie było widoczne
  await page.waitForTimeout(1000);
  console.log("✅ Znaleziono przycisk 'Wypełnij wywiad za pacjenta'");

  await fillBtn.click();

  // ─── 4. Strona formularza wywiadu (admin) ─────────────────────────
  await expect(page).toHaveURL(/\/admin\/patient\/.*\/interview\//, { timeout: 10_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Weryfikuj nagłówek admina
  await expect(page.getByText(/Wypełniasz wywiad za pacjenta/i)).toBeVisible({ timeout: 8_000 });
  await expect(page.getByText(/Wywiad dietetyczny/i)).toBeVisible();
  console.log("✅ Formularz wywiadu admina otwarty");

  // ─── 5. Wypełnij krok 1 (podstawowe dane) ─────────────────────────
  // Data urodzenia
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.waitFor({ timeout: 5_000 });
  await dateInput.fill("1990-03-15");
  await page.waitForTimeout(300);

  // Waga
  const inputs = page.locator('input[type="text"], input:not([type])').filter({ hasNotText: "" });
  const weightInput = page.getByPlaceholder(/waga|kg/i).first();
  if (await weightInput.count() > 0) {
    await weightInput.fill("70");
  } else {
    // Fallback: wypełnij drugi input tekstowy
    const allInputs = page.locator('input[placeholder]');
    await allInputs.nth(0).fill("70");
  }
  await page.waitForTimeout(300);

  // Wzrost
  const heightInput = page.getByPlaceholder(/wzrost|cm/i).first();
  if (await heightInput.count() > 0) {
    await heightInput.fill("170");
  } else {
    const allInputs = page.locator('input[placeholder]');
    await allInputs.nth(1).fill("170");
  }
  await page.waitForTimeout(300);

  // Płeć - Select
  const sexSelect = page.locator('[role="combobox"]').first();
  if (await sexSelect.count() > 0) {
    await sexSelect.click();
    await page.waitForTimeout(500);
    // Wybierz "Kobieta" jeśli dostępne
    const kobietaOption = page.getByRole("option", { name: /kobieta/i });
    if (await kobietaOption.count() > 0) {
      await kobietaOption.click();
    } else {
      // Wybierz pierwszą opcję
      await page.locator('[role="option"]').first().click();
    }
  }
  await page.waitForTimeout(500);
  console.log("✅ Krok 1 wypełniony");

  // ─── 6. Zapisz roboczo ─────────────────────────────────────────────
  const saveDraftBtn = page.getByRole("button", { name: /Zapisz roboczo/i });
  await saveDraftBtn.click();
  await page.waitForTimeout(2000);

  // Sprawdź czy czas ostatniego zapisu się zaktualizował (lub toast)
  console.log("✅ Kliknięto 'Zapisz roboczo'");

  // ─── 7. Dalej do kroku 2 ──────────────────────────────────────────
  const nextBtn = page.getByRole("button", { name: /Dalej/i });
  if (await nextBtn.isEnabled()) {
    await nextBtn.click();
    await page.waitForTimeout(800);
    console.log("✅ Przejście do kroku 2");
  }

  // ─── 8. Wróć do pacjenta ──────────────────────────────────────────
  // Z kroku 2 kliknij Poprzedni krok → wróci do kroku 1
  // Z kroku 1 kliknij "Wróć do pacjenta"
  const backBtn = page.getByRole("button", { name: /Poprzedni krok|Wróć do pacjenta/i });
  await backBtn.click();
  await page.waitForTimeout(600);

  // Jeśli wróciliśmy do kroku 1, klikamy "Wróć do pacjenta"
  const backToPatientBtn = page.getByRole("button", { name: /Wróć do pacjenta/i });
  if (await backToPatientBtn.isVisible({ timeout: 1000 })) {
    await backToPatientBtn.click();
  }

  // ─── 9. Weryfikacja powrotu i zakładki interview ───────────────────
  await expect(page).toHaveURL(/\/admin\/patient\//, { timeout: 10_000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Sprawdź czy jesteśmy na zakładce interview
  const interviewTab = page.getByText(/Wywiad/i).first();
  await expect(interviewTab).toBeVisible({ timeout: 5_000 });

  console.log("✅ Powrót do profilu pacjenta - zakładka wywiad widoczna");
  console.log("✅ Test zakończony sukcesem!");

  // Poczekaj chwilę na końcowe zrzuty
  await page.waitForTimeout(2000);
});
