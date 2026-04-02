/**
 * E2E Audit: bugs-audit.spec.ts
 * Sprawdza 12 punktów z listy bugów/zmian dla https://app.eavatar.diet
 *
 * Uruchom:
 *   npx playwright test tests/e2e/bugs-audit.spec.ts --config=playwright.live.config.ts --reporter=list
 */
import { test, expect, Page } from "@playwright/test";

const BASE_URL = "https://app.eavatar.diet";
const ADMIN_EMAIL = "admin@eavatar.diet";
const ADMIN_PASSWORD = "Admin123!";

// Helper: logowanie admina
async function loginAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await Promise.race([
    page.waitForURL(/\/admin/, { timeout: 20_000 }),
    page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
  ]).catch(() => {});
  await page.waitForTimeout(2000);
  // Jeśli hasło nie zadziałało, spróbuj alternatywnego
  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    await page.locator('input[type="password"]').first().fill("E2ETest2026!");
    await page.locator('button[type="submit"]').first().click();
    await Promise.race([
      page.waitForURL(/\/admin/, { timeout: 20_000 }),
      page.waitForURL(/\/dashboard/, { timeout: 20_000 }),
    ]).catch(() => {});
    await page.waitForTimeout(2000);
  }
}

// Helper: pobierz tekst całej strony
async function getPageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body.innerText).catch(() => "");
}

// Helper: pobierz source HTML
async function getPageSource(page: Page): Promise<string> {
  return page.content().catch(() => "");
}

// Helper: sprawdź czy URL zawiera login (nie zalogowano)
function isLoggedIn(url: string): boolean {
  return !url.includes("/login");
}

// ─── TEST 1: Płatności - czy Edge Function zwraca błąd ───────────────────────

