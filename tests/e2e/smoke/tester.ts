/**
 * tester.ts – narzędzia wizualne dla smoke testów
 * Symuluje manualnego testera: highlight, kursor, etykiety, scroll
 */
import { Page, Locator } from '@playwright/test';

/** Animowany highlight wokół elementu (pulsujący border) */
export async function highlight(
  page: Page,
  locator: Locator,
  color = '#ef4444',
  label?: string,
) {
  try {
    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const box = await locator.boundingBox();
    if (!box) return;

    await page.evaluate(
      ({ x, y, w, h, color, label }) => {
        // Usuń stary highlight
        document.querySelectorAll('.smoke-hl').forEach(el => el.remove());

        const style = document.createElement('style');
        style.className = 'smoke-hl';
        style.textContent = `
          @keyframes smoke-pulse { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.01)} }
          @keyframes smoke-fade-in { from{opacity:0}to{opacity:1} }
          .smoke-hl-box { animation: smoke-pulse 1.2s ease-in-out infinite, smoke-fade-in .2s ease; }
          .smoke-hl-label { animation: smoke-fade-in .3s ease; }
        `;
        document.head.appendChild(style);

        const box = document.createElement('div');
        box.className = 'smoke-hl smoke-hl-box';
        box.style.cssText = `
          position:fixed; z-index:2147483647; pointer-events:none;
          left:${x - 4}px; top:${y - 4}px;
          width:${w + 8}px; height:${h + 8}px;
          border:3px solid ${color};
          border-radius:8px;
          background:${color}18;
          box-shadow:0 0 0 1px ${color}66, 0 0 16px ${color}44;
        `;
        document.body.appendChild(box);

        if (label) {
          const tag = document.createElement('div');
          tag.className = 'smoke-hl smoke-hl-label';
          tag.style.cssText = `
            position:fixed; z-index:2147483647; pointer-events:none;
            left:${x - 4}px; top:${y - 4 - 28}px;
            background:${color}; color:#fff;
            font:700 11px/1 -apple-system,sans-serif;
            padding:4px 8px; border-radius:4px;
            white-space:nowrap; letter-spacing:.03em;
          `;
          tag.textContent = label;
          document.body.appendChild(tag);
        }
      },
      { x: box.x, y: box.y, w: box.width, h: box.height, color, label: label ?? null },
    );

    // Przesuń kursor do środka elementu
    await page.mouse.move(
      box.x + box.width / 2,
      box.y + box.height / 2,
      { steps: 20 },
    );
  } catch { /* element mógł zniknąć */ }
}

/** Usuń wszystkie highlighty */
export async function clearHighlights(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll('.smoke-hl').forEach(el => el.remove());
  });
}

/** Scroll z widoczną animacją (naturalny ruch) */
export async function smoothScrollTo(page: Page, targetY: number) {
  const currentY: number = await page.evaluate(() => window.scrollY);
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const y = currentY + ((targetY - currentY) * i) / steps;
    await page.evaluate((y) => window.scrollTo({ top: y }), y);
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(200);
}

/** Highlight + pauza (główna funkcja smoke testów) */
export async function focusAndRecord(
  page: Page,
  locator: Locator,
  label: string,
  color = '#ef4444',
  holdMs = 5000,
) {
  await highlight(page, locator, color, label);
  await page.waitForTimeout(holdMs);
  await clearHighlights(page);
}

/** Szybki rzut okiem na stronę — scroll w dół i z powrotem */
export async function pageOverview(page: Page, pause = 2000) {
  const height: number = await page.evaluate(() => document.body.scrollHeight);
  await smoothScrollTo(page, height * 0.4);
  await page.waitForTimeout(pause);
  await smoothScrollTo(page, 0);
  await page.waitForTimeout(500);
}

/** Login jako user przez mock */
export async function loginUser(page: Page, installMocks: () => Promise<void>) {
  await installMocks();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.getByLabel('Email').fill('jan@example.com');
  await page.waitForTimeout(200);
  await page.getByLabel('Hasło').fill('Test1234!');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}

/** Login jako admin przez mock */
export async function loginAdmin(page: Page, installMocks: () => Promise<void>) {
  await installMocks();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.getByLabel('Email').fill('admin@example.com');
  await page.waitForTimeout(200);
  await page.getByLabel('Hasło').fill('Admin1234!');
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL('**/admin**', { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(600);
}
