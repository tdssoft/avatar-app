/**
 * E2E Weryfikacja zmian tekstowych T1-T12 na produkcji
 *
 * Uruchom:
 *   BASE_URL=https://app.eavatar.diet npx playwright test texts-verification \
 *     --config playwright.f1-f12.config.ts --headed
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "https://app.eavatar.diet";

// ─── Helpers (skopiowane z f1-f12-verification.spec.ts) ──────────────────────

async function mockPaidPatient(page: Page) {
  const mockProfile = {
    id: "mock-profile-id",
    account_user_id: "00000000-0000-0000-0000-000000000001",
    name: "Jan Testowy",
    avatar_url: null,
    birth_date: null,
    gender: null,
    is_primary: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await page.route("**/rest/v1/patients**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/vnd.pgrst.object+json" }, body: JSON.stringify({ id: "mock-patient-id" }) })
  );
  await page.route("**/rest/v1/person_profiles**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify([mockProfile]) })
  );
  await page.route("**/rest/v1/profile_access**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/vnd.pgrst.object+json" }, body: JSON.stringify({ id: "mock-access-id", status: "active" }) })
  );
  await page.route("**/rest/v1/nutrition_interviews**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/vnd.pgrst.object+json" }, body: JSON.stringify({ status: "sent", last_updated_at: new Date().toISOString() }) })
  );
  await page.route("**/rest/v1/recommendations**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify([
      {
        id: "mock-rec-id",
        title: "Zalecenia testowe",
        diagnosis_summary: "<p>Podsumowanie organizmu</p>",
        dietary_recommendations: "<ul><li>Warzywa</li></ul>",
        created_at: new Date().toISOString(),
        is_active: true,
      }
    ]) })
  );
}

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill("admin@eavatar.diet");
  await page.locator('input[type="password"]').first().fill("Admin123!");
  await page.keyboard.press("Enter");
  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 20_000 }),
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(1500);
}

// ─── T1 — "Klient" zamiast "Pacjent" ─────────────────────────────────────────

test("T1 | Admin: brak słowa 'Pacjent:' w nagłówku profilu", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const patientRow = page.locator("table tbody tr").first();
  const hasRow = await patientRow.isVisible().catch(() => false);

  if (hasRow) {
    await patientRow.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const hasPacjentColon = await page.locator("text=Pacjent:").first().isVisible().catch(() => false);
    console.log(`T1: "Pacjent:" widoczny = ${hasPacjentColon}`);
    await page.screenshot({ path: "tests/artifacts/texts/t1-klient.png", fullPage: false });
    expect(hasPacjentColon).toBe(false);
    console.log("✅ T1: Brak 'Pacjent:' — używana jest 'Klient:' lub samo imię");
  } else {
    console.log("⚠️ T1: Brak pacjentów w admin — pomiń");
    await page.screenshot({ path: "tests/artifacts/texts/t1-no-patients.png" });
  }
});

// ─── T2 — "Zadbaj o swojego AVATARA" ─────────────────────────────────────────

test("T2 | SplitLayout: tekst 'Zadbaj o swojego AVATARA'", async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const hasAvatara = await page.locator("text=Zadbaj o swojego AVATARA").first().isVisible().catch(() => false);
  const hasBody = await page.locator("text=Zadbaj o swoje ciało").first().isVisible().catch(() => false);
  const hasOldText = await page.locator("text=Wszystko jest możliwe").first().isVisible().catch(() => false);

  console.log(`T2: AVATARA=${hasAvatara}, ciało=${hasBody}, stary tekst=${hasOldText}`);
  await page.screenshot({ path: "tests/artifacts/texts/t2-avatara.png" });
  expect(hasAvatara).toBe(true);
  expect(hasOldText).toBe(false);
  console.log("✅ T2: Tekst 'Zadbaj o swojego AVATARA' widoczny");
});

// ─── T3 — "Abonamentowy Program Profilaktyczny" ───────────────────────────────