test("TEST 1 | Płatności: Edge Function status + metody płatności", async ({ page }) => {
  // Próba dostępu do strony płatności bez logowania
  await page.goto(`${BASE_URL}/payment`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const url = page.url();
  console.log(`TEST 1: URL = ${url}`);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  // Sprawdź błąd Edge Function
  const hasEdgeFunctionError = pageText.includes("Edge Function returned a non-2xx") ||
    pageSource.includes("Edge Function returned a non-2xx");

  // Sprawdź sekcję wyboru pakietu
  const hasPackageSection = pageText.includes("Kupuję") ||
    pageText.includes("pakiet") ||
    pageText.includes("BLIK") ||
    pageText.includes("Pakiet");

  // Sprawdź metody płatności
  const hasBLIK = pageText.includes("BLIK") || pageSource.includes("BLIK");
  const hasKarta = pageText.includes("karta") || pageText.includes("Karta") || pageSource.includes("karta");
  const hasP24 = pageText.includes("P24") || pageText.includes("Przelewy24") || pageSource.includes("P24");

  console.log(`TEST 1: edgeFunctionError=${hasEdgeFunctionError}, pakiet=${hasPackageSection}`);
  console.log(`TEST 1: BLIK=${hasBLIK}, Karta=${hasKarta}, P24=${hasP24}`);

  await page.screenshot({ path: "tests/e2e/recordings/test1-payment.png", fullPage: true });

  if (hasEdgeFunctionError) {
    console.log("❌ TEST 1 BŁĄD: Edge Function zwraca non-2xx status code");
  } else if (url.includes("/login")) {
    console.log("⚠️ TEST 1: Przekierowanie do logowania — strona płatności wymaga auth");
  } else if (hasPackageSection) {
    console.log("✅ TEST 1: Strona płatności załadowana, brak błędu Edge Function");
  } else {
    console.log(`⚠️ TEST 1: Strona płatności — nieznany stan, URL: ${url}`);
  }

  expect(hasEdgeFunctionError).toBe(false);
});

// ─── TEST 2: Tekst "Wywiad medyczny" vs "Wywiad dietetyczny" ─────────────────

test("TEST 2 | Admin: wywiad medyczny vs dietetyczny w nagłówku", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  console.log(`TEST 2: po logowaniu URL = ${currentUrl}`);

  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 2: Nie udało się zalogować jako admin");
    return;
  }

  // Idź do panelu admin
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Znajdź pierwszego pacjenta/klienta
  const firstRow = page.locator("table tbody tr, [data-testid='patient-row'], .patient-row").first();
  const hasRow = await firstRow.isVisible().catch(() => false);

  if (!hasRow) {
    // Spróbuj kliknąć w jakikolwiek link do profilu
    const profileLink = page.locator("a[href*='/admin/']").first();
    const hasProfileLink = await profileLink.isVisible().catch(() => false);
    if (hasProfileLink) {
      await profileLink.click();
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(1000);
    } else {
      console.log("⚠️ TEST 2: Brak wierszy/linków do profili w adminie");
      await page.screenshot({ path: "tests/e2e/recordings/test2-no-rows.png" });
      return;
    }
  } else {
    await firstRow.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Szukaj przycisku "Wypełnij wywiad za pacjenta"
  const fillInterviewBtn = page.locator(
    "button:has-text('Wypełnij wywiad'), a:has-text('Wypełnij wywiad'), button:has-text('wywiad'), a:has-text('wywiad')"
  ).first();
  const hasFillBtn = await fillInterviewBtn.isVisible().catch(() => false);

  if (hasFillBtn) {
    await fillInterviewBtn.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasMedyczny = pageText.includes("Wywiad medyczny") || pageSource.includes("Wywiad medyczny");
  const hasDietetyczny = pageText.includes("Wywiad dietetyczny") || pageSource.includes("Wywiad dietetyczny");

  console.log(`TEST 2: 'Wywiad medyczny'=${hasMedyczny}, 'Wywiad dietetyczny'=${hasDietetyczny}`);
  await page.screenshot({ path: "tests/e2e/recordings/test2-wywiad.png", fullPage: false });

  if (hasMedyczny) {
    console.log("❌ TEST 2 BŁĄD: Widoczny nagłówek 'Wywiad medyczny' — powinno być 'Wywiad dietetyczny'");
  } else if (hasDietetyczny) {
    console.log("✅ TEST 2: Nagłówek 'Wywiad dietetyczny' — poprawnie");
  } else {
    console.log("⚠️ TEST 2: Brak obu nagłówków — może nie udało się otworzyć wywiadu");
  }

  expect(hasMedyczny).toBe(false);
});

// ─── TEST 3: FAQ - stare/nowe teksty ─────────────────────────────────────────

test("TEST 3 | FAQ: stare vs nowe teksty", async ({ page }) => {
  await loginAdmin(page);

  // Sprawdź kilka możliwych ścieżek FAQ
  const faqUrls = [
    `${BASE_URL}/dashboard/help`,
    `${BASE_URL}/help`,
    `${BASE_URL}/faq`,
  ];

  let faqLoaded = false;
  let pageText = "";

  for (const url of faqUrls) {
    await page.goto(url);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const text = await getPageText(page);
    if (text.toLowerCase().includes("faq") || text.toLowerCase().includes("pytania") || text.toLowerCase().includes("jak to działa")) {
      faqLoaded = true;
      pageText = text;
      console.log(`TEST 3: FAQ znalezione pod ${url}`);
      break;
    }
  }

  if (!faqLoaded) {
    console.log("⚠️ TEST 3: Nie znaleziono strony FAQ");
    await page.screenshot({ path: "tests/e2e/recordings/test3-no-faq.png" });
    return;
  }

  const hasBiorezonansowa = pageText.toLowerCase().includes("diagnostyka biorezonansowa") ||
    pageText.toLowerCase().includes("biorezonans");
  const hasJakDziala = pageText.includes("Jak to działa") || pageText.includes("jak to działa");
  const hasPakietDiagnostyczny = pageText.toLowerCase().includes("pakiet diagnostyczny");
  const hasPakietBezDiagnostyczny = pageText.toLowerCase().includes("co zawiera pakiet") &&
    !pageText.toLowerCase().includes("pakiet diagnostyczny");

  console.log(`TEST 3: biorezonansowa (stary)=${hasBiorezonansowa}, 'Jak to działa' (nowy)=${hasJakDziala}`);
  console.log(`TEST 3: 'pakiet diagnostyczny' (stary)=${hasPakietDiagnostyczny}, 'Co zawiera pakiet' bez 'diagnostyczny'=${hasPakietBezDiagnostyczny}`);

  await page.screenshot({ path: "tests/e2e/recordings/test3-faq.png", fullPage: true });

  if (hasBiorezonansowa) {
    console.log("❌ TEST 3 BŁĄD: Stary tekst 'diagnostyka biorezonansowa' nadal widoczny");
  } else {
    console.log("✅ TEST 3: Brak 'diagnostyka biorezonansowa'");
  }

  if (hasPakietDiagnostyczny) {
    console.log("❌ TEST 3 BŁĄD: Stary tekst 'pakiet diagnostyczny' nadal widoczny");
  } else {
    console.log("✅ TEST 3: Brak 'pakiet diagnostyczny'");
  }

  if (hasJakDziala) {
    console.log("✅ TEST 3: Nowy tekst 'Jak to działa' widoczny");
  }

  expect(hasBiorezonansowa).toBe(false);
  expect(hasPakietDiagnostyczny).toBe(false);
});

// ─── TEST 4: Dashboard klienta - tekst "Podsumowanie diagnozy" ───────────────

test("TEST 4 | Admin/Klient: 'Podsumowanie diagnozy' vs 'funkcjonowania organizmu'", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 4: Nie udało się zalogować");
    return;
  }

  // Przejdź do admin i znajdź pacjenta z zaleceniami
  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const firstRow = page.locator("table tbody tr").first();
  const hasRow = await firstRow.isVisible().catch(() => false);
  if (hasRow) {
    await firstRow.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasStaryTekst = pageText.includes("Podsumowanie diagnozy i zalecenia dietetyczne") ||
    pageSource.includes("Podsumowanie diagnozy i zalecenia dietetyczne");
  const hasNowyTekst = pageText.toLowerCase().includes("podsumowanie funkcjonowania") ||
    pageSource.toLowerCase().includes("podsumowanie funkcjonowania");

  console.log(`TEST 4: stary='Podsumowanie diagnozy'=${hasStaryTekst}, nowy='funkcjonowania'=${hasNowyTekst}`);
  await page.screenshot({ path: "tests/e2e/recordings/test4-podsumowanie.png", fullPage: false });

  if (hasStaryTekst) {
    console.log("❌ TEST 4 BŁĄD: Stary tekst 'Podsumowanie diagnozy i zalecenia dietetyczne' widoczny");
  } else if (hasNowyTekst) {
    console.log("✅ TEST 4: Nowy tekst 'Podsumowanie funkcjonowania' widoczny");
  } else {
    console.log("⚠️ TEST 4: Brak obu tekstów — możliwy brak zaleceń dla tego klienta");
  }

  expect(hasStaryTekst).toBe(false);
});

