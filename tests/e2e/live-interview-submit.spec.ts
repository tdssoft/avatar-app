/**
 * LIVE test na produkcji (app.eavatar.diet)
 * Loguje się jako Alan Urban, ustawia wywiad na ostatni krok (summary),
 * klika "Zapisz" i sprawdza redirect do /dashboard.
 *
 * Uruchom: npx playwright test tests/e2e/live-interview-submit.spec.ts --config=playwright.live.config.ts
 */
import { test, expect } from "@playwright/test";

const PROFILE_ID = "d35f3d7e-8ac6-4ddd-afc0-a86eec04f9e6";
const DRAFT_KEY = `avatar_interview_v2_draft_${PROFILE_ID}`;
const STEP_KEY = `avatar_interview_v2_step_${PROFILE_ID}`;

const FULL_DATA = {
  birthDate: "1990-05-15", weight: "75", height: "178", sex: "mężczyzna",
  mainSymptoms: "Test E2E — wywiad wypełniony automatycznie.", symptomDuration: "1 tydzień", symptomFrequency: "Raz", symptomTriggers: "Brak",
  historicalSymptoms: "Brak chorób przewlekłych.", medicationsSupplementsHerbs: "Brak.",
  dailyFluids: "2 litry wody dziennie.", bowelMovements: "Codziennie rano.",
  workType: "Praca biurowa.", infectionTendency: "Rzadko.",
  mealsLocation: ["home"], mealsPerDay: "3", snacking: "Orzechy.",
  breakfast: "Owsianka", breakfastTime: "7:00", secondBreakfast: "Kanapki", secondBreakfastTime: "10:00",
  lunch: "Obiad", lunchTime: "13:00", afternoonSnack: "Jabłko", afternoonSnackTime: "16:00",
  dinner: "Sałatka", dinnerTime: "19:00",
  darkBreadFrequency: { frequency: "codziennie", note: "Żytnie." },
  whiteBreadFrequency: { frequency: "rzadko", note: "Okazjonalnie." },
  groatsFrequency: { frequency: "3x w tygodniu", note: "Gryczana." },
  riceFrequency: { frequency: "2x w tygodniu", note: "Biały." },
  pastaFrequency: { frequency: "1x w tygodniu", note: "Pszenne." },
  milkFrequency: { frequency: "codziennie", note: "2%." },
  kefirYogurtFrequency: { frequency: "codziennie", note: "Naturalny." },
  yellowCheeseFrequency: { frequency: "2x w tygodniu", note: "Gouda." },
  whiteCheeseFrequency: { frequency: "1x w tygodniu", note: "Twaróg." },
  moldCheeseFrequency: { frequency: "rzadko", note: "Okazjonalnie." },
  eggsFrequency: { frequency: "codziennie", note: "Kurze." },
  whiteMeatFrequency: { frequency: "3x w tygodniu", note: "Kurczak." },
  fishSeafoodFrequency: { frequency: "2x w tygodniu", note: "Łosoś." },
  redMeatFrequency: { frequency: "1x w tygodniu", note: "Wołowina." },
  coldCutsFrequency: { frequency: "2x w tygodniu", note: "Drobiowe." },
  offalFrequency: { frequency: "rzadko", note: "Wątróbka." },
  butterFrequency: { frequency: "codziennie", note: "82%." },
  margarineFrequency: { frequency: "nigdy", note: "Nie spożywam." },
  creamFrequency: { frequency: "1x w tygodniu", note: "18%." },
  plantFatsFrequency: { frequency: "codziennie", note: "Oliwa." },
  animalFatsFrequency: { frequency: "rzadko", note: "Okazjonalnie." },
  fruitsFrequency: { frequency: "codziennie", note: "Jabłka, jagody." },
  vegetablesFrequency: { frequency: "codziennie", note: "Brokuły, marchew." },
  legumesFrequency: { frequency: "2x w tygodniu", note: "Ciecierzyca." },
  nutsSeedsFrequency: { frequency: "codziennie", note: "Orzechy włoskie." },
  honeyFrequency: { frequency: "1x w tygodniu", note: "Gryczany." },
  jamsFrequency: { frequency: "rzadko", note: "Jagodowy." },
  sweetsFrequency: { frequency: "rzadko", note: "Czekolada 70%." },
  saltySnacksFrequency: { frequency: "rzadko", note: "Orzechy." },
  sugarFrequency: { frequency: "nigdy", note: "Nie używam." },
  intolerancesAllergies: "Brak alergii pokarmowych.",
  flavorEnhancers: "Nie używam.",
  addictions: "Brak nałogów — TEST E2E.",
  petsAtHome: "Pies.",
  cycleRegularity: "Nie dotyczy (mężczyzna).",
  notes: "Wywiad wypełniony automatycznie przez test E2E w celu weryfikacji powiadomień email.",
};

test("LIVE: Alan Urban wypełnia wywiad → email do admina", async ({ page }) => {
  // Ustaw localStorage przed załadowaniem strony
  await page.addInitScript(({ draftKey, stepKey, data }) => {
    localStorage.setItem(draftKey, JSON.stringify(data));
    localStorage.setItem(stepKey, "12"); // ostatni krok (summary)
  }, { draftKey: DRAFT_KEY, stepKey: STEP_KEY, data: FULL_DATA });

  // Zaloguj na produkcji
  await page.goto("https://app.eavatar.diet/login");
  await page.getByLabel("Email").fill("admin@tdssoft.pl");
  await page.getByLabel("Hasło").fill("6NVpuv3Qx8IU");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  console.log("✅ Zalogowano jako Alan Urban");

  // Przejdź do wywiadu
  await page.goto("https://app.eavatar.diet/interview");
  await page.waitForLoadState("networkidle");

  // Powinniśmy być na kroku Podsumowanie (12/13)
  await expect(page.locator("text=Podsumowanie").first()).toBeVisible({ timeout: 10_000 });
  console.log("✅ Ostatni krok wywiadu załadowany (Podsumowanie)");

  // Pola summary mogą być puste (DB nadpisuje localStorage) — wypełnij bezpośrednio
  const textareas = page.locator("textarea");
  const count = await textareas.count();
  console.log(`Znaleziono ${count} pól textarea na ostatnim kroku`);

  const testAnswers = [
    "Brak nałogów — test E2E automatyczny.",
    "Pies rasy labrador.",
    "Nie dotyczy (mężczyzna).",
    "Wywiad wypełniony przez test automatyczny — weryfikacja powiadomień email.",
  ];
  for (let i = 0; i < Math.min(count, testAnswers.length); i++) {
    await textareas.nth(i).fill(testAnswers[i]);
  }
  console.log("✅ Pola summary wypełnione");

  // Zrób screenshot przed submitem
  await page.screenshot({ path: "tests/e2e/recordings/live-interview-before-submit.png" });

  // Kliknij "Zapisz" (submit)
  const submitBtn = page.getByRole("button", { name: "Zapisz", exact: true });
  await expect(submitBtn).toBeVisible({ timeout: 5_000 });
  await submitBtn.click();
  console.log("✅ Kliknięto Zapisz");

  // Poczekaj na redirect do dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  console.log("✅ Redirect na /dashboard — wywiad wysłany!");

  await page.screenshot({ path: "tests/e2e/recordings/live-interview-after-submit.png" });
});
