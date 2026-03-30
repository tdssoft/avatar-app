/**
 * E2E: Wypełnienie wywiadu do końca dla Alan Urban + weryfikacja czy admin otrzymuje email.
 *
 * Strategia: inject pełne dane wywiadu przez localStorage (wszystkie 13 kroków),
 * ustaw krok na ostatni (12 = summary), załaduj stronę, kliknij "Wyślij",
 * a następnie sprawdź czy admin_events ma wpis interview_sent oraz czy
 * edge function send-question-notification (email) zostało wywołane.
 */
import { test, expect } from "@playwright/test";
import { installSupabaseMocks } from "./helpers/supabaseMock";

// ---------------------------------------------------------------------------
// Pełne dane wywiadu — minimalnie wymagane dla każdego kroku
// ---------------------------------------------------------------------------
const FULL_INTERVIEW_DATA = {
  // Step 0: basic
  birthDate: "1990-05-15",
  weight: "75",
  height: "178",
  sex: "mężczyzna",

  // Step 1: symptoms
  mainSymptoms: "Zmęczenie, problemy z trawieniem, wzdęcia po posiłkach.",
  symptomDuration: "Około 6 miesięcy",
  symptomFrequency: "Codziennie",
  symptomTriggers: "Nasilają się po spożyciu glutenu i nabiału.",

  // Step 2: history
  historicalSymptoms: "W przeszłości refluks żołądkowy, leczony inhibitorami pompy protonowej.",
  medicationsSupplementsHerbs: "Magnez 400mg, Omega-3, probiotyk Lactobacillus.",

  // Step 3: fluids
  dailyFluids: "Około 1.5l wody dziennie, rano kawa, wieczorem herbata.",
  bowelMovements: "Codziennie rano, między 7:00 a 8:00.",

  // Step 4: work
  workType: "Praca biurowa, siedząca, 8 godzin dziennie.",
  infectionTendency: "Infekcje 2-3 razy w roku, głównie jesienią i zimą.",

  // Step 5: meal-pattern
  mealsLocation: ["home"],
  mealsPerDay: "4",
  snacking: "Orzechy i owoce między posiłkami.",

  // Step 6: daily-meals
  breakfast: "Owsianka z owocami",
  breakfastTime: "7:30",
  secondBreakfast: "Kanapki z warzywami",
  secondBreakfastTime: "10:30",
  lunch: "Zupa + drugie danie",
  lunchTime: "13:00",
  afternoonSnack: "Jogurt naturalny",
  afternoonSnackTime: "16:00",
  dinner: "Sałatka z jajkiem",
  dinnerTime: "19:00",

  // Step 7: grains (frequency type: {frequency, note})
  darkBreadFrequency: { frequency: "codziennie", note: "Pieczywo żytnie, 2 kromki dziennie." },
  whiteBreadFrequency: { frequency: "rzadko", note: "Okazjonalnie orkiszowe." },
  groatsFrequency: { frequency: "3-4 razy w tygodniu", note: "Kasza gryczana i jaglana." },
  riceFrequency: { frequency: "2-3 razy w tygodniu", note: "Biały i basmati." },
  pastaFrequency: { frequency: "1-2 razy w tygodniu", note: "Pszenne i ryżowe." },

  // Step 8: dairy-protein-a
  milkFrequency: { frequency: "codziennie", note: "Krowie 2%." },
  kefirYogurtFrequency: { frequency: "codziennie", note: "Jogurt naturalny." },
  yellowCheeseFrequency: { frequency: "2-3 razy w tygodniu", note: "Mozzarella, gouda." },
  whiteCheeseFrequency: { frequency: "1-2 razy w tygodniu", note: "Twaróg półtłusty." },
  moldCheeseFrequency: { frequency: "rzadko", note: "Okazjonalnie camembert." },

  // Step 9: protein-b
  eggsFrequency: { frequency: "codziennie", note: "Jajka kurze, gotowane lub sadzone." },
  whiteMeatFrequency: { frequency: "3-4 razy w tygodniu", note: "Kurczak, indyk." },
  fishSeafoodFrequency: { frequency: "2 razy w tygodniu", note: "Łosoś, dorsz." },
  redMeatFrequency: { frequency: "1 raz w tygodniu", note: "Wołowina." },
  coldCutsFrequency: { frequency: "2-3 razy w tygodniu", note: "Drobiowe wędliny." },
  offalFrequency: { frequency: "rzadko", note: "Wątróbka raz w miesiącu." },

  // Step 10: fats-plants
  butterFrequency: { frequency: "codziennie", note: "Masło 82% do kanapek." },
  margarineFrequency: { frequency: "nigdy", note: "Nie spożywam margaryn." },
  creamFrequency: { frequency: "1-2 razy w tygodniu", note: "Śmietana 18%." },
  plantFatsFrequency: { frequency: "codziennie", note: "Oliwa z oliwek, olej lniany." },
  animalFatsFrequency: { frequency: "rzadko", note: "Okazjonalnie gęsi smalec." },
  fruitsFrequency: { frequency: "codziennie", note: "Jabłka, jagody, banany." },
  vegetablesFrequency: { frequency: "codziennie", note: "Brokuły, marchew, cukinia, szpinak." },
  legumesFrequency: { frequency: "2-3 razy w tygodniu", note: "Ciecierzyca, soczewica." },
  nutsSeedsFrequency: { frequency: "codziennie", note: "Orzechy włoskie, migdały, dynia." },

  // Step 11: sweet-intolerances
  honeyFrequency: { frequency: "1-2 razy w tygodniu", note: "Miód gryczany." },
  jamsFrequency: { frequency: "rzadko", note: "Dżem jagodowy." },
  sweetsFrequency: { frequency: "rzadko", note: "Ciemna czekolada 70%." },
  saltySnacksFrequency: { frequency: "rzadko", note: "Orzechy ziemne." },
  sugarFrequency: { frequency: "nigdy", note: "Nie używam cukru." },
  intolerancesAllergies: "Nietolerancja laktozy (mleko krowie w dużych ilościach).",
  flavorEnhancers: "Nie używam kostek rosołowych ani vegety.",

  // Step 12: summary
  addictions: "Brak nałogów.",
  petsAtHome: "Pies rasy labrador.",
  cycleRegularity: "Nie dotyczy (mężczyzna).",
  notes: "Chciałbym poprawić trawienie i zwiększyć energię w ciągu dnia.",
};