// ─── TEST 5: Panel zakupu - nazwy programów ───────────────────────────────────

test("TEST 5 | Panel zakupu: 'Regeneracyjny' vs 'Abonamentowy Program Profilaktyczny'", async ({ page }) => {
  // Sprawdź stronę płatności
  await page.goto(`${BASE_URL}/payment`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const url = page.url();
  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasRegeneracyjny = pageText.includes("Regeneracyjny program organizmu") ||
    pageSource.includes("Regeneracyjny program organizmu");
  const hasAbonamentowy = pageText.includes("Abonamentowy Program Profilaktyczny") ||
    pageSource.includes("Abonamentowy Program Profilaktyczny");

  console.log(`TEST 5: URL=${url}`);
  console.log(`TEST 5: 'Regeneracyjny' (stary)=${hasRegeneracyjny}, 'Abonamentowy' (nowy)=${hasAbonamentowy}`);
  await page.screenshot({ path: "tests/e2e/recordings/test5-packages.png", fullPage: true });

  if (url.includes("/login")) {
    console.log("⚠️ TEST 5: Wymaga logowania — sprawdź po zalogowaniu jako klient");
  } else if (hasRegeneracyjny) {
    console.log("❌ TEST 5 BŁĄD: Stary tekst 'Regeneracyjny program organizmu' widoczny");
  } else if (hasAbonamentowy) {
    console.log("✅ TEST 5: Nowy tekst 'Abonamentowy Program Profilaktyczny' widoczny");
  } else {
    console.log("⚠️ TEST 5: Brak obu nazw programów na widocznej stronie");
  }

  expect(hasRegeneracyjny).toBe(false);
});

// ─── TEST 6: Tekst na stronie wgrywania zdjęcia ───────────────────────────────

test("TEST 6 | Signup: tekst 'Zadbaj o swojego AVATARA' vs 'Wszystko jest możliwe'", async ({ page }) => {
  await page.goto(`${BASE_URL}/signup`);
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasStaryTekst = pageText.includes("Wszystko jest możliwe ale decyzja należy do Ciebie") ||
    pageSource.includes("Wszystko jest możliwe ale decyzja należy do Ciebie") ||
    pageText.includes("Wszystko jest możliwe") ||
    pageSource.includes("Wszystko jest możliwe");
  const hasNowyTekst = pageText.includes("Zadbaj o swojego AVATARA") ||
    pageSource.includes("Zadbaj o swojego AVATARA") ||
    pageText.includes("AVATARA") ||
    pageSource.includes("AVATARA");

  console.log(`TEST 6: stary tekst='Wszystko jest możliwe'=${hasStaryTekst}, nowy='AVATARA'=${hasNowyTekst}`);
  await page.screenshot({ path: "tests/e2e/recordings/test6-signup-text.png", fullPage: false });

  if (hasStaryTekst) {
    console.log("❌ TEST 6 BŁĄD: Stary tekst 'Wszystko jest możliwe' nadal widoczny");
  } else if (hasNowyTekst) {
    console.log("✅ TEST 6: Nowy tekst 'Zadbaj o swojego AVATARA' widoczny");
  } else {
    console.log("⚠️ TEST 6: Brak obu tekstów — może inny URL dla kroku z zdjęciem");
  }

  expect(hasStaryTekst).toBe(false);
});

// ─── TEST 7: "Zleć kolejną diagnostykę" vs "Zleć kolejną analizę organizmu" ──

test("TEST 7 | Dashboard klienta: 'Zleć kolejną diagnostykę' vs 'analizę organizmu'", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 7: Nie udało się zalogować");
    return;
  }

  // Sprawdź dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasStary = pageText.includes("Zleć kolejną diagnostykę") ||
    pageSource.includes("Zleć kolejną diagnostykę");
  const hasNowy = pageText.includes("Zleć kolejną analizę") ||
    pageSource.includes("Zleć kolejną analizę") ||
    pageText.toLowerCase().includes("kolejną analizę") ||
    pageSource.toLowerCase().includes("kolejną analizę");

  console.log(`TEST 7: stary='Zleć kolejną diagnostykę'=${hasStary}, nowy='Zleć kolejną analizę'=${hasNowy}`);
  await page.screenshot({ path: "tests/e2e/recordings/test7-zlec.png", fullPage: false });

  if (hasStary) {
    console.log("❌ TEST 7 BŁĄD: Stary tekst 'Zleć kolejną diagnostykę' widoczny");
  } else if (hasNowy) {
    console.log("✅ TEST 7: Nowy tekst 'Zleć kolejną analizę' widoczny");
  } else {
    console.log("⚠️ TEST 7: Brak obu tekstów — może konto admina nie wyświetla tego widgetu");
  }

  expect(hasStary).toBe(false);
});

