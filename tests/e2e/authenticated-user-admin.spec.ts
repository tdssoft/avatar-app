import { expect, test } from '@playwright/test';
import { installSupabaseMocks } from './helpers/supabaseMock';

const out = (name: string) => `tests/artifacts/${name}.png`;

test.describe('Authenticated flows (mock auth/supabase, no real Stripe)', () => {
  test('logged-in user flow: dashboard -> payment -> checkout mock -> interview', async ({ page }) => {
    await installSupabaseMocks(page, 'user');
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.route('https://checkout.stripe.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>Mock Stripe Checkout</h1><p>Brak realnej płatności.</p></body></html>',
      });
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('jan@example.com');
    await page.getByLabel('Hasło').fill('Test1234!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Napisz co Ci jest' })).toBeVisible();
    await page.screenshot({ path: out('09-user-dashboard-logged') });

    await page.getByPlaceholder('Napisz, co Ci dolega i od kiedy...').fill('Ból głowy i zmęczenie od 2 tygodni');
    await page.getByRole('button', { name: 'Dalej' }).click();

    await page.getByRole('button', { name: 'Kupuję' }).first().click();
    await expect(page).toHaveURL(/\/payment\?group=(avatar|regen)/);
    await expect(page.getByRole('heading', { name: 'Szczegóły pakietu' })).toBeVisible();

    const miniPackage = page.getByText('Mini Program Startowy');
    if (await miniPackage.count()) {
      await miniPackage.first().click();
    } else {
      await page.getByText('Autopilot Zdrowia - program stałego wsparcia').first().click();
    }
    await page.getByRole('button', { name: 'Dalej' }).click();

    await expect(page).toHaveURL(/\/payment\/method$/);
    await expect(page.getByRole('heading', { name: 'Metoda płatności' })).toBeVisible();
    await page.getByLabel('Karta kredytowa').click();
    await page.getByRole('button', { name: 'Dalej' }).click();

    await expect(page).toHaveURL(/\/payment\/checkout$/);
    await expect(page.getByRole('heading', { name: 'Płatność' })).toBeVisible();
    await page.screenshot({ path: out('10-user-payment-checkout') });

    await page.getByRole('button', { name: 'Przejdź do płatności' }).click();
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    await expect(page.getByRole('heading', { name: 'Mock Stripe Checkout' })).toBeVisible();

    await page.goto('/payment/success');
    try {
      await expect(page).toHaveURL(/\/interview$/, { timeout: 10000 });
    } catch {
      await expect(page.getByRole('heading', { name: 'Płatność zakończona pomyślnie!' })).toBeVisible();
      await page.getByRole('button', { name: 'Przejdź do wywiadu' }).click();
    }

    await expect(page).toHaveURL(/\/interview$/);
    await expect(page.getByRole('heading', { name: 'Wywiad medyczny' })).toBeVisible();

    const visibleInputs = page.locator('input:visible');
    await visibleInputs.nth(0).fill('1990-01-01');
    await visibleInputs.nth(1).fill('70');
    await visibleInputs.nth(2).fill('175');
    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Kobieta' }).click();
    await page.getByRole('button', { name: 'Dalej' }).click();
    await expect(page.getByText('Proszę opisać dolegliwości lub dlaczego chcesz skorzystać z platformy')).toBeVisible();
    await page.screenshot({ path: out('11-user-interview-step2') });
  });

  test('admin flow: login -> patients -> patient profile -> notes -> partners', async ({ page }) => {
    await installSupabaseMocks(page, 'admin');
    await page.goto('/');
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Hasło').fill('Admin1234!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('heading', { name: 'Pacjenci' })).toBeVisible();
    await expect(page.getByText('Jan Kowalski')).toBeVisible();
    await page.screenshot({ path: out('12-admin-patients') });

    await page.getByRole('button', { name: 'Profil pacjenta' }).first().click();
    await expect(page).toHaveURL(/\/admin\/patient\/patient-1$/);
    await expect(page.getByRole('heading', { name: /Pacjent: Jan Kowalski/ })).toBeVisible();

    await page.getByRole('tab', { name: 'Notatki' }).click();
    await page.getByPlaceholder('Dodaj notatkę...').fill('Notatka testowa E2E');
    await page.getByRole('button', { name: 'Dodaj notatkę' }).click();
    await expect(page.getByText('Notatka testowa E2E')).toBeVisible();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const communicationTab = page.getByRole('tab', { name: 'Komunikacja' });
      await communicationTab.waitFor({ state: 'visible' });
      try {
        await communicationTab.click();
        break;
      } catch {
        await page.waitForTimeout(400);
      }
    }
    await expect(page.getByRole('heading', { name: 'Komunikacja SMS' })).toBeVisible();
    await page.getByPlaceholder('Napisz wiadomość SMS do pacjenta...').fill('SMS testowy E2E');
    await page.getByRole('button', { name: 'Wyślij SMS' }).click();
    await expect(page.getByText('SMS testowy E2E')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Zadane pytania przez formularz' })).toBeVisible();
    await expect(page.getByText('Czy mogę łączyć suplementy z obecnymi lekami?')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Odpowiedz' })).toHaveCount(0);
    await page.screenshot({ path: out('13-admin-patient-notes') });

    await page.locator('aside').getByRole('link', { name: 'Partnerzy' }).click();
    await expect(page).toHaveURL(/\/admin\/partners$/);
    await expect(page.getByRole('heading', { name: 'Partnerzy polecający' })).toBeVisible();
    await page.screenshot({ path: out('14-admin-partners') });
  });
});
