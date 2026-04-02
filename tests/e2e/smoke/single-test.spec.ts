/**
 * SMOKE TESTS — jeden test na jedno zagadnienie
 * Każdy test: nawiguj → znajdź zmieniony element → podświetl → nagraj 8s
 */
import { test } from '@playwright/test';
import { installSupabaseMocks } from '../helpers/supabaseMock';

// ─── Animowany highlight przez JS (niezależny od Playwright locators) ─────────
async function hl(
  page: any,
  searchText: string,
  label: string,
  color = '#ef4444',
) {
  await page.evaluate(
    ({ searchText, label, color }: any) => {
      document.querySelectorAll('.smoke-hl').forEach((el) => el.remove());

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      let targetEl: Element | null = null;
      while ((node = walker.nextNode() as Text | null)) {
        if (node.textContent?.trim().includes(searchText)) {
          targetEl = node.parentElement;
          break;
        }
      }
      if (!targetEl) return;

      let container: Element = targetEl;
      for (let i = 0; i < 5; i++) {
        const p = container.parentElement;
        if (!p || p === document.body) break;
        container = p;
        const bg = window.getComputedStyle(container).backgroundColor;
        if (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') break;
      }

      const r = container.getBoundingClientRect();
      const style = document.createElement('style');
      style.className = 'smoke-hl';
      style.textContent = `
        @keyframes sp { 0%,100%{box-shadow:0 0 0 3px ${color},0 0 20px ${color}66}50%{box-shadow:0 0 0 5px ${color},0 0 35px ${color}99} }
        @keyframes si { from{opacity:0}to{opacity:1} }
      `;
      document.head.appendChild(style);

      const box = document.createElement('div');
      box.className = 'smoke-hl';
      box.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px;border:3px solid ${color};border-radius:10px;background:${color}14;pointer-events:none;z-index:2147483647;animation:sp 1.4s ease-in-out infinite,si .2s ease;`;
      document.body.appendChild(box);

      const tag = document.createElement('div');
      tag.className = 'smoke-hl';
      tag.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-38}px;background:${color};color:#fff;font:700 11px/1 -apple-system,sans-serif;padding:4px 10px;border-radius:5px;pointer-events:none;z-index:2147483647;white-space:nowrap;animation:si .25s ease;`;
      tag.textContent = label;
      document.body.appendChild(tag);
    },
    { searchText, label, color },
  );
}

// ─── Highlight element wg CSS selektora ───────────────────────────────────────
async function hlSelector(
  page: any,
  selector: string,
  label: string,
  color = '#ef4444',
) {
  await page.evaluate(
    ({ selector, label, color }: any) => {
      document.querySelectorAll('.smoke-hl').forEach((el) => el.remove());
      const container = document.querySelector(selector);
      if (!container) return;
      const r = container.getBoundingClientRect();
      const style = document.createElement('style');
      style.className = 'smoke-hl';
      style.textContent = `
        @keyframes sp { 0%,100%{box-shadow:0 0 0 3px ${color},0 0 20px ${color}66}50%{box-shadow:0 0 0 5px ${color},0 0 35px ${color}99} }
        @keyframes si { from{opacity:0}to{opacity:1} }
      `;
      document.head.appendChild(style);
      const box = document.createElement('div');
      box.className = 'smoke-hl';
      box.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-6}px;width:${r.width+12}px;height:${r.height+12}px;border:3px solid ${color};border-radius:10px;background:${color}14;pointer-events:none;z-index:2147483647;animation:sp 1.4s ease-in-out infinite,si .2s ease;`;
      document.body.appendChild(box);
      const tag = document.createElement('div');
      tag.className = 'smoke-hl';
      tag.style.cssText = `position:fixed;left:${r.left-6}px;top:${r.top-38}px;background:${color};color:#fff;font:700 11px/1 -apple-system,sans-serif;padding:4px 10px;border-radius:5px;pointer-events:none;z-index:2147483647;white-space:nowrap;animation:si .25s ease;`;
      tag.textContent = label;
      document.body.appendChild(tag);
    },
    { selector, label, color },
  );
}