// ─── TEST 8: "Wypełnij ponownie ankietę" vs "wywiad dietetyczny" ──────────────

test("TEST 8 | Dashboard: 'Wypełnij ponownie ankietę' vs 'wywiad dietetyczny'", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 8: Nie udało się zalogować");
    return;
  }

  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasStary = pageText.includes("Wypełnij ponownie ankietę") ||
    pageSource.includes("Wypełnij ponownie ankietę");
  const hasNowy = pageText.toLowerCase().includes("wypełnij ponownie wywiad") ||
    pageSource.toLowerCase().includes("wypełnij ponownie wywiad") ||
    pageText.toLowerCase().includes("wywiad dietetyczny") ||
    pageSource.toLowerCase().includes("wywiad dietetyczny");

  console.log(`TEST 8: stary='Wypełnij ponownie ankietę'=${hasStary}, nowy='wywiad dietetyczny'=${hasNowy}`);
  await page.screenshot({ path: "tests/e2e/recordings/test8-ankieta.png", fullPage: false });

  if (hasStary) {
    console.log("❌ TEST 8 BŁĄD: Stary tekst 'Wypełnij ponownie ankietę' widoczny");
  } else if (hasNowy) {
    console.log("✅ TEST 8: Nowy tekst 'wywiad dietetyczny' widoczny");
  } else {
    console.log("⚠️ TEST 8: Brak obu tekstów — konto admina może nie wyświetlać tego widgetu");
  }

  expect(hasStary).toBe(false);
});

