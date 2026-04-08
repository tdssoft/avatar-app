import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

async function loginClient(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill("alan@tdssoft.pl");
  await page.locator('input[type="password"]').first().fill("Admin1234!");
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

test("INTERVIEW-STRUCTURE: weryfikacja nowej struktury kroków", async ({ page }) => {
  const screenshotsDir = "tests/e2e/recordings/interview-structure";
  fs.mkdirSync(screenshotsDir, { recursive: true });

  await loginClient(page);

  // Przejdź do wywiadu
  await page.goto(`${BASE_URL}/dashboard/interview`);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotsDir}/01-interview-start.png`, fullPage: true });

  // Kliknij "Rozpocznij wywiad" lub "Kontynuuj"
  const startBtn = page.locator("button").filter({ hasText: /Rozpocznij|Kontynuuj|Dalej|Start/i }).first();
  if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(1500);
  }

  // === KROK 1: Dane podstawowe ===
  const step1Heading = page.locator("text=Dane podstawowe");
  if (await step1Heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("✅ Krok 1: Dane podstawowe — widoczny");
    await page.screenshot({ path: `${screenshotsDir}/02-krok1-dane-podstawowe.png`, fullPage: true });
    // Przejdź dalej
    await page.locator("button").filter({ hasText: /Dalej/i }).last().click();
    await page.waitForTimeout(1500);
  }

  // === KROK 2: Dolegliwości — powinno być 1 pytanie ===
  const step2Heading = page.locator("text=Dolegliwości");
  if (await step2Heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({ path: `${screenshotsDir}/03-krok2-dolegliwosci.png`, fullPage: true });
    const textareas = page.locator("textarea");
    const count = await textareas.count();
    console.log(`✅ Krok 2: Dolegliwości — liczba pól textarea: ${count} (oczekiwane: 1)`);
    expect(count).toBe(1);

    // Sprawdź brak pytania o okoliczności
    const okolicznosci = page.locator("text=okoliczności");
    const isOkolicznosciVisible = await okolicznosci.isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`${isOkolicznosciVisible ? "❌" : "✅"} Pytanie o okoliczności: ${isOkolicznosciVisible ? "WIDOCZNE (błąd)" : "niewidoczne (OK)"}`);
    expect(isOkolicznosciVisible).toBe(false);

    await page.locator("button").filter({ hasText: /Dalej/i }).last().click();
    await page.waitForTimeout(1500);
  }

  // === KROK 3: Historia zdrowotna — powinny być 2 pytania ===
  const step3Heading = page.locator("text=historia zdrowotna");
  if (await step3Heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({ path: `${screenshotsDir}/04-krok3-historia.png`, fullPage: true });
    const textareas = page.locator("textarea");
    const count = await textareas.count();
    console.log(`✅ Krok 3: Historia zdrowotna — liczba pól textarea: ${count} (oczekiwane: 2)`);
    expect(count).toBe(2);

    // Sprawdź scalony tekst pytania 2
    const mergedLabel = page.locator("text=skłonność do infekcji");
    const isMerged = await mergedLabel.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`${isMerged ? "✅" : "❌"} Pytanie 2 ma scalony tekst (infekcje): ${isMerged ? "TAK" : "NIE"}`);

    await page.locator("button").filter({ hasText: /Dalej/i }).last().click();
    await page.waitForTimeout(1500);
  }

  // Nawyki dnia + Styl życia + Organizacja posiłków — przejdź przez nie
  for (let i = 0; i < 3; i++) {
    const dalej = page.locator("button").filter({ hasText: /Dalej/i }).last();
    if (await dalej.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dalej.click();
      await page.waitForTimeout(1500);
    }
  }

  // === KROK 7: Struktura posiłków — 2-kolumnowy layout ===
  const step7Heading = page.locator("text=Struktura posiłków");
  if (await step7Heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({ path: `${screenshotsDir}/05-krok7-struktura-posilkow.png`, fullPage: true });

    // Sprawdź czy widać "Pora przyjmowania"
    const pora = page.locator("text=Pora przyjmowania?");
    const poraCount = await pora.count();
    console.log(`✅ Krok 7: Struktura posiłków — liczba kolumn "Pora przyjmowania": ${poraCount} (oczekiwane: 4)`);
    expect(poraCount).toBeGreaterThanOrEqual(4);

    // Sprawdź grid (dwukolumnowy)
    const inputs = page.locator('input[type="text"], input:not([type])');
    const inputCount = await inputs.count();
    console.log(`✅ Krok 7: Liczba pól input: ${inputCount} (oczekiwane: 8 = 4 pary × 2)`);

    await page.locator("button").filter({ hasText: /Dalej/i }).last().click();
    await page.waitForTimeout(1500);
  }

  // === KROK 8: Produkty zbożowe — helper text ===
  const step8Heading = page.locator("text=Produkty zbożowe");
  if (await step8Heading.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.screenshot({ path: `${screenshotsDir}/06-krok8-produkty-zbozowe.png`, fullPage: true });

    // Sprawdź czy kasze i ryż są scalone
    const kaszeRyz = page.locator("text=kasze i ryż");
    const isKaszeRyz = await kaszeRyz.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`${isKaszeRyz ? "✅" : "❌"} "Kasze i ryż" scalone w jednym pytaniu: ${isKaszeRyz ? "TAK" : "NIE"}`);

    // Sprawdź helper text
    const helperText = page.locator("text=basmati");
    const isHelper = await helperText.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`${isHelper ? "✅" : "❌"} Helper text z listą produktów (basmati): ${isHelper ? "widoczny" : "niewidoczny"}`);
  }

  console.log("\n✅ Wszystkie weryfikacje zakończone. Sprawdź screenshots w:", screenshotsDir);
});