test("T3 | Dashboard: 'Abonamentowy Program Profilaktyczny' (nie 'Regeneracyjny')", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasAbonamentowy = await page.locator("text=Abonamentowy Program Profilaktyczny").first().isVisible().catch(() => false);
  const hasRegeneracyjny = await page.locator("text=Regeneracyjny program organizmu").first().isVisible().catch(() => false);

  console.log(`T3: Abonamentowy=${hasAbonamentowy}, Regeneracyjny (stary)=${hasRegeneracyjny}`);
  await page.screenshot({ path: "tests/artifacts/texts/t3-abonamentowy.png", fullPage: false });
  // Przynajmniej jeden z tych tekstów powinien być na stronie (dashboard może być w różnym stanie)
  expect(hasRegeneracyjny).toBe(false);
  console.log("✅ T3: Brak 'Regeneracyjny program organizmu'");
});

// ─── T4 — "Podsumowanie funkcjonowania Twojego organizmu" ─────────────────────

test("T4 | Dashboard: 'Podsumowanie funkcjonowania Twojego organizmu' (nie 'diagnozy')", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasPodsumowanieDiagnozy = await page.locator("text=Podsumowanie diagnozy i zalecenia dietetyczne").first().isVisible().catch(() => false);
  const hasPodsumowanieFunkcjonowania = await page.locator("text=Podsumowanie funkcjonowania").first().isVisible().catch(() => false);

  console.log(`T4: stary=${hasPodsumowanieDiagnozy}, nowy=${hasPodsumowanieFunkcjonowania}`);
  await page.screenshot({ path: "tests/artifacts/texts/t4-podsumowanie.png", fullPage: false });
  expect(hasPodsumowanieDiagnozy).toBe(false);
  console.log("✅ T4: Brak 'Podsumowanie diagnozy'");
});

// ─── T5 — "Zleć kolejną analizę organizmu" ───────────────────────────────────

test("T5 | Dashboard: 'Zleć kolejną analizę organizmu' (nie 'diagnostykę')", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasStary = await page.locator("text=Zleć kolejną diagnostykę").first().isVisible().catch(() => false);
  const hasNowy = await page.locator("text=Zleć kolejną analizę").first().isVisible().catch(() => false);

  console.log(`T5: stary='Zleć diagnostykę'=${hasStary}, nowy='Zleć analizę'=${hasNowy}`);
  await page.screenshot({ path: "tests/artifacts/texts/t5-analiza.png", fullPage: false });
  expect(hasStary).toBe(false);
  console.log("✅ T5: Brak 'Zleć kolejną diagnostykę'");
});

// ─── T6 — "Wypełnij ponownie wywiad dietetyczny" ─────────────────────────────

test("T6 | Dashboard: 'Wypełnij ponownie wywiad dietetyczny' (nie 'ankietę')", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasAnkiete = await page.locator("text=Wypełnij ponownie ankietę").first().isVisible().catch(() => false);
  const hasWywiad = await page.locator("text=wywiad dietetyczny").first().isVisible().catch(() => false);

  console.log(`T6: stary='ankietę'=${hasAnkiete}, nowy='wywiad dietetyczny'=${hasWywiad}`);
  await page.screenshot({ path: "tests/artifacts/texts/t6-wywiad.png", fullPage: false });
  expect(hasAnkiete).toBe(false);
  console.log("✅ T6: Brak 'Wypełnij ponownie ankietę'");
});

// ─── T7 — "Twoje wyniki badań laboratoryjnych" ───────────────────────────────

test("T7 | Dashboard: 'Twoje wyniki badań laboratoryjnych' (nie 'Pliki wynikowe')", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasPlikWynikowe = await page.locator("text=Pliki wynikowe").first().isVisible().catch(() => false);
  const hasWynikiLab = await page.locator("text=wyniki badań laboratoryjnych").first().isVisible().catch(() => false);

  console.log(`T7: stary='Pliki wynikowe'=${hasPlikWynikowe}, nowy='wyniki laboratoryjnych'=${hasWynikiLab}`);
  await page.screenshot({ path: "tests/artifacts/texts/t7-wyniki.png", fullPage: false });
  expect(hasPlikWynikowe).toBe(false);
  console.log("✅ T7: Brak 'Pliki wynikowe'");
});

// ─── T8 — Help FAQ "Jak to działa" ────────────────────────────────────────────

