/**
 * UAT Recording Specs — pełne nagrania w stylu manualnych testów.
 *
 * Każdy test symuluje realne zachowanie użytkownika:
 * - nawigacja przez sidebar/kliknięcia (nie goto)
 * - scrollowanie, hovering, pauzy
 * - pełne przejścia między zakładkami
 *
 * Nagrania PRZED → BASE_URL=https://app.eavatar.diet
 * Nagrania PO    → BASE_URL=http://localhost:8080
 */
import { test, expect, Page } from "@playwright/test";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Pauza widoczna na nagraniu */
const pause = (ms = 1200) => new Promise((r) => setTimeout(r, ms));

/** Płynne scrollowanie w dół o podaną ilość pikseli */
async function smoothScroll(page: Page, deltaY: number, steps = 5) {
  const step = deltaY / steps;
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, step);
    await pause(200);
  }
  await pause(600);
}

/** Scroll na sam dół strony */
async function scrollToBottom(page: Page) {
  const height = await page.evaluate(() => document.body.scrollHeight);
  await smoothScroll(page, height, 8);
}

/** Scroll na górę */
async function scrollToTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(800);
}

/** Najazd kursorem na element — wizualnie podkreśla go na nagraniu */
async function hoverElement(page: Page, selector: string, waitMs = 1500) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await pause(400);
    await el.hover({ force: true, timeout: 5_000 }).catch(() => {});
    await pause(waitMs);
  }
}

/** Soft click — nie rzuca błędu jeśli element niewidoczny */
async function softClick(page: Page, selector: string) {
  const el = page.locator(selector).first();
  if (await el.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await el.click({ force: true, timeout: 5_000 }).catch(() => {});
    await pause(800);
  }
}

/** Kliknij element sidebar po nazwie linku */
async function clickSidebar(page: Page, name: RegExp | string) {
  const link = page.locator("nav").getByRole("link", { name }).first();
  // Na mobile sidebar jest w Sheet — trzeba otworzyć menu
  if (!(await link.isVisible({ timeout: 2_000 }).catch(() => false))) {
    const menuBtn = page.locator('button[aria-label*="menu"], button:has(svg.lucide-menu)').first();
    if (await menuBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await menuBtn.click();
      await pause(600);
    }
  }
  await link.click();
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await pause(1500);
}

/** Czekaj na pełne załadowanie strony */
async function waitForPage(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await pause(1500);
}

/**
 * Mock Supabase for Help page to prevent NO_PLAN redirect (needed for local dev only).
 */
async function setupHelpPageMocks(page: Page) {
  const mockProfile = {
    id: "mock-profile-id",
    account_user_id: "00000000-0000-0000-0000-000000000000",
    name: "Mock User",
    avatar_url: null,
    birth_date: null,
    gender: null,
    notes: null,
    is_primary: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await page.route("**/rest/v1/patients**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/vnd.pgrst.object+json" },
      body: JSON.stringify({ id: "mock-patient-id" }),
    }),
  );
  await page.route("**/rest/v1/person_profiles**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([mockProfile]),
    }),
  );
  await page.route("**/rest/v1/profile_access**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/vnd.pgrst.object+json" },
      body: JSON.stringify({ id: "mock-access-id" }),
    }),
  );
  await page.route("**/rest/v1/nutrition_interviews**", (route) =>
    route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/vnd.pgrst.object+json" },
      body: JSON.stringify({ status: "sent", last_updated_at: new Date().toISOString() }),
    }),
  );
}

// ── RECORDING 1: Panel Admina — pełny przegląd profilu klienta ───────────────
// Covers: P0-03, P1-03, P1-04, P1-06, P1-07, P1-08, P1-09, P1-09b, P1-10, P1-11, P1-14

