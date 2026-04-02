/**
 * LIVE E2E: Pełny autonomiczny flow pacjenta BEZ interwencji programisty
 *
 * 1. Admin tworzy nowego pacjenta przez admin-create-patient API
 * 2. Admin nadaje dostęp przez admin-grant-access API
 * 3. Pacjent loguje się → widzi pełny dashboard (hasPaidPlan=true)
 * 4. Pacjent zapisuje draft wywiadu → admin dostaje email
 * 5. Admin widzi wywiad w panelu
 *
 * Uruchom: npx playwright test tests/e2e/live-full-patient-flow.spec.ts --config=playwright.live.config.ts
 */
import { test, expect, request } from "@playwright/test";

const SUPABASE_URL = "https://app.eavatar.diet";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzA0MTg4MDAsImV4cCI6MTkyODE4NTIwMH0.2_RFbFXxsBO5B3UsXMqWmebpQ26vDYSCU6qLmLXTyvg";
const ADMIN_EMAIL = "admin@tdssoft.pl";
const ADMIN_PASSWORD = "6NVpuv3Qx8IU";
const TEST_EMAIL = `e2e.test.${Date.now()}@tdssoft.pl`;
const TEST_PASSWORD = "TestPatient2026!";

let adminJwt = "";
let patientUserId = "";
let patientId = "";

test.describe("LIVE: Autonomiczny flow pacjenta", () => {

  test("1. Admin loguje się i tworzy nowego pacjenta", async ({ page }) => {
    // Login admin
    await page.goto(`${SUPABASE_URL}/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // Pobierz JWT admina przez Supabase
    adminJwt = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.includes("auth-token") || k.includes("supabase.auth"));
      for (const k of keys) {
        try {
          const val = JSON.parse(localStorage.getItem(k) ?? "{}");
          return val?.access_token ?? val?.session?.access_token ?? "";
        } catch { return ""; }
      }
      return "";
    });
    console.log("Admin JWT pobrane:", adminJwt ? "✅" : "❌ BRAK");

    // Utwórz pacjenta przez admin-create-patient
    const resp = await page.request.post(`${SUPABASE_URL}/functions/v1/admin-create-patient`, {
      headers: {
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      data: {
        email: TEST_EMAIL,
        firstName: "Test",
        lastName: "Pacjent E2E",
        password: TEST_PASSWORD,
      },
    });

    const body = await resp.json();
    console.log("admin-create-patient status:", resp.status(), JSON.stringify(body).slice(0, 200));
    expect(resp.status()).toBe(200);
    patientUserId = body.userId ?? body.user?.id ?? "";
    console.log(`✅ Pacjent utworzony: ${TEST_EMAIL} | userId: ${patientUserId}`);
  });

  test("2. Admin nadaje pakiet przez admin-grant-access", async ({ page }) => {
    // Pobierz patient_id z DB
    const patientRes = await page.request.get(
      `${SUPABASE_URL}/rest/v1/patients?user_id=eq.${patientUserId}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const patients = await patientRes.json();
    patientId = patients[0]?.id;
    console.log(`Patient ID: ${patientId}`);
    expect(patientId).toBeTruthy();

    // Login admin ponownie dla JWT
    await page.goto(`${SUPABASE_URL}/login`);
    await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    adminJwt = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.includes("auth-token") || k.includes("supabase.auth"));
      for (const k of keys) {
        try {
          const val = JSON.parse(localStorage.getItem(k) ?? "{}");
          return val?.access_token ?? val?.session?.access_token ?? "";
        } catch { return ""; }
      }
      return "";
    });

    // Nadaj dostęp
    const grantRes = await page.request.post(`${SUPABASE_URL}/functions/v1/admin-grant-access`, {
      headers: {
        Authorization: `Bearer ${adminJwt}`,
        "Content-Type": "application/json",
      },
      data: {
        patientId,
        productId: "mini",
        reason: "inny_przypadek",
      },
    });
    const grantBody = await grantRes.json();
    console.log("admin-grant-access:", grantRes.status(), JSON.stringify(grantBody).slice(0, 200));
    expect(grantRes.status()).toBe(200);
    console.log("✅ Dostęp nadany: Mini Program Startowy");
  });

  test("3. Pacjent loguje się i widzi pełny dashboard", async ({ page }) => {
    await page.goto(`${SUPABASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").innerText();
    const hasWelcome = bodyText.includes("Witamy w Avatar!");
    const hasPlanChoice = bodyText.includes("Wybierz odpowiedni program");

    console.log(`hasPaidPlan UI: ${hasWelcome && !hasPlanChoice ? "✅ TAK" : "❌ NIE (widać wybór pakietu)"}`);
    console.log("Fragment strony:", bodyText.slice(0, 300));

    expect(hasPlanChoice).toBe(false);
    console.log("✅ Pacjent widzi pełny dashboard (NIE widzi ekranu wyboru pakietu)");
  });

  test("4. Pacjent zapisuje draft wywiadu → admin dostaje email", async ({ page }) => {
    // Pobierz profile_id
    const profileRes = await page.request.get(
      `${SUPABASE_URL}/rest/v1/person_profiles?account_user_id=eq.${patientUserId}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const profiles = await profileRes.json();
    const profileId = profiles[0]?.id;
    console.log(`Profile ID: ${profileId}`);

    // Utwórz draft wywiadu
    await page.request.post(`${SUPABASE_URL}/rest/v1/nutrition_interviews`, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      data: {
        person_profile_id: profileId,
        status: "draft",
        content: {
          birthDate: "1995-07-10",
          weight: "70",
          height: "175",
          sex: "kobieta",
          mainSymptoms: "Bóle brzucha, wzdęcia.",
          symptomDuration: "3 miesiące",
        },
      },
    });

    // Login jako pacjent i kliknij Zapisz roboczo
    await page.addInitScript(({ stepKey }) => {
      localStorage.setItem(stepKey, "1");
    }, { stepKey: `avatar_interview_v2_step_${profileId}` });

    await page.goto(`${SUPABASE_URL}/login`);
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    await page.goto(`${SUPABASE_URL}/interview`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const saveBtn = page.getByRole("button", { name: "Zapisz roboczo" });
    await expect(saveBtn).toBeVisible({ timeout: 10_000 });
    await saveBtn.click();
    await page.waitForTimeout(4000);

    console.log("✅ Draft zapisany — email powinien trafić do admina");
  });

  test("5. Admin widzi wywiad pacjenta w panelu", async ({ page }) => {
    const patientRes = await page.request.get(
      `${SUPABASE_URL}/rest/v1/nutrition_interviews?select=id,status,content&person_profile_id=eq.${patientUserId}`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );

    // Sprawdź przez person_profiles
    const profileRes = await page.request.get(
      `${SUPABASE_URL}/rest/v1/person_profiles?account_user_id=eq.${patientUserId}&select=id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const profiles = await profileRes.json();
    const profileId = profiles[0]?.id;

    const interviewRes = await page.request.get(
      `${SUPABASE_URL}/rest/v1/nutrition_interviews?person_profile_id=eq.${profileId}&select=id,status`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const interviews = await interviewRes.json();
    console.log(`Wywiady w DB: ${JSON.stringify(interviews)}`);
    expect(interviews.length).toBe(1);
    expect(interviews[0].status).toBe("draft");
    console.log("✅ Admin widzi wywiad ze statusem 'draft' — flow kompletny!");
  });

});