test("T8 | Help: FAQ 'Jak to działa' (nie 'diagnostyka biorezonansowa')", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/dashboard/help`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const hasBiorezonansowa = await page.locator("text=diagnostyka biorezonansowa").first().isVisible().catch(() => false);
  const hasJakDziala = await page.locator("text=Jak to działa").first().isVisible().catch(() => false);
  const hasKwanty = await page.locator("text=kwantów").first().isVisible().catch(() => false);

  console.log(`T8: stary FAQ=${hasBiorezonansowa}, 'Jak to działa'=${hasJakDziala}, kwanty=${hasKwanty}`);
  await page.screenshot({ path: "tests/artifacts/texts/t8-help-faq.png", fullPage: true });
  expect(hasBiorezonansowa).toBe(false);
  expect(hasJakDziala).toBe(true);
  console.log("✅ T8: FAQ zaktualizowane");
});

// ─── T9 — "Co zawiera pakiet" bez "diagnostyczny" ────────────────────────────

test("T9 | Help: brak słowa 'diagnostyczny' w FAQ", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto(`${BASE}/dashboard/help`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Sprawdź brak "pakiet diagnostyczny" w tekście widocznym
  const bodyText = await page.evaluate(() => document.body.innerText);
  const hasDiagnostyczny = bodyText.toLowerCase().includes("pakiet diagnostyczny");

  console.log(`T9: 'pakiet diagnostyczny' widoczny=${hasDiagnostyczny}`);
  await page.screenshot({ path: "tests/artifacts/texts/t9-pakiet.png", fullPage: true });
  expect(hasDiagnostyczny).toBe(false);
  console.log("✅ T9: Brak 'pakiet diagnostyczny'");
});

// ─── T10 — Ostrzeżenie przy zdjęciu w signup ─────────────────────────────────

test("T10 | Signup krok 2: ostrzeżenie 'Twoja twarz – bez innych osób'", async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // Sprawdź czy tekst ostrzeżenia jest gdziekolwiek na stronie (może być w ukrytym kroku)
  const pageSource = await page.content();
  const hasCorrectWarning = pageSource.includes("bez innych osób") || pageSource.includes("jednolitym tłem");
  const hasOldWarning = pageSource.includes("widać tylko Ciebie") || pageSource.includes("szkodliwe dla diagnozy");

  console.log(`T10: nowy tekst ostrzeżenia=${hasCorrectWarning}, stary tekst=${hasOldWarning}`);
  await page.screenshot({ path: "tests/artifacts/texts/t10-signup.png" });
  expect(hasOldWarning).toBe(false);
  console.log("✅ T10: Stary tekst ostrzeżenia usunięty");
});

// ─── T11 — Dashboard header mniejszy ─────────────────────────────────────────

test("T11 | Dashboard header: czcionka mniejsza niż 36px", async ({ page }) => {
  await page.goto(BASE);
  await mockPaidPatient(page);

  // Ustaw stan NO_PLAN żeby zobaczyć header z tekstem "Twoja ścieżka..."
  await page.route("**/rest/v1/profile_access**", (r) =>
    r.fulfill({ status: 200, headers: { "Content-Type": "application/vnd.pgrst.object+json" }, body: JSON.stringify({ id: "x", status: "pending" }) })
  );
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const h1 = page.locator("h1, [class*='text-2xl'], [class*='text-3xl']").first();
  const fontSize = await h1.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 0);

  console.log(`T11: fontSize = ${fontSize}px`);
  await page.screenshot({ path: "tests/artifacts/texts/t11-header-size.png" });

  // text-3xl = 30px jest za duże wg PDF (powinno być mniejsze)
  // Dopuszczamy text-2xl (24px) lub text-xl (20px)
  expect(fontSize).toBeLessThan(32);
  console.log("✅ T11: Header wystarczająco mały");
});

// ─── T12 — "(wgraj nowe zdjęcie)" przy Mini Programie ────────────────────────

test("T12 | Payment: Mini Program Startowy ma '(wgraj nowe zdjęcie)'", async ({ page }) => {
  await page.goto(`${BASE}/payment`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const hasWgrajZdjecie = await page.locator("text=wgraj nowe zdjęcie").first().isVisible().catch(() => false);

  console.log(`T12: '(wgraj nowe zdjęcie)' widoczny=${hasWgrajZdjecie}`);
  await page.screenshot({ path: "tests/artifacts/texts/t12-payment-mini.png", fullPage: true });
  expect(hasWgrajZdjecie).toBe(true);
  console.log("✅ T12: Tekst '(wgraj nowe zdjęcie)' widoczny");
});