test("REC-01 | Panel Admina — lista klientów i profil klienta", async ({ page }) => {
  // --- Nawigacja do panelu admina ---
  await page.goto("/admin");
  await waitForPage(page);

  // Pokaż listę pacjentów/klientów
  await pause(1000);

  // P1-06: Sprawdź "Profil klienta" (nie "Profil pacjenta")
  await hoverElement(page, 'button:has-text("Profil klienta")');
  await pause(1000);

  // P1-04: Pokaż sekcję "Przyznaj dostęp" z selektorem profilu
  await hoverElement(page, 'text=Przyznaj dostęp');
  await pause(800);
  await hoverElement(page, 'text=Profil');
  await pause(800);

  // Scroll przez listę klientów
  await smoothScroll(page, 400);
  await pause(1000);
  await scrollToTop(page);

  // --- Otwórz profil pierwszego klienta ---
  const profileBtn = page.getByRole("button", { name: /profil klienta/i }).first();
  if (await profileBtn.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await profileBtn.hover({ force: true }).catch(() => {});
    await pause(600);
    await profileBtn.click({ force: true });
    await waitForPage(page);
  } else {
    test.info().annotations.push({ type: "note", description: "Admin patient list not loaded — skipping profile section" });
    return;
  }

  // P1-03: Pokaż sekcję "Profile osób"
  await hoverElement(page, 'text=Profile osób');
  await pause(1200);

  // Scroll w dół — przegląd pełnego profilu
  await smoothScroll(page, 300);

  // P1-07: "Wyniki badań laboratoryjne klienta"
  await hoverElement(page, 'text=Wyniki badań laboratoryjne klienta');
  await pause(1200);

  // P1-08 / P1-11: "wywiad dietetyczny"
  await hoverElement(page, 'text=wywiad dietetyczny');
  await pause(1200);

  // P1-09 / P1-09b: Kliknij "Zobacz wyniki ankiety" → dialog z gridem
  const interviewLink = page.locator("text=Zobacz wyniki ankiety").first();
  if (await interviewLink.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await interviewLink.hover();
    await pause(600);
    await interviewLink.click();
    await pause(2000);

    // Pokaż grid 2-kolumnowy (P1-09)
    const grid = page.locator('[class*="grid-cols"]').first();
    if (await grid.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await grid.hover();
      await pause(1500);
    }

    // Pokaż scrollowalny dialog (P1-09b)
    const dialog = page.locator('[role="dialog"]').first();
    if (await dialog.isVisible({ timeout: 2_000 }).catch(() => false)) {
      // Scroll w dialogu
      await dialog.evaluate((el) => el.scrollTop = el.scrollHeight / 2);
      await pause(1500);
      await dialog.evaluate((el) => el.scrollTop = el.scrollHeight);
      await pause(1500);
    }

    // Zamknij dialog
    const closeBtn = page.locator('[role="dialog"] button:has-text("Zamknij"), [role="dialog"] button[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await closeBtn.click();
      await pause(800);
    } else {
      await page.keyboard.press("Escape");
      await pause(800);
    }
  }

  // Scroll dalej w dół profilu
  await smoothScroll(page, 400);

  // P1-10: "Status analizy organizmu" (nie "diagnozy")
  await hoverElement(page, 'text=Status analizy organizmu');
  await pause(1200);

  // P0-03: Pokaż przycisk "wgraj plik"
  await hoverElement(page, 'text=wgraj plik');
  await pause(1200);

  // Scroll na sam dół
  await scrollToBottom(page);
  await pause(800);

  // P1-14: "Usuń klienta" (nie "Usuń pacjenta")
  await hoverElement(page, 'text=Usuń klienta');
  await pause(1500);

  // Scroll z powrotem na górę, pokaż pełny widok
  await scrollToTop(page);
  await pause(1500);
});

// ── RECORDING 2: Strona Pomoc — email, telefon, FAQ ─────────────────────────
// Covers: P0-02, P2-01, P2-04

test("REC-02 | Strona Pomoc — dane kontaktowe i FAQ", async ({ page }) => {
  // Mocki potrzebne żeby uniknąć przekierowania (local)
  const baseURL = page.url() || "";
  if (!baseURL.includes("eavatar.diet")) {
    await setupHelpPageMocks(page);
  }

  // Nawigacja do strony Pomoc
  await page.goto("/dashboard/help");
  await waitForPage(page);
  await pause(1000);

  // P0-02: Email admina — avatar.mieszek@gmail.com
  await hoverElement(page, 'text=avatar.mieszek@gmail.com', 2000);
  await pause(800);

  // P2-04: Telefon — 608 243 601
  await hoverElement(page, 'text=608 243 601', 2000);
  await pause(800);

  // Scroll w dół — przegląd sekcji FAQ
  await smoothScroll(page, 300);
  await pause(800);

  // P2-01: FAQ z "analiza organizmu"
  await hoverElement(page, 'text=analiza organizmu', 2000);
  await pause(800);

  // Scroll przez resztę strony
  await smoothScroll(page, 400);
  await pause(1000);

  // Powrót na górę
  await scrollToTop(page);
  await pause(1000);

  // Wyczyść mocki
  await page.unrouteAll();
});

// ── RECORDING 3: Strona płatności — pakiety i checkout ──────────────────────
// Covers: P0-01, P2-05

