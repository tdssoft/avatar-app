/**
 * UAT SMOKE — nagrania PRZED / PO dla wszystkich poprawek backlog-phase1
 *
 * PRZED (produkcja):
 *   SMOKE_BASE_URL=https://app.eavatar.diet \
 *   SMOKE_OUTPUT_DIR=tests/artifacts/uat-przed \
 *   npx playwright test uat-live --config playwright.smoke.config.ts
 *
 * PO (localhost):
 *   SMOKE_BASE_URL=http://localhost:5174 \
 *   SMOKE_OUTPUT_DIR=tests/artifacts/uat-po \
 *   npx playwright test uat-live --config playwright.smoke.config.ts
 */
import { test, Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Animowany highlight na elemencie zawierającym podany tekst */
async function hlText(page: Page, searchText: string, label: string, color = '#ef4444') {
  await page.evaluate(({ searchText, label, color }) => {
    (document.querySelectorAll('.uat-hl') as NodeListOf<HTMLElement>).forEach(el => el.remove());
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    let targetEl: Element | null = null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node.textContent?.includes(searchText)) { targetEl = node.parentElement; break; }
    }
    if (!targetEl) return;
    // Idź w górę do pierwszego elementu z tłem (karta/sekcja)
    let box: Element = targetEl;
    for (let i = 0; i < 5; i++) {
      const p = box.parentElement;
      if (!p || p === document.body) break;
      const bg = getComputedStyle(p).backgroundColor;
      if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') { box = p; break; }
      box = p;
    }
    const r = box.getBoundingClientRect();
    const style = document.createElement('style');
    style.className = 'uat-hl';
    style.textContent = `@keyframes uatPulse{0%,100%{box-shadow:0 0 0 3px ${color},0 0 20px ${color}66}50%{box-shadow:0 0 0 7px ${color},0 0 35px ${color}99}}@keyframes uatFadeIn{from{opacity:0}to{opacity:1}}`;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.className = 'uat-hl';
    overlay.style.cssText = `position:fixed;left:${r.left-8}px;top:${r.top-8}px;width:${r.width+16}px;height:${r.height+16}px;border:3px solid ${color};border-radius:10px;background:${color}18;pointer-events:none;z-index:2147483647;animation:uatPulse 1.4s ease-in-out infinite,uatFadeIn .2s ease;`;
    document.body.appendChild(overlay);
    const badge = document.createElement('div');
    badge.className = 'uat-hl';
    badge.style.cssText = `position:fixed;left:${r.left-8}px;top:${r.top-44}px;background:${color};color:#fff;font:700 12px/1 -apple-system,sans-serif;padding:6px 14px;border-radius:8px;pointer-events:none;z-index:2147483647;white-space:nowrap;animation:uatFadeIn .25s ease;box-shadow:0 4px 12px ${color}88;`;
    badge.textContent = label;
    document.body.appendChild(badge);
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, { searchText, label, color });
  await page.waitForTimeout(600);
}

/** Highlight na selektorze CSS */
async function hlSelector(page: Page, selector: string, label: string, color = '#ef4444') {
  await page.evaluate(({ selector, label, color }) => {
    (document.querySelectorAll('.uat-hl') as NodeListOf<HTMLElement>).forEach(el => el.remove());
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const r = el.getBoundingClientRect();
    const style = document.createElement('style');
    style.className = 'uat-hl';
    style.textContent = `@keyframes uatPulse{0%,100%{box-shadow:0 0 0 3px ${color},0 0 20px ${color}66}50%{box-shadow:0 0 0 7px ${color},0 0 35px ${color}99}}@keyframes uatFadeIn{from{opacity:0}to{opacity:1}}`;
    document.head.appendChild(style);
    const overlay = document.createElement('div');
    overlay.className = 'uat-hl';
    overlay.style.cssText = `position:fixed;left:${r.left-8}px;top:${r.top-8}px;width:${r.width+16}px;height:${r.height+16}px;border:3px solid ${color};border-radius:10px;background:${color}18;pointer-events:none;z-index:2147483647;animation:uatPulse 1.4s ease-in-out infinite,uatFadeIn .2s ease;`;
    document.body.appendChild(overlay);
    const badge = document.createElement('div');
    badge.className = 'uat-hl';
    badge.style.cssText = `position:fixed;left:${r.left-8}px;top:${r.top-44}px;background:${color};color:#fff;font:700 12px/1 -apple-system,sans-serif;padding:6px 14px;border-radius:8px;pointer-events:none;z-index:2147483647;white-space:nowrap;animation:uatFadeIn .25s ease;box-shadow:0 4px 12px ${color}88;`;
    badge.textContent = label;
    document.body.appendChild(badge);
  }, { selector, label, color });
  await page.waitForTimeout(600);
}

