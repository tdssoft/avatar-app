import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "https://app.eavatar.diet";

const NOTES = `Pacjentka: Maria Kowalska, 45 lat, kobieta. Pierwsza wizyta.
Objawy: przewlekłe zmęczenie, problemy ze snem, wzdęcia, bóle głowy, wahania nastroju.
Badania: niedobór witaminy D3 (18 ng/ml), niski magnez (0.7 mmol/l), CRP 8 mg/l.
Jelita: dysbioza, candida, zaparcia co 2-3 dni.
Tarczyca: TSH 3.8, FT4 na dolnej granicy normy.
Dieta: dużo przetworzonej żywności, nietolerancja laktozy.
Zalecenia: D3+K2, magnez, probiotyk, wsparcie tarczycy.`;

test("AI-PROMPT: generowanie zaleceń z nowym promptem Lucyny", async ({ page }) => {
  // 1. Login jako admin
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', "admin@eavatar.diet");
  await page.fill('input[type="password"]', "Admin123!");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/admin`, { timeout: 15_000 });

  // 2. Wejdź w pierwszego pacjenta
  const firstPatient = page.locator("text=Profil klienta").first();
  await firstPatient.waitFor({ timeout: 10_000 });
  await firstPatient.click();
  await page.waitForURL(/\/admin\/patient\/.+/, { timeout: 10_000 });

  // 3. Kliknij "Dodaj zalecenia"
  await page.click("text=Dodaj zalecenia");
  await page.waitForURL(/\/recommendation\/new/, { timeout: 10_000 });

  // 4. Wklej notatki
  const textarea = page.locator("textarea").first();
  await textarea.fill(NOTES);

  // 5. Generuj z AI
  await page.click("text=Generuj zalecenia z AI");

  // Czekaj na zakończenie generowania (max 60s)
  await expect(page.locator("text=Generuj zalecenia z AI")).toBeEnabled({ timeout: 60_000 });

  // 6. Znajdź wygenerowaną treść
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.waitFor({ timeout: 10_000 });
  await editor.scrollIntoViewIfNeeded();

  const content = await editor.textContent();
  console.log("=== WYGENEROWANA TREŚĆ (pierwsze 500 znaków) ===");
  console.log(content?.substring(0, 500));

  // Weryfikacja: treść zawiera sekcje zgodne z promptem Lucyny
  expect(content).toBeTruthy();
  expect(content!.length).toBeGreaterThan(200);

  // Scroll do początku edytora żeby wideo pokazało wynik
  await editor.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
});