// ─── Login jako user ──────────────────────────────────────────────────────────
async function loginUser(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill('jan@example.com');
  await page.waitForTimeout(200);
  await page.getByLabel(/has.o/i).fill('Test1234!');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

// ─── Login jako admin ─────────────────────────────────────────────────────────
async function loginAdmin(page: any) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel(/email/i).fill('admin@example.com');
  await page.waitForTimeout(200);
  await page.getByLabel(/has.o/i).fill('Admin1234!');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/admin/, { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

// ─── Powolny scroll ───────────────────────────────────────────────────────────
async function scrollTo(page: any, targetY: number) {
  const steps = 12;
  const currentY: number = await page.evaluate(() => window.scrollY);
  for (let i = 1; i <= steps; i++) {
    const y = currentY + ((targetY - currentY) * i) / steps;
    await page.evaluate((y: number) => window.scrollTo({ top: y }), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(200);
}

// ═════════════════════════════════════════════════════════════════════════════
// T1 — Signup info-box: "Diagnoza" vs "funkcjonowania organizmu"
// Strona PUBLICZNA — bez logowania
// ═════════════════════════════════════════════════════════════════════════════
test('T1 · Signup – info-box tekst (Diagnoza vs funkcjonowania organizmu)', async ({ page }) => {
  await page.goto('/signup');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Kursor przybywa z prawej strony
  await page.mouse.move(1200, 500, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.move(430, 480, { steps: 25 });
  await page.waitForTimeout(400);

  // Podświetl info-box
  await hl(page, 'Dlaczego zdjęcie jest potrzebne', '← ZMIANA: tekst info-boxu');

  await page.mouse.move(430, 490, { steps: 8 });
  await page.waitForTimeout(8000);
});

// ═════════════════════════════════════════════════════════════════════════════
// T2 — Dashboard h1: rozmiar nagłówka (text-5xl PRZED → text-3xl PO)
// ═════════════════════════════════════════════════════════════════════════════
test('T2 · Dashboard h1 – rozmiar nagłówka (5xl → 3xl)', async ({ page }) => {
  await installSupabaseMocks(page, 'user');
  await loginUser(page);

  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await page.waitForTimeout(500);

  // Kursor idzie do h1
  await page.mouse.move(300, 600, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.move(720, 200, { steps: 30 });
  await page.waitForTimeout(400);

  await hl(page, 'Twoja ścieżka pracy z ciałem', '← ZMIANA: rozmiar tekstu (5xl → 3xl)');

  await page.mouse.move(720, 215, { steps: 8 });
  await page.waitForTimeout(8000);
});

// ═════════════════════════════════════════════════════════════════════════════
// T3 — Admin: label "Pacjent" → "Klient"
// ═════════════════════════════════════════════════════════════════════════════
test('T3 · Admin – label "Pacjent" → "Klient"', async ({ page }) => {
  await installSupabaseMocks(page, 'admin');
  await loginAdmin(page);

  // Scroll powoli w dół szukając sekcji z labelem
  await page.mouse.move(900, 400, { steps: 10 });
  await page.waitForTimeout(400);

  await scrollTo(page, 400);
  await page.waitForTimeout(500);
  await scrollTo(page, 900);
  await page.waitForTimeout(500);

  // Podświetl "Pacjent" lub "Klient" label
  const labelText = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('label'));
    const found = els.find(el => el.textContent?.includes('Pacjent') || el.textContent?.includes('Klient'));
    return found?.textContent?.trim() ?? null;
  });

  if (labelText) {
    await hl(page, labelText, `← ZMIANA: ${labelText === 'Pacjent' ? 'Pacjent → Klient' : 'już Klient ✓'}`);
    // Przesuń kursor do labela
    const box = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('label'))
        .find(e => e.textContent?.includes('Pacjent') || e.textContent?.includes('Klient'));
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (box) await page.mouse.move(box.x, box.y, { steps: 20 });
  } else {
    // Fallback: scroll do końca i zatrzymaj
    await scrollTo(page, 1200);
  }

  await page.waitForTimeout(8000);
});

// ═════════════════════════════════════════════════════════════════════════════
// T4 — Interview: sekcja "grains" (1-kolumna PRZED → 2-kolumny PO)
// Wymaga: paid plan (userSubscriptionStatus: Aktywna) + przeskoczenie do kroku 7
// ═════════════════════════════════════════════════════════════════════════════
test('T4 · Interview – sekcja zboża: 1-kolumna vs 2-kolumny', async ({ page }) => {
  // READY state: paid plan + interview sent → /interview dostępny bez redirect
  await installSupabaseMocks(page, 'user', {
    userSubscriptionStatus: 'Aktywna',
    seedSentInterviewForPrimaryProfile: true,
  });
  await loginUser(page);

  // Ustaw localStorage: krok 7 = "grains" PRZED nawigacją
  await page.evaluate(() => {
    localStorage.setItem('avatar_interview_v2_step_pp-user-1', '7');
  });

  // Wymuś reload /interview z krokiem zapisanym w localStorage
  await page.goto('/interview');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  // Potwierdzenie że jesteśmy na kroku zboża — szukamy tytułu sekcji
  await hl(page, 'zboż', '← ZMIANA: układ pytań (1-kol vs 2-kol)');

  // Kursor przybywa z prawej i idzie do formularza
  await page.mouse.move(1300, 300, { steps: 10 });
  await page.waitForTimeout(300);
  await page.mouse.move(720, 350, { steps: 30 });
  await page.waitForTimeout(500);

  // Scroll przez pytania — widać czy to 1 czy 2 kolumny
  await page.waitForTimeout(2000);
  await scrollTo(page, 300);
  await page.waitForTimeout(2000);
  await scrollTo(page, 700);
  await page.waitForTimeout(2000);
  await scrollTo(page, 0);
  await page.waitForTimeout(1500);
});

// ═════════════════════════════════════════════════════════════════════════════
// T5 — Dashboard: label sekcji wyników badań ("Pliki wynikowe" → nowy tekst)
// ═════════════════════════════════════════════════════════════════════════════
test('T5 · Dashboard – label sekcji wyników badań', async ({ page }) => {
  await installSupabaseMocks(page, 'user');
  await loginUser(page);

  // Scroll powoli w dół szukając sekcji wyników
  await page.mouse.move(200, 700, { steps: 10 });
  await page.waitForTimeout(300);

  // Scroll stopniowy — tester szuka elementu
  for (const y of [200, 400, 600, 800, 1000, 1200]) {
    await scrollTo(page, y);
    await page.waitForTimeout(250);

    const found = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Text | null;
      while ((node = walker.nextNode() as Text | null)) {
        const t = node.textContent?.trim() ?? '';
        if (
          t.includes('badań laboratoryjnych') ||
          t.includes('Pliki wynikowe') ||
          t.includes('wyniki badan') ||
          t.includes('Twoje wyniki')
        ) return t;
      }
      return null;
    });

    if (found) {
      await hl(page, found.substring(0, 20), '← ZMIANA: nazwa sekcji wyników');
      const coords = await page.evaluate((txt: string) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
          if (node.textContent?.includes(txt)) {
            const r = node.parentElement?.getBoundingClientRect();
            return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
          }
        }
        return null;
      }, found.substring(0, 20));
      if (coords) await page.mouse.move(coords.x, coords.y, { steps: 20 });
      break;
    }
  }

  await page.waitForTimeout(8000);
});