/** Płynny scroll */
async function smoothScroll(page: Page, toY: number, steps = 14) {
  const fromY: number = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    await page.evaluate((y: number) => window.scrollTo({ top: y }), fromY + (toY - fromY) * i / steps);
    await page.waitForTimeout(35);
  }
  await page.waitForTimeout(300);
}

/** Sprawdź czy tekst istnieje na stronie */
async function hasText(page: Page, text: string): Promise<boolean> {
  return page.evaluate((t: string) => document.body.innerText.includes(t), text);
}

/** Nawiguj do strony admina i poczekaj na load */
async function goAdmin(page: Page) {
  await page.goto('/admin');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/** Otwórz profil pierwszego klienta */
async function openFirstPatient(page: Page) {
  await goAdmin(page);
  const btn = page.locator('button', { hasText: /Profil (pacjenta|klienta)/i }).first();
  await btn.waitFor({ timeout: 8000 });
  await btn.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// ─── IDENTIFIKATOR ŚRODOWISKA ─────────────────────────────────────────────────
const LABEL_PRZED = '← PRZED (produkcja)';
const LABEL_PO    = '✓ PO (localhost)';
const COLOR_PRZED = '#ef4444';
const COLOR_PO    = '#22c55e';

function pickLabel(isBefore: boolean, text: string) {
  return isBefore ? `${LABEL_PRZED}: ${text}` : `${LABEL_PO}: ${text}`;
}
function pickColor(isBefore: boolean) {
  return isBefore ? COLOR_PRZED : COLOR_PO;
}

// ════════════════════════════════════════════════════════════════════════════════
// P0-01 / P0-04 · PŁATNOŚCI — obsługa błędów Stripe + blokada dla aktywnych
// ════════════════════════════════════════════════════════════════════════════════
test('P0-01 · Płatności – strona payment flow + nazwy pakietów', async ({ page }) => {
  await page.goto('/payment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Scroll i pokaż zawartość strony płatności
  await page.mouse.move(720, 400, { steps: 12 });
  await page.waitForTimeout(500);

  const hasProfilaktyczny = await hasText(page, 'Profilaktyczny');
  const hasRegeneracyjny  = await hasText(page, 'Regeneracyjny');
  const hasStripeError    = await hasText(page, 'stripe') || await hasText(page, 'payment_intent');

  // Pokaż co jest na stronie
  if (hasProfilaktyczny) {
    await hlText(page, 'Profilaktyczny', `${LABEL_PO}: "Profilaktyczny program wsparcia"`, COLOR_PO);
  } else if (hasRegeneracyjny) {
    await hlText(page, 'Regeneracyjny', `${LABEL_PRZED}: "Regeneracyjny program"`, COLOR_PRZED);
  } else {
    // Pokaż cokolwiek jest — pakiety / h1
    await hlSelector(page, 'h1, h2, [class*="card"]', 'Strona płatności');
  }

  await smoothScroll(page, 300);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 600);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 0);
  await page.waitForTimeout(8000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P0-02 · EMAIL — adres admina (avatarmieszek → avatar.mieszek)
// Testujemy Help page gdzie widać dane kontaktowe
// ════════════════════════════════════════════════════════════════════════════════
test('P0-02 · Email admina – adres kontaktowy w Help', async ({ page }) => {
  await page.goto('/dashboard/help');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 300, { steps: 10 });
  await page.waitForTimeout(400);

  const hasCorrect = await hasText(page, 'avatar.mieszek@gmail.com');
  const hasWrong   = await hasText(page, 'avatarmieszek@gmail.com');

  if (hasCorrect) {
    await hlText(page, 'avatar.mieszek@gmail.com', `${LABEL_PO}: poprawny email z kropką`, COLOR_PO);
  } else if (hasWrong) {
    await hlText(page, 'avatarmieszek@gmail.com', `${LABEL_PRZED}: brak kropki w adresie!`, COLOR_PRZED);
  } else {
    // Pokaż sekcję kontaktową
    await hlSelector(page, '[class*="contact"], [class*="card"]', 'Sekcja kontaktowa');
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(2000);

  // Pokaż też telefon
  const hasPhone = await hasText(page, '608 243 601');
  if (hasPhone) {
    await hlText(page, '608 243 601', `${LABEL_PO}: numer telefonu`, COLOR_PO);
  }

  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P0-03 · UPLOAD plików — MIME type fallback (Word/PDF/JPG)
// Nawigujemy do profilu klienta i pokazujemy sekcję upload
// ════════════════════════════════════════════════════════════════════════════════
test('P0-03 · Upload plików – sekcja wgrywania (Word/PDF/JPG)', async ({ page }) => {
  await openFirstPatient(page);

  await page.mouse.move(720, 400, { steps: 10 });
  await smoothScroll(page, 400);
  await page.waitForTimeout(600);

  // Znajdź sekcję upload
  const hasUpload = await hasText(page, 'wgraj') || await hasText(page, 'Wgraj') || await hasText(page, 'upload');

  if (hasUpload) {
    await hlText(page, 'wgraj plik', 'Sekcja upload — wgraj Word/PDF/JPG');
    await smoothScroll(page, 600);
    await page.waitForTimeout(1500);
    await smoothScroll(page, 900);
    await page.waitForTimeout(1500);
  }

  // Pokaż input file jeśli istnieje
  await hlSelector(page, 'input[type="file"]', 'Input do wgrywania pliku');
  await page.waitForTimeout(12000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-03 · PANEL RODZINNY — header z imieniem aktywnego profilu (dziecko/rodzic)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-03 · Panel rodzinny – header: imię aktywnego profilu', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 200, { steps: 12 });
  await page.waitForTimeout(500);

  // Pokaż header / profil switcher
  await hlSelector(page, 'header, nav, [class*="header"]', 'Nagłówek z aktywnym profilem');
  await page.waitForTimeout(2000);

  // Zoom na profile switcher jeśli istnieje
  const hasProfileSwitch = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    return els.some(el => el.textContent?.includes('profil') || el.textContent?.includes('Profil'));
  });

  if (hasProfileSwitch) {
    await hlText(page, 'rofil', 'Przełącznik profilu');
  }

  await page.waitForTimeout(12000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-04 · ADMIN GRANT ACCESS — zarządzanie dostępem per profil
// ════════════════════════════════════════════════════════════════════════════════
test('P1-04 · Admin – grant access per profil', async ({ page }) => {
  await openFirstPatient(page);

  await page.mouse.move(720, 300, { steps: 10 });
  await page.waitForTimeout(500);

  // Pokaż sekcję uprawnień / dostępu
  const hasAccess = await hasText(page, 'dostęp') || await hasText(page, 'Aktywna') || await hasText(page, 'status');

  if (hasAccess) {
    const accessText = (await hasText(page, 'Aktywna')) ? 'Aktywna' : 'dostęp';
    await hlText(page, accessText, 'Sekcja zarządzania dostępem');
  } else {
    await hlSelector(page, '[class*="status"], [class*="access"], [class*="subscription"]', 'Status subskrypcji');
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(2000);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-05 · HEADER — pokazuje aktywny profil (dziecko zamiast rodzica)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-05 · Header – aktywny profil (imię dziecka/rodzica)', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  // Pokaż górną część strony z headerem
  await page.mouse.move(200, 60, { steps: 10 });
  await page.waitForTimeout(500);

  await hlSelector(page, 'header', 'Header aplikacji');
  await page.waitForTimeout(2000);

  // Zoom na avatar / imię użytkownika w headerze
  const headerText = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header?.innerText?.substring(0, 100) ?? '';
  });
  console.log('Header text:', headerText);

  await page.waitForTimeout(12000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-06/P1-10 · COPY: "Pacjent" → "Klient", "medyczny" → "dietetyczny"
// ════════════════════════════════════════════════════════════════════════════════
test('P1-06 · Admin – "Pacjent" → "Klient" (label formularza)', async ({ page }) => {
  await goAdmin(page);

  await page.mouse.move(720, 300, { steps: 10 });
  await page.waitForTimeout(500);

  const hasPacjent = await hasText(page, 'Pacjent');
  const hasKlient  = await hasText(page, 'Klient');

  if (hasPacjent) {
    await hlText(page, 'Pacjent', `${LABEL_PRZED}: label "Pacjent" — stara nazwa`, COLOR_PRZED);
  } else if (hasKlient) {
    await hlText(page, 'Klient', `${LABEL_PO}: label zmieniony na "Klient"`, COLOR_PO);
  }

  await page.waitForTimeout(2000);

  // Pokaż też przycisk "Profil pacjenta" / "Profil klienta"
  const btnText = hasPacjent ? 'Profil pacjenta' : 'Profil klienta';
  const btnColor = hasPacjent ? COLOR_PRZED : COLOR_PO;
  if (await hasText(page, btnText.substring(0, 10))) {
    await hlText(page, btnText.substring(0, 10), `Przycisk: "${btnText}"`, btnColor);
  }

  await page.waitForTimeout(11000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-07 · "Pliki wynikowe dla pacjenta" → "Wyniki badań laboratoryjne klienta"
// ════════════════════════════════════════════════════════════════════════════════
test('P1-07 · Admin profil – sekcja wyników: stara vs nowa nazwa', async ({ page }) => {
  await openFirstPatient(page);

  await page.mouse.move(720, 400, { steps: 10 });
  await smoothScroll(page, 300);
  await page.waitForTimeout(600);

  const hasOld = await hasText(page, 'Pliki wynikowe');
  const hasNew = await hasText(page, 'Wyniki badań laboratoryjne');

  if (hasOld) {
    await hlText(page, 'Pliki wynikowe', `${LABEL_PRZED}: "Pliki wynikowe dla pacjenta"`, COLOR_PRZED);
  } else if (hasNew) {
    await hlText(page, 'Wyniki badań laboratoryjne', `${LABEL_PO}: "Wyniki badań laboratoryjne klienta"`, COLOR_PO);
  }

  await smoothScroll(page, 600);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 0);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-07b · Dashboard user – "Pliki wynikowe" → "Wyniki badań" (user-side)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-07b · Dashboard user – sekcja wyników (user-side label)', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 400, { steps: 12 });
  await page.waitForTimeout(500);

  // Sprawdź sidebar
  await hlSelector(page, 'nav, aside', 'Sidebar nawigacja');
  await page.waitForTimeout(1500);

  // Scroll do sekcji wyników
  await smoothScroll(page, 500);
  await page.waitForTimeout(800);

  const hasOld = await hasText(page, 'Pliki wynikowe');
  const hasNew = await hasText(page, 'laboratoryjne');

  if (hasNew) {
    await hlText(page, 'laboratoryjne', `${LABEL_PO}: nowy label sekcji wyników`, COLOR_PO);
  } else if (hasOld) {
    await hlText(page, 'Pliki wynikowe', `${LABEL_PRZED}: "Pliki wynikowe"`, COLOR_PRZED);
  }

  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-08 · WYWIAD — "Wywiad medyczny" → "Wywiad dietetyczny" (heading h1)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-08 · Interview – heading: "Wywiad medyczny" → "Wywiad dietetyczny"', async ({ page }) => {
  // Przejdź do strony wywiadu (admin ma dostęp przez dashboard/interview)
  await page.goto('/dashboard/interview');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  await page.mouse.move(900, 300, { steps: 12 });
  await page.waitForTimeout(500);

  const hasOld = await hasText(page, 'Wywiad medyczny');
  const hasNew = await hasText(page, 'Wywiad dietetyczny');

  if (hasOld) {
    await hlText(page, 'Wywiad medyczny', `${LABEL_PRZED}: "Wywiad medyczny" — stara nazwa`, COLOR_PRZED);
  } else if (hasNew) {
    await hlText(page, 'Wywiad dietetyczny', `${LABEL_PO}: "Wywiad dietetyczny" — zmieniono`, COLOR_PO);
  } else {
    // Pokaż h1 jakikolwiek
    await hlSelector(page, 'h1', 'Nagłówek strony wywiadu');
  }

  await page.waitForTimeout(12000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-09 · WYWIAD — 2-kolumnowy układ sekcji żywieniowych
// (Na produkcji: 1 kolumna; na localhost: 2 kolumny)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-09 · Interview – 2-kolumnowy layout sekcji żywieniowych', async ({ page }) => {
  await page.goto('/dashboard/interview');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  await page.mouse.move(720, 400, { steps: 10 });
  await page.waitForTimeout(500);

  // Sprawdź layout
  const hasTwoCols = await page.evaluate(() => {
    const grids = document.querySelectorAll('[class*="grid-cols-2"], [class*="two-column"], [class*="columns-2"]');
    return grids.length;
  });

  const isRedirected = !page.url().includes('interview');
  if (isRedirected) {
    await hlSelector(page, 'h1, h2', 'Redirect — brak dostępu do wywiadu (wymaga subskrypcji)');
  } else if (hasTwoCols > 0) {
    await hlSelector(page, '[class*="grid-cols-2"]', `${LABEL_PO}: 2-kolumnowy layout (${hasTwoCols} sekcje)`, COLOR_PO);
    await smoothScroll(page, 300);
    await page.waitForTimeout(1500);
    await smoothScroll(page, 600);
    await page.waitForTimeout(1500);
  } else {
    // Jeden kolumnowy układ — pokaż formularz
    await hlSelector(page, 'form, [class*="interview"]', `${LABEL_PRZED}: 1-kolumnowy layout`, COLOR_PRZED);
  }

  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-09b · WYWIAD ADMIN — scrollable single-page (zamiast taśmociągu)
// ════════════════════════════════════════════════════════════════════════════════
test('P1-09b · Admin wywiad – scrollable single-page view', async ({ page }) => {
  await openFirstPatient(page);

  // Przewijaj profil klienta i szukaj sekcji wywiadu
  await page.mouse.move(720, 400, { steps: 10 });
  await smoothScroll(page, 500);
  await page.waitForTimeout(600);

  // Sprawdź czy jest paginacja w sekcji wywiadu
  const hasPagination = await page.evaluate(() =>
    document.querySelectorAll('[data-step], [class*="wizard-step"], [class*="pagination"]').length > 1
  );

  await smoothScroll(page, 900);
  await page.waitForTimeout(800);

  // Pokaż sekcję wywiadu
  const hasInterviewSection = await hasText(page, 'wywiad') || await hasText(page, 'Wywiad');
  if (hasInterviewSection) {
    const label = hasPagination
      ? `${LABEL_PRZED}: paginacja (taśmociąg) w adminie`
      : `${LABEL_PO}: sekcja wywiadu jako scroll`;
    const color = hasPagination ? COLOR_PRZED : COLOR_PO;
    await hlText(page, 'ywiad', label, color);
  } else {
    await hlSelector(page, 'h1, h2', 'Profil klienta (brak wywiadu w tym profilu)');
  }

  await smoothScroll(page, 1200);
  await page.waitForTimeout(1500);
  await smoothScroll(page, 0);
  await page.waitForTimeout(8000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-10 · COPY — "diagnostyka" / "diagnoza" → "analiza" / "funkcjonowanie"
// ════════════════════════════════════════════════════════════════════════════════
test('P1-10 · Copy – "diagnostyka" → "analiza organizmu"', async ({ page }) => {
  await openFirstPatient(page);

  await page.mouse.move(720, 300, { steps: 10 });
  await page.waitForTimeout(500);

  const hasDiagnoza     = await hasText(page, 'diagnoza') || await hasText(page, 'Diagnoza');
  const hasFunkcjonowanie = await hasText(page, 'funkcjonowania') || await hasText(page, 'Funkcjonowania');

  if (hasDiagnoza) {
    await hlText(page, 'iagnoza', `${LABEL_PRZED}: słowo "diagnoza" — stara terminologia`, COLOR_PRZED);
  } else if (hasFunkcjonowanie) {
    await hlText(page, 'unkcjonowania', `${LABEL_PO}: "funkcjonowania organizmu" — nowa terminologia`, COLOR_PO);
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(2000);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P1-11 · ADMIN — "Wywiad dietetyczny" w PatientProfile
// ════════════════════════════════════════════════════════════════════════════════
test('P1-11 · Admin PatientProfile – "Wywiad dietetyczny" (zakładka/sekcja)', async ({ page }) => {
  await openFirstPatient(page);

  await page.mouse.move(720, 400, { steps: 10 });
  await smoothScroll(page, 700);
  await page.waitForTimeout(800);

  const hasOld = await hasText(page, 'Wywiad medyczny');
  const hasNew = await hasText(page, 'Wywiad dietetyczny');

  if (hasOld) {
    await hlText(page, 'Wywiad medyczny', `${LABEL_PRZED}: "Wywiad medyczny"`, COLOR_PRZED);
  } else if (hasNew) {
    await hlText(page, 'Wywiad dietetyczny', `${LABEL_PO}: "Wywiad dietetyczny"`, COLOR_PO);
  } else {
    await hlSelector(page, '[class*="interview"], [class*="card"]', 'Sekcja wywiadu');
  }

  await smoothScroll(page, 1000);
  await page.waitForTimeout(1500);
  await smoothScroll(page, 0);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-01 · FAQ / HELP — nowe teksty "dietetyczny", dane kontaktowe
// ════════════════════════════════════════════════════════════════════════════════
test('P2-01 · Help/FAQ – nowe teksty + dane kontaktowe', async ({ page }) => {
  await page.goto('/dashboard/help');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 300, { steps: 12 });
  await page.waitForTimeout(400);

  // Pokaż FAQ
  const hasDietetyczny = await hasText(page, 'dietetyczn');
  const hasMedyczny = await hasText(page, 'medyczn');

  if (hasDietetyczny) {
    await hlText(page, 'dietetyczn', `${LABEL_PO}: "dietetyczny" — zaktualizowane FAQ`, COLOR_PO);
  } else if (hasMedyczny) {
    await hlText(page, 'medyczn', `${LABEL_PRZED}: "medyczny" — stare teksty FAQ`, COLOR_PRZED);
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(1500);

  // Pokaż dane kontaktowe
  const hasPhone = await hasText(page, '608');
  if (hasPhone) {
    await hlText(page, '608', `${LABEL_PO}: dane kontaktowe`, COLOR_PO);
  }

  await smoothScroll(page, 800);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 0);
  await page.waitForTimeout(8000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-02 · SIGNUP WIZARD — nowe teksty + kolejność opcji + info-box
// ════════════════════════════════════════════════════════════════════════════════
test('P2-02 · Signup wizard – info-box + kolejność opcji zdjęcia', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(1300, 400, { steps: 12 });
  await page.waitForTimeout(300);
  await page.mouse.move(400, 380, { steps: 30 });
  await page.waitForTimeout(600);

  // Pokaż opcje zdjęcia
  const hasOldInfo = await hasText(page, 'Diagnoza');
  const hasNewInfo = await hasText(page, 'Zdjęcie jest niezbędne') || await hasText(page, 'funkcjonowania');

  if (hasOldInfo) {
    await hlText(page, 'Diagnoza', `${LABEL_PRZED}: stara treść info-box`, COLOR_PRZED);
  } else if (hasNewInfo) {
    const searchTerm = (await hasText(page, 'Zdjęcie jest niezbędne')) ? 'Zdjęcie jest niezbędne' : 'funkcjonowania';
    await hlText(page, searchTerm, `${LABEL_PO}: nowa treść info-box`, COLOR_PO);
  }

  await page.waitForTimeout(2000);
  // Pokaż radio opcje
  await hlSelector(page, 'input[type="radio"]', 'Opcje wyboru zdjęcia');
  await smoothScroll(page, 300);
  await page.waitForTimeout(2000);
  await smoothScroll(page, 0);
  await page.waitForTimeout(8000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-03 · DASHBOARD HEADLINE — zmniejszony nagłówek h1 (5xl → 3xl)
// ════════════════════════════════════════════════════════════════════════════════
test('P2-03 · Dashboard – headline h1: rozmiar (5xl → 3xl)', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(500);

  await page.mouse.move(300, 300, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.move(900, 200, { steps: 25 });
  await page.waitForTimeout(500);

  const h1Data = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    if (!h1) return null;
    const size = parseInt(getComputedStyle(h1).fontSize);
    return { size, text: h1.textContent?.substring(0, 50) };
  });

  if (h1Data) {
    const isLarge = h1Data.size >= 40;
    await hlSelector(
      page, 'h1',
      isLarge
        ? `${LABEL_PRZED}: h1 = ${h1Data.size}px (text-5xl) — za duży`
        : `${LABEL_PO}: h1 = ${h1Data.size}px (text-3xl) — poprawiony`,
      isLarge ? COLOR_PRZED : COLOR_PO
    );
  }

  await page.waitForTimeout(12000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-04 · DANE KONTAKTOWE — Help page / interviewSplit heading
// ════════════════════════════════════════════════════════════════════════════════
test('P2-04 · Dane kontaktowe – Help + InterviewSplit heading', async ({ page }) => {
  await page.goto('/dashboard/help');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 400, { steps: 12 });
  await page.waitForTimeout(400);

  // Szukaj danych kontaktowych
  const hasEmail = await hasText(page, 'avatar.mieszek');
  const hasPhone = await hasText(page, '608 243 601') || await hasText(page, '608243601');
  const hasLandline = await hasText(page, '+48 17') || await hasText(page, '173070183');

  await hlSelector(page, '[class*="contact"], [class*="card"]:last-child', 'Sekcja danych kontaktowych');
  await page.waitForTimeout(1500);

  if (hasEmail) {
    await hlText(page, 'avatar.mieszek', `${LABEL_PO}: email z kropką ✓`, COLOR_PO);
  }
  if (hasPhone) {
    await hlText(page, '608', `${LABEL_PO}: telefon komórkowy ✓`, COLOR_PO);
  }
  if (hasLandline) {
    await hlText(page, '+48 17', `${LABEL_PO}: telefon stacjonarny ✓`, COLOR_PO);
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-05 · NAZWY PAKIETÓW — "Regeneracyjny" → "Profilaktyczny program wsparcia"
// ════════════════════════════════════════════════════════════════════════════════
test('P2-05 · Nazwy pakietów – "Regeneracyjny" → "Profilaktyczny"', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 300, { steps: 10 });
  await page.waitForTimeout(400);

  const hasOld = await hasText(page, 'Regeneracyjny');
  const hasNew = await hasText(page, 'Profilaktyczny');

  if (hasOld) {
    await hlText(page, 'Regeneracyjny', `${LABEL_PRZED}: "Regeneracyjny program organizmu"`, COLOR_PRZED);
  } else if (hasNew) {
    await hlText(page, 'Profilaktyczny', `${LABEL_PO}: "Profilaktyczny program wsparcia"`, COLOR_PO);
  }

  // Sprawdź też /payment
  await page.goto('/payment');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  const hasOldPayment = await hasText(page, 'Regeneracyjny');
  const hasNewPayment = await hasText(page, 'Profilaktyczny');

  if (hasOldPayment) {
    await hlText(page, 'Regeneracyjny', `${LABEL_PRZED}: stara nazwa pakietu na /payment`, COLOR_PRZED);
  } else if (hasNewPayment) {
    await hlText(page, 'Profilaktyczny', `${LABEL_PO}: nowa nazwa pakietu na /payment`, COLOR_PO);
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(10000);
});

// ════════════════════════════════════════════════════════════════════════════════
// P2-05b · REFERRALS — "diagnostyczny" → "dietetyczny"
// ════════════════════════════════════════════════════════════════════════════════
test('P2-05b · Referrals – "diagnostyczny" → "dietetyczny"', async ({ page }) => {
  await page.goto('/dashboard/referrals');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  await page.mouse.move(720, 400, { steps: 12 });
  await page.waitForTimeout(500);

  const hasOld = await hasText(page, 'diagnostyczny');
  const hasNew = await hasText(page, 'dietetyczny');

  if (hasOld) {
    await hlText(page, 'diagnostyczny', `${LABEL_PRZED}: "diagnostyczny" — stare copy`, COLOR_PRZED);
  } else if (hasNew) {
    await hlText(page, 'dietetyczny', `${LABEL_PO}: "dietetyczny" — zmienione copy`, COLOR_PO);
  } else {
    await hlSelector(page, 'h1, h2, p', 'Strona referrals');
  }

  await smoothScroll(page, 400);
  await page.waitForTimeout(10000);
});