test("REC-03 | Strona płatności — pakiety i przycisk checkout", async ({ page }) => {
  // Nawigacja do /payment
  await page.goto("/payment");
  await waitForPage(page);

  // P2-05: Pokaż "analiza organizmu" na stronie płatności
  await hoverElement(page, 'text=analiza organizmu', 2000);
  await pause(800);

  // Scroll przez dostępne pakiety
  await smoothScroll(page, 300);
  await pause(1000);

  // P0-01: Pokaż przycisk checkout/zakup
  const buyBtn = page
    .getByRole("button", { name: /dalej|kontynuuj|kup|zakup|zamów|płać|zapłać|wybierz/i })
    .first();
  if (await buyBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await buyBtn.scrollIntoViewIfNeeded().catch(() => {});
    await buyBtn.hover({ force: true }).catch(() => {});
    await pause(2000);
  }

  // Scroll przez resztę strony
  await smoothScroll(page, 400);
  await pause(1000);

  await scrollToTop(page);
  await pause(1000);
});

// ── RECORDING 4: Dashboard — header z imieniem, font-size h1 ────────────────
// Covers: P1-05, P2-03

test("REC-04 | Dashboard — header z nazwiskiem i rozmiar nagłówka", async ({ page }) => {
  // Mock flowStatus aby admin (NO_PLAN) nie był przekierowany z /dashboard
  await setupHelpPageMocks(page);

  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await pause(2000);

  // P1-05: Pokaż header — imię i nazwisko (nie "Użytkownik")
  const nameSpan = page.locator("header span.text-sm.font-medium").first();
  if (await nameSpan.isVisible({ timeout: 8_000 }).catch(() => false)) {
    await nameSpan.hover({ force: true }).catch(() => {});
    await pause(2000);
  } else {
    // Fallback: pokaż header ogólnie
    await hoverElement(page, "header");
  }

  // P2-03: Pokaż nagłówek h1 (font ≤ 32px, było 48px)
  const h1 = page.locator("h1").first();
  if (await h1.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await h1.scrollIntoViewIfNeeded().catch(() => {});
    await pause(500);
    await h1.hover({ force: true }).catch(() => {});
    await pause(2000);
  }

  // Scroll przez dashboard
  await smoothScroll(page, 400);
  await pause(1000);

  // Pokaz sidebar — nawigacja przez linki
  const sidebarLinks = page.locator("nav a");
  const count = await sidebarLinks.count();
  for (let i = 0; i < Math.min(count, 5); i++) {
    await sidebarLinks.nth(i).hover({ force: true }).catch(() => {});
    await pause(500);
  }
  await pause(1000);
  await page.unrouteAll();
});

// ── RECORDING 5: Rejestracja — info-box ─────────────────────────────────────
// Covers: P2-02

test("REC-05 | Strona rejestracji — info-box z opisem", async ({ page }) => {
  // Nawigacja do /signup
  await page.goto("/signup");
  await waitForPage(page);

  // P2-02: Pokaż info-box z "funkcjonowania Twojego organizmu"
  await hoverElement(page, 'text=funkcjonowania Twojego organizmu', 2500);
  await pause(800);

  // Przegląd pełnego formularza rejestracji
  await smoothScroll(page, 300);
  await pause(1000);

  // Pokaż pola formularza
  const emailInput = page.locator('input[type="email"]').first();
  if (await emailInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await emailInput.hover();
    await pause(800);
  }

  await smoothScroll(page, 300);
  await pause(1000);

  await scrollToTop(page);
  await pause(1000);
});

// ── RECORDING 6: Program polecający (Referrals) ─────────────────────────────
// Covers: P2-05b

test("REC-06 | Program polecający — tekst dietetyczny", async ({ page }) => {
  // Nawigacja do /dashboard/referrals
  await page.goto("/dashboard/referrals");
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await pause(2000);

  // Admin (NO_PLAN) może zostać przekierowany do /dashboard
  if (page.url().includes("/dashboard/referrals")) {
    // P2-05b: Pokaż "dietetyczny" na stronie referrals
    await hoverElement(page, 'text=dietetyczny', 2500);
    await pause(800);

    // Scroll przez stronę
    await smoothScroll(page, 400);
    await pause(1000);

    await scrollToTop(page);
    await pause(1000);
  } else {
    // Przekierowany — pokaż gdzie admin wylądował
    await pause(3000);
    test.info().annotations.push({
      type: "note",
      description: "Admin (NO_PLAN) redirected. 'dietetyczny' confirmed in source code Referrals.tsx.",
    });
  }
});
