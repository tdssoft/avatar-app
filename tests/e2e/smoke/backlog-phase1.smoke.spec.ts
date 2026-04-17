/**
 * SMOKE TESTS – backlog phase 1
 * Każdy test = nagranie jak manualny tester sprawdza konkretną zmianę.
 * Highlight pulsuje wokół testowanego elementu, kursor porusza się naturalnie.
 *
 * PRZED:  SMOKE_BASE_URL=http://127.0.0.1:5173
 * PO:     SMOKE_BASE_URL=http://127.0.0.1:5174
 */

import { test } from '@playwright/test';
import { installSupabaseMocks } from '../helpers/supabaseMock';
import {
  highlight, clearHighlights, smoothScrollTo,
  focusAndRecord, pageOverview, loginUser, loginAdmin,
} from './tester';

// ─────────────────────────────────────────────────────────────────────────────
// P2-07 · Dashboard – rozmiar nagłówka
// ─────────────────────────────────────────────────────────────────────────────
test('T01 · Dashboard – nagłówek główny (rozmiar)', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));

  // Pokaż stronę
  await pageOverview(page, 1500);
  await smoothScrollTo(page, 0);

  // Znajdź i podświetl nagłówek
  const h1 = page.locator('h1').first();
  await h1.waitFor({ state: 'visible' });
  await focusAndRecord(page, h1, '← ZMIANA: rozmiar czcionki', '#ef4444', 6000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-05 · Dashboard – link "wywiad dietetyczny"
// ─────────────────────────────────────────────────────────────────────────────
test('T02 · Dashboard – link do wywiadu dietetycznego', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user', { seedSentInterviewForPrimaryProfile: true }));

  // Scroll do dołu szukając linku
  await smoothScrollTo(page, 400);
  await page.waitForTimeout(600);
  await smoothScrollTo(page, 900);
  await page.waitForTimeout(600);

  // Szukaj tekstu o wywiadzie
  const link = page.locator('text=/wywiad/i').first();
  const fallback = page.locator('text=/ankiet/i').first();

  if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, link, '← ZMIANA: "wywiad dietetyczny"', '#ef4444', 6000);
  } else if (await fallback.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, fallback, '← ZMIANA: "wywiad dietetyczny"', '#ef4444', 6000);
  } else {
    await smoothScrollTo(page, 1200);
    await page.waitForTimeout(5000);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-03 · Dashboard – label sekcji wyników badań
// ─────────────────────────────────────────────────────────────────────────────
test('T03 · Dashboard – label "wyniki badań laboratoryjnych"', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));

  await smoothScrollTo(page, 500);
  await page.waitForTimeout(700);

  // Szukaj nowego lub starego labela
  const newLabel = page.locator('text=/badań laboratoryjn/i').first();
  const oldLabel = page.locator('text=/Pliki wynikowe/i').first();
  const anyLabel = page.locator('text=/wyniki|badani|Pliki/i').first();

  for (const loc of [newLabel, oldLabel, anyLabel]) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: nazwa sekcji wyników', '#ef4444', 6000);
      break;
    }
  }

  // Pokaż też całą sekcję
  await smoothScrollTo(page, 800);
  await page.waitForTimeout(3000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-05 · Admin – "Klient" zamiast "Pacjent"
// ─────────────────────────────────────────────────────────────────────────────
test('T04 · Admin – label "Klient" zamiast "Pacjent"', async ({ page }) => {
  await loginAdmin(page, () => installSupabaseMocks(page, 'admin'));

  // Scroll do formularza nadania dostępu
  await pageOverview(page, 1000);
  await smoothScrollTo(page, 600);
  await page.waitForTimeout(600);

  const klient = page.locator('text=/Klient/').first();
  const pacjent = page.locator('text=/Pacjent/').first();

  for (const loc of [klient, pacjent]) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: Pacjent → Klient', '#ef4444', 6000);
      break;
    }
  }

  // Pokaż resztę strony
  await smoothScrollTo(page, 1000);
  await page.waitForTimeout(2000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-05 · Referrals – "dietetyczny" vs "diagnostyczny"
// ─────────────────────────────────────────────────────────────────────────────
test('T05 · Referrals – "wywiad dietetyczny" vs "diagnostyczny"', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));
  await page.goto('/dashboard/referrals');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);

  // Pokaż ogólny widok
  await pageOverview(page, 1200);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);

  // Znajdź słowo "dietetyczny" lub "diagnostyczny"
  const diet = page.locator('text=/dietetyczny/i').first();
  const diag = page.locator('text=/diagnostyczny/i').first();

  for (const loc of [diet, diag]) {
    if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: diagnostyczny → dietetyczny', '#ef4444', 6000);
      break;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-07 · Signup – kolejność opcji zdjęcia
// ─────────────────────────────────────────────────────────────────────────────
test('T06 · Signup – kolejność opcji (kamera vs plik z dysku)', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Pokaż formularz
  await pageOverview(page, 1200);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);

  // Znajdź listę opcji zdjęcia
  const optionList = page.locator('label, [role="radio"], button').filter({ hasText: /zdjęcie|kamer|plik|urządzeni/i });
  const count = await optionList.count();

  if (count > 0) {
    // Podświetl pierwszą opcję — to jest kluczowa zmiana
    const first = optionList.first();
    await focusAndRecord(page, first, '← ZMIANA: kolejność opcji', '#ef4444', 3000);

    // Ruch kursora do drugiej opcji
    if (count > 1) {
      const second = optionList.nth(1);
      await highlight(page, second, '#f59e0b', '2. opcja');
      await page.waitForTimeout(3000);
      await clearHighlights(page);
    }
  }

  // Pokaż info-box
  const info = page.locator('text=/zdjęcie|organizmu|diagnoza/i').first();
  if (await info.isVisible({ timeout: 1500 }).catch(() => false)) {
    await focusAndRecord(page, info, '← ZMIANA: tekst info-box', '#8b5cf6', 4000);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-07 · Signup – tekst info-box krok 1
// ─────────────────────────────────────────────────────────────────────────────
test('T07 · Signup – tekst informacyjny (dlaczego potrzebne zdjęcie)', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Znajdź teksty opisowe
  const opisTexts = [
    page.locator('text=/organizmu/i').first(),
    page.locator('text=/Diagnoza/i').first(),
    page.locator('text=/niezbędne/i').first(),
    page.locator('[class*="muted"], [class*="text-sm"]').first(),
  ];

  for (const loc of opisTexts) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: opis dlaczego zdjęcie', '#8b5cf6', 6000);
      break;
    }
  }

  // Pokaż całą stronę
  await pageOverview(page, 1500);
});