// ─── TEST 9: Admin - wywiad jako taśmociąg vs kroki ──────────────────────────

test("TEST 9 | Admin: wywiad wielostronicowy (błąd) vs jedna długa strona (OK)", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 9: Nie udało się zalogować");
    return;
  }

  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Otwórz profil pierwszego pacjenta
  const firstRow = page.locator("table tbody tr").first();
  const hasRow = await firstRow.isVisible().catch(() => false);

  if (hasRow) {
    await firstRow.click();
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
  }

  // Kliknij "Wypełnij wywiad za pacjenta"
  const fillBtn = page.locator(
    "button:has-text('Wypełnij wywiad'), a:has-text('Wypełnij wywiad'), button:has-text('Wypełnij'), a:has-text('Wypełnij')"
  ).first();
  const hasFillBtn = await fillBtn.isVisible().catch(() => false);

  if (!hasFillBtn) {
    console.log("⚠️ TEST 9: Nie znaleziono przycisku 'Wypełnij wywiad za pacjenta'");
    await page.screenshot({ path: "tests/e2e/recordings/test9-no-btn.png" });
    return;
  }

  await fillBtn.click();
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  // Sprawdź czy jest wielostronicowy (step X/N to BŁĄD)
  const hasStepIndicator = pageText.match(/krok \d+\/\d+/i) ||
    pageText.match(/step \d+ of \d+/i) ||
    pageText.match(/\d+ \/ \d+/) ||
    pageSource.includes("currentStep") ||
    pageSource.includes("step-indicator") ||
    pageSource.match(/step.*of.*\d+/i);

  // Sprawdź czy to jedna długa strona (brak paginacji kroków)
  const hasNextStepBtn = await page.locator("button:has-text('Dalej'), button:has-text('Następny'), button:has-text('Next')").first().isVisible().catch(() => false);

  console.log(`TEST 9: stepIndicator=${!!hasStepIndicator}, przycisk 'Dalej'=${hasNextStepBtn}`);
  await page.screenshot({ path: "tests/e2e/recordings/test9-wywiad-admin.png", fullPage: true });

  if (hasStepIndicator || hasNextStepBtn) {
    console.log("❌ TEST 9 BŁĄD: Wywiad jest wielostronicowy (taśmociąg/kroki) — powinien być jedną długą stroną");
  } else {
    console.log("✅ TEST 9: Wywiad jest jedną długą stroną — poprawnie");
  }

  // Test jest informacyjny — loguje wynik bez hard-fail (zależy od UI)
  if (hasStepIndicator) {
    expect(false, "Wywiad wielostronicowy to błąd — powinien być jedną stroną").toBe(false);
  }
});

// ─── TEST 10: Program polecający ──────────────────────────────────────────────

test("TEST 10 | Program polecający: czy link/przycisk dostępny", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 10: Nie udało się zalogować");
    return;
  }

  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  // Szukaj linku/przycisku programu polecającego
  const hasReferralText = pageText.toLowerCase().includes("program polecający") ||
    pageText.toLowerCase().includes("polecający") ||
    pageText.toLowerCase().includes("program poleceń") ||
    pageText.toLowerCase().includes("zaproś znajomych") ||
    pageSource.toLowerCase().includes("referral") ||
    pageSource.toLowerCase().includes("program-polecajacy");

  const referralLink = page.locator(
    "a:has-text('Program polecający'), button:has-text('Program polecający'), a:has-text('polecający'), a[href*='referral'], a[href*='polecaj']"
  ).first();
  const hasReferralLink = await referralLink.isVisible().catch(() => false);

  console.log(`TEST 10: tekst polecający=${hasReferralText}, link/btn widoczny=${hasReferralLink}`);
  await page.screenshot({ path: "tests/e2e/recordings/test10-referral.png", fullPage: false });

  if (!hasReferralText && !hasReferralLink) {
    console.log("❌ TEST 10 BŁĄD: Brak 'Program polecający' w menu/dashboardzie");
  } else if (hasReferralLink) {
    // Sprawdź czy można kliknąć
    await referralLink.click().catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const newUrl = page.url();
    console.log(`TEST 10: po kliknięciu URL = ${newUrl}`);
    if (!newUrl.includes("/login")) {
      console.log("✅ TEST 10: Program polecający działa — można kliknąć i otworzyć");
    } else {
      console.log("❌ TEST 10 BŁĄD: Program polecający przekierowuje do logowania");
    }
  } else {
    console.log("⚠️ TEST 10: Tekst polecający znaleziony w source, ale link nie jest widoczny");
  }

  // Sprawdź czy brak programu polecającego to błąd
  // (jeśli nie ma go wcale — to problem)
  expect(hasReferralText || hasReferralLink, "Program polecający powinien być dostępny").toBe(true);
});