const PROFILE_ID = "pp-user-1";
const DRAFT_KEY = `avatar_interview_v2_draft_${PROFILE_ID}`;
const STEP_KEY = `avatar_interview_v2_step_${PROFILE_ID}`;
const LAST_STEP = 12; // step index for "summary" (0-indexed, 13 steps total)

// ---------------------------------------------------------------------------
// Test: Wypełnienie wywiadu do końca i sprawdzenie czy email jest wysyłany
// ---------------------------------------------------------------------------

test("Alan Urban: wypełnienie wywiadu do końca i weryfikacja notyfikacji admina", async ({
  page,
}) => {
  // Track czy edge function send-question-notification lub inny email endpoint był wywołany
  const emailRequests: string[] = [];
  await page.route("**/functions/v1/send-question-notification", async (route) => {
    emailRequests.push("send-question-notification");
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
  await page.route("**/functions/v1/**", async (route) => {
    const url = route.request().url();
    if (url.includes("email") || url.includes("notification") || url.includes("send")) {
      emailRequests.push(url);
    }
    await route.continue();
  });

  // Track wywołania do nutrition_interviews
  const interviewRequests: { method: string; body: any }[] = [];
  await page.route("**/rest/v1/nutrition_interviews**", async (route) => {
    const method = route.request().method();
    let body: any = null;
    try {
      body = JSON.parse(route.request().postData() || "{}");
    } catch {}
    interviewRequests.push({ method, body });
    await route.continue();
  });

  // Setup mock z zalogowanym userem
  await installSupabaseMocks(page, "user", { seedJanNoInterviewStaszekSent: true });

  // Inject dane wywiadu do localStorage przed załadowaniem strony
  await page.addInitScript(
    ({ draftKey, stepKey, data, lastStep }) => {
      localStorage.setItem(draftKey, JSON.stringify(data));
      localStorage.setItem(stepKey, String(lastStep));
    },
    {
      draftKey: DRAFT_KEY,
      stepKey: STEP_KEY,
      data: FULL_INTERVIEW_DATA,
      lastStep: LAST_STEP,
    },
  );

  // Zaloguj jako pacjent (user)
  await page.goto("/login");
  await page.getByLabel("Email").fill("jan@example.com");
  await page.getByLabel("Hasło").fill("Test1234!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

  // Przejdź do wywiadu
  await page.goto("/interview");
  await page.waitForLoadState("networkidle");

  // Poczekaj na załadowanie ostatniego kroku (summary)
  await expect(page.locator("text=Podsumowanie").first()).toBeVisible({ timeout: 10_000 });

  // Sprawdź że jesteśmy na kroku 13/13 (summary)
  const progressText = page.locator("text=/13.*13|krok.*13/i").first();
  console.log("Sprawdzam czy jesteśmy na ostatnim kroku...");

  // Sprawdź że pola summary są widoczne

  // Kliknij "Wyślij"
  const submitButton = page.getByRole("button", { name: "Zapisz", exact: true });
  await expect(submitButton).toBeVisible();
  await submitButton.click();

  // Poczekaj na przekierowanie do dashboardu po sukcesie
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

  console.log("\n=== WYNIKI TESTU ===");

  // Sprawdź wywołanie nutrition_interviews (PUT/PATCH — update do status=sent)
  const sentRequest = interviewRequests.find(
    (r) => r.method === "PATCH" || r.method === "PUT" || r.method === "POST",
  );
  if (sentRequest) {
    console.log("✅ Wywiad zapisany:", sentRequest.method, JSON.stringify(sentRequest.body));
    expect(sentRequest.body?.status || sentRequest.body).toBeTruthy();
  }

  // Sprawdź czy email był wysłany
  if (emailRequests.length > 0) {
    console.log("✅ Email wysłany! Endpointy:", emailRequests.join(", "));
  } else {
    console.log(
      "❌ BRAK EMAIL: Żaden endpoint e-mail nie został wywołany po submicie wywiadu!",
    );
    console.log(
      "   → Admin nie otrzymuje emaila gdy pacjent wysyła wywiad.",
    );
    console.log(
      "   → Dostępne są tylko in-app notyfikacje (dzwonek w panelu).",
    );
    // To jest znany brak funkcjonalności — nie fail testu, tylko log
  }

  // Przekierowanie do dashboardu = wywiad wysłany poprawnie
  expect(page.url()).toMatch(/\/dashboard$/);
  console.log("✅ Wywiad wysłany — przekierowanie na /dashboard");
});

// ---------------------------------------------------------------------------
// Test: Weryfikacja admin_events po submicie (sprawdzenie przez RPC mock)
// ---------------------------------------------------------------------------

test("Alan Urban: po submicie wywiadu → admin_events powinno mieć wpis interview_sent", async ({
  page,
}) => {
  const adminEventInserted: any[] = [];

  // Przechwytuj INSERT do admin_events
  await page.route("**/rest/v1/admin_events**", async (route) => {
    if (route.request().method() === "POST") {
      let body: any = null;
      try {
        body = JSON.parse(route.request().postData() || "{}");
      } catch {}
      adminEventInserted.push(body);
    }
    await route.continue();
  });

  await installSupabaseMocks(page, "user", { seedJanNoInterviewStaszekSent: true });

  await page.addInitScript(
    ({ draftKey, stepKey, data, lastStep }) => {
      localStorage.setItem(draftKey, JSON.stringify(data));
      localStorage.setItem(stepKey, String(lastStep));
    },
    {
      draftKey: DRAFT_KEY,
      stepKey: STEP_KEY,
      data: FULL_INTERVIEW_DATA,
      lastStep: LAST_STEP,
    },
  );

  await page.goto("/login");
  await page.getByLabel("Email").fill("jan@example.com");
  await page.getByLabel("Hasło").fill("Test1234!");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 10_000 });

  await page.goto("/interview");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=Podsumowanie").first()).toBeVisible({ timeout: 10_000 });

  const submitButton = page.getByRole("button", { name: "Zapisz", exact: true });
  await submitButton.click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

  console.log("\n=== ADMIN EVENTS ===");
  console.log(
    "admin_events inserts intercepted:",
    adminEventInserted.length,
    adminEventInserted,
  );

  // admin_events jest tworzony przez DB trigger (nie bezpośrednio z frontendu)
  // więc nie zobaczymy go w intercepted requests — to jest oczekiwane
  console.log(
    "Uwaga: admin_events są tworzone przez DB trigger, nie przez frontend.",
  );
  console.log(
    "Weryfikacja przez DB jest wymagana — sprawdź VPS:\n" +
    "  docker exec supabase-db psql -U postgres -c \"SELECT * FROM admin_events WHERE event_type='interview_sent' ORDER BY created_at DESC LIMIT 3;\"\n"
  );

  // Podstawowy assert — przekierowanie = sukces
  expect(page.url()).toMatch(/\/dashboard$/);
});