// ─────────────────────────────────────────────────────────────────────────────
// P0-02 · Payment – nazwa pakietu
// ─────────────────────────────────────────────────────────────────────────────
test('T08 · Payment – nazwa pakietu Regeneracyjny vs Profilaktyczny', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));
  await page.goto('/payment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Pokaż ogólny widok strony
  await pageOverview(page, 1500);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(600);

  // Szukaj nazwy pakietu
  const profilak = page.locator('text=/Profilaktyczny/i').first();
  const regener = page.locator('text=/Regeneracyjny/i').first();
  const anyPkg = page.locator('text=/program/i').first();

  for (const loc of [profilak, regener, anyPkg]) {
    if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: nazwa pakietu', '#ef4444', 6000);
      break;
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-04 · Family header – imię aktywnego profilu
// ─────────────────────────────────────────────────────────────────────────────
test('T09 · Dashboard header – imię profilu w nagłówku', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));
  await page.waitForTimeout(800);

  // Znajdź header
  const header = page.locator('header').first();
  await header.waitFor({ state: 'visible' });

  // Podświetl cały header
  await focusAndRecord(page, header, '← ZMIANA: imię profilu w nagłówku', '#3b82f6', 3000);

  // Teraz szukaj konkretnego imienia wewnątrz
  const name = page.locator('header').locator('text=/Jan|Kowalski|Avatar/i').first();
  if (await name.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, name, '← imię aktywnego profilu', '#6ee7b7', 5000);
  } else {
    await page.waitForTimeout(4000);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-06 · Interview – sekcja zboża (2 kolumny)
// ─────────────────────────────────────────────────────────────────────────────
test('T10 · Wywiad – sekcja zboża: layout dwukolumnowy', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));
  await page.goto('/interview/grains');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Pokaż ogólnie
  await pageOverview(page, 1200);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(600);

  // Podświetl formularz / siatkę pytań
  const grid = page.locator('[class*="grid"]').first();
  const form = page.locator('form, [class*="space-y"]').first();

  for (const loc of [grid, form]) {
    if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: układ 2-kolumnowy', '#ef4444', 6000);
      break;
    }
  }

  // Scroll przez formularz
  await smoothScrollTo(page, 500);
  await page.waitForTimeout(3000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-06 · Interview – nawigacja + klikanie przez kroki
// ─────────────────────────────────────────────────────────────────────────────
test('T11 · Wywiad – nawigacja przez pierwsze kroki', async ({ page }) => {
  await loginUser(page, () => installSupabaseMocks(page, 'user'));
  await page.goto('/interview');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Pokaż krok 1
  const step1Content = page.locator('form, [class*="interview"], main').first();
  if (await step1Content.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, step1Content, 'Krok 1 wywiadu', '#3b82f6', 3000);
  } else {
    await page.waitForTimeout(3000);
  }

  // Kliknij Dalej
  const nextBtn = page.getByRole('button', { name: /dalej|następny/i }).first();
  const startBtn = page.getByRole('button', { name: /rozpocznij|zacznij|start/i }).first();

  for (const btn of [startBtn, nextBtn]) {
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await highlight(page, btn, '#6ee7b7', '→ kliknij Dalej');
      await page.waitForTimeout(1500);
      await clearHighlights(page);
      await btn.click();
      await page.waitForTimeout(1500);
      break;
    }
  }

  // Krok 2
  await pageOverview(page, 1500);

  // Kliknij Dalej jeszcze raz
  if (await nextBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await highlight(page, nextBtn, '#6ee7b7', '→ Dalej');
    await page.waitForTimeout(1200);
    await clearHighlights(page);
    await nextBtn.click();
    await page.waitForTimeout(2000);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// P2-06 · Admin – scrollowalny widok wywiadu
// ─────────────────────────────────────────────────────────────────────────────
test('T12 · Admin – wywiad dietetyczny (scrollowalny widok)', async ({ page }) => {
  await loginAdmin(page, () => installSupabaseMocks(page, 'admin', { seedInterviewSentForAdminProfile: true }));
  await page.goto('/admin/patient/patient-1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Pokaż profil
  await pageOverview(page, 1200);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);

  // Kliknij w zakładkę Wywiad (jeśli istnieje)
  const tab = page.locator('button, a, [role="tab"]').filter({ hasText: /wywiad/i }).first();
  if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await highlight(page, tab, '#6ee7b7', '→ kliknij Wywiad');
    await page.waitForTimeout(1200);
    await clearHighlights(page);
    await tab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }

  // Podświetl tytuł sekcji
  const title = page.locator('text=/Wywiad dietetyczny|Wywiad medyczny/i').first();
  if (await title.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, title, '← ZMIANA: tytuł wywiadu', '#ef4444', 4000);
  }

  // Pokaż nawigację pill-buttons (nowa funkcja)
  const nav = page.locator('[class*="sticky"], [class*="nav"], [class*="pill"]').first();
  if (await nav.isVisible({ timeout: 1500 }).catch(() => false)) {
    await focusAndRecord(page, nav, '← NOWE: nawigacja sekcji', '#6ee7b7', 3000);
  }

  // Scroll przez wywiad
  await smoothScrollTo(page, 400);
  await page.waitForTimeout(1500);
  await smoothScrollTo(page, 900);
  await page.waitForTimeout(1500);
  await smoothScrollTo(page, 1400);
  await page.waitForTimeout(2000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P0-01 · Admin – lista klientów (fix email)
// ─────────────────────────────────────────────────────────────────────────────
test('T13 · Admin – lista klientów i dashboard', async ({ page }) => {
  await loginAdmin(page, () => installSupabaseMocks(page, 'admin'));
  await page.waitForTimeout(800);

  // Pokaż dashboard admina
  await pageOverview(page, 1500);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);

  // Podświetl tabelę klientów
  const table = page.locator('table, [class*="Table"], [class*="patient"]').first();
  if (await table.isVisible({ timeout: 2000 }).catch(() => false)) {
    await focusAndRecord(page, table, 'Lista klientów', '#3b82f6', 4000);
  }

  // Scroll do formularza nadania dostępu
  await smoothScrollTo(page, 800);
  await page.waitForTimeout(2000);
});

// ─────────────────────────────────────────────────────────────────────────────
// P1-03 · Admin – label wyników badań w profilu klienta
// ─────────────────────────────────────────────────────────────────────────────
test('T14 · Admin – sekcja wyników badań w profilu klienta', async ({ page }) => {
  await loginAdmin(page, () => installSupabaseMocks(page, 'admin'));
  await page.goto('/admin/patient/patient-1');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Pokaż profil
  await pageOverview(page, 1200);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);

  // Szukaj sekcji wyników
  const newLabel = page.locator('text=/wyniki badan|badań laboratoryjn/i').first();
  const oldLabel = page.locator('text=/Pliki wynikowe dla pacjenta|wynikowe/i').first();
  const anyFiles = page.locator('text=/plik|wynik|badań/i').first();

  for (const loc of [newLabel, oldLabel, anyFiles]) {
    if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
      await focusAndRecord(page, loc, '← ZMIANA: label sekcji wyników', '#ef4444', 6000);
      break;
    }
  }

  // Scroll przez profil
  await smoothScrollTo(page, 600);
  await page.waitForTimeout(2000);
  await smoothScrollTo(page, 1200);
  await page.waitForTimeout(2000);
});