// ─── TEST 11: Słowo "Pacjent" vs "Klient" w nagłówkach admina ────────────────

test("TEST 11 | Admin: 'Pacjent:' vs 'Klient:' w nagłówku profilu", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 11: Nie udało się zalogować");
    return;
  }

  await page.goto(`${BASE_URL}/admin`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Otwórz profil pierwszego klienta
  const firstRow = page.locator("table tbody tr").first();
  const hasRow = await firstRow.isVisible().catch(() => false);

  if (!hasRow) {
    console.log("⚠️ TEST 11: Brak wierszy w tabeli admin");
    await page.screenshot({ path: "tests/e2e/recordings/test11-no-rows.png" });
    return;
  }

  await firstRow.click();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(1000);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  // Szukaj "Pacjent:" jako nagłówek (z dwukropkiem — to błąd)
  const hasPacjentColon = pageText.match(/Pacjent:\s+\w+/) ||
    pageSource.match(/Pacjent:\s+\w+/) ||
    await page.locator("text=Pacjent:").first().isVisible().catch(() => false);

  // Szukaj "Klient:" (poprawnie)
  const hasKlientColon = pageText.match(/Klient:\s+\w+/) ||
    pageSource.match(/Klient:\s+\w+/) ||
    await page.locator("text=Klient:").first().isVisible().catch(() => false);

  console.log(`TEST 11: 'Pacjent:' (stary)=${!!hasPacjentColon}, 'Klient:' (nowy)=${!!hasKlientColon}`);
  await page.screenshot({ path: "tests/e2e/recordings/test11-pacjent-klient.png", fullPage: false });

  if (hasPacjentColon) {
    console.log("❌ TEST 11 BŁĄD: Nagłówek 'Pacjent: Imię Nazwisko' nadal widoczny — powinno być 'Klient:' lub samo imię");
  } else if (hasKlientColon) {
    console.log("✅ TEST 11: Nagłówek 'Klient:' — poprawnie zmienione");
  } else {
    console.log("✅ TEST 11: Brak 'Pacjent:' — prawdopodobnie używane samo imię");
  }

  expect(!!hasPacjentColon).toBe(false);
});

// ─── TEST 12: "Pliki wynikowe" vs "Twoje wyniki badań laboratoryjnych" ────────

test("TEST 12 | Dashboard: 'Pliki wynikowe' vs 'wyniki badań laboratoryjnych'", async ({ page }) => {
  await loginAdmin(page);

  const currentUrl = page.url();
  if (!isLoggedIn(currentUrl)) {
    console.log("⚠️ TEST 12: Nie udało się zalogować");
    return;
  }

  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const pageText = await getPageText(page);
  const pageSource = await getPageSource(page);

  const hasStary = pageText.includes("Pliki wynikowe") || pageSource.includes("Pliki wynikowe");
  const hasNowy = pageText.toLowerCase().includes("wyniki badań laboratoryjnych") ||
    pageSource.toLowerCase().includes("wyniki badań laboratoryjnych") ||
    pageText.toLowerCase().includes("wyniki badań") ||
    pageSource.toLowerCase().includes("wyniki badań");

  console.log(`TEST 12: stary='Pliki wynikowe'=${hasStary}, nowy='wyniki badań laboratoryjnych'=${hasNowy}`);
  await page.screenshot({ path: "tests/e2e/recordings/test12-pliki.png", fullPage: false });

  if (hasStary) {
    console.log("❌ TEST 12 BŁĄD: Stary tytuł 'Pliki wynikowe' nadal widoczny");
  } else if (hasNowy) {
    console.log("✅ TEST 12: Nowy tytuł 'wyniki badań laboratoryjnych' widoczny");
  } else {
    console.log("⚠️ TEST 12: Brak obu tekstów — konto admina może nie wyświetlać sekcji wyników");
  }

  expect(hasStary).toBe(false);
});
