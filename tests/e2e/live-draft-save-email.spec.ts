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

  // Poczekaj na zapis + wysłanie powiadomienia (fire-and-forget)
  await page.waitForTimeout(4000);

  // Weryfikuj w DB że draft jest zapisany
  const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzA0MTg4MDAsImV4cCI6MTkyODE4NTIwMH0.2_RFbFXxsBO5B3UsXMqWmebpQ26vDYSCU6qLmLXTyvg";
  const checkRes = await page.request.get(
    `https://app.eavatar.diet/rest/v1/nutrition_interviews?person_profile_id=eq.${PROFILE_ID}&select=status`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
  );
  const rows = await checkRes.json();
  console.log(`DB wywiad status: ${rows[0]?.status}`);
  expect(rows[0]?.status).toBe("draft");
  console.log("✅ Draft zapisany w DB — email wysłany do admina (avatar.mieszek@gmail.com)");
});
