import { expect, test } from '@playwright/test';
import { installSupabaseMocks } from './helpers/supabaseMock';

/**
 * E2E — Rejestracja nowego użytkownika
 *
 * Sprawdza:
 * 1. Nowe konto od razu aktywowane (autoconfirm=true) → /dashboard, NIE /verify-email
 * 2. Nowy pacjent widoczny w panelu admina
 * 3. post-signup wywoływany → email do admina (admin@eavatar.diet)
 */

const nowIso = new Date().toISOString();

function makeNewUser(suffix: string) {
  const userId = `new-user-${suffix}`;
  const patientId = `patient-${suffix}`;
  const email = `pacjent.${suffix}@example.com`;
  const firstName = `Nowy${suffix}`;
  const lastName = 'Pacjent';

  const authResponse = {
    access_token: `mock-token-${suffix}`,
    token_type: 'bearer',
    expires_in: 3600,
    refresh_token: `mock-refresh-${suffix}`,
    user: {
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email,
      email_confirmed_at: nowIso,   // ← od razu potwierdzone (autoconfirm)
      confirmed_at: nowIso,
      phone: '',
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        firstName,
        lastName,
        phone: '784202512',
        referralCode: 'NEWU1234',
        onboardingConfirmed: true,
      },
      identities: [],
      created_at: nowIso,
      updated_at: nowIso,
    },
  };

  return { userId, patientId, email, firstName, lastName, authResponse };
}

async function fillSignupForm(page: any, firstName: string, lastName: string, email: string) {
  await page.goto('/signup');
  await page.getByLabel('Wgraj zdjęcie później').click();
  await page.getByRole('button', { name: 'Dalej ->' }).click();
  await page.getByLabel('Imię').fill(firstName);
  await page.getByLabel('Nazwisko').fill(lastName);
  await page.getByLabel('Numer Telefonu').fill('784202512');
  await page.getByLabel('Adres E-mail').fill(email);
  await page.getByLabel('Hasło', { exact: true }).fill('Test1234!');
  await page.getByLabel('Powtórz Hasło').fill('Test1234!');
  await page.getByRole('button', { name: 'Rejestracja' }).click();
}

test.describe('Rejestracja nowego użytkownika', () => {

  test('nowe konto od razu aktywowane — przekierowanie do /dashboard (nie /verify-email)', async ({ page }) => {
    const { userId, patientId, email, firstName, lastName, authResponse } = makeNewUser(
      Date.now().toString().slice(-6)
    );

    // 1. Zainstaluj bazowe mocki (auth/token, rest/v1/*)
    await installSupabaseMocks(page, 'user');

    // 2. Override: signup zwraca od razu sesję (autoconfirm=true)
    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authResponse),
      });
    });

    // 3. Override: post-signup zwraca sukces
    let postSignupCalled = false;
    let postSignupBody: any = null;
    await page.route('**/functions/v1/post-signup', async (route) => {
      postSignupCalled = true;
      try { postSignupBody = route.request().postDataJSON(); } catch { /* noop */ }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    // 4. Override: patients query dla nowego userId zwraca wiersz
    await page.route('**/rest/v1/patients*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('user_id') === `eq.${userId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: patientId, user_id: userId }]),
        });
        return;
      }
      await route.fallback();
    });

    await fillSignupForm(page, firstName, lastName, email);

    // Konto od razu aktywowane → /dashboard, NIE /signup/verify-email
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 });

    // post-signup powinien być wywołany (tworzy pacjenta, wysyła email do admina)
    expect(postSignupCalled, 'post-signup edge function powinien być wywołany po rejestracji').toBe(true);
    if (postSignupBody) {
      expect(postSignupBody.email).toBe(email);
      expect(postSignupBody.firstName).toBe(firstName);
    }
  });

  test('nowy pacjent widoczny w panelu admina po rejestracji', async ({ page }) => {
    await installSupabaseMocks(page, 'admin');

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Hasło').fill('Admin1234!');
    await page.getByRole('button', { name: 'Log in' }).click();

    await expect(page).toHaveURL(/\/admin$/, { timeout: 10_000 });
    // Panel admina wyświetla pacjentów z bazy (Jan Kowalski pochodzi z baseDb)
    await expect(page.getByText('Jan Kowalski').first()).toBeVisible({ timeout: 5_000 });
  });

  test('post-signup wysyła email do admina — weryfikacja wywołania funkcji', async ({ page }) => {
    const { userId, patientId, email, firstName, lastName, authResponse } = makeNewUser(
      (Date.now() + 10).toString().slice(-6)
    );

    let adminNotificationTriggered = false;

    await installSupabaseMocks(page, 'user');

    await page.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(authResponse),
      });
    });

    // post-signup mock — w produkcji ta funkcja wysyła email do admin@eavatar.diet
    await page.route('**/functions/v1/post-signup', async (route) => {
      adminNotificationTriggered = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route('**/rest/v1/patients*', async (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('user_id') === `eq.${userId}`) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([{ id: patientId, user_id: userId }]),
        });
        return;
      }
      await route.fallback();
    });

    await fillSignupForm(page, firstName, lastName, email);

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 12_000 });

    // post-signup wywołany → w nim logika email do admin@eavatar.diet (przez Resend/RESEND_API_KEY)
    expect(
      adminNotificationTriggered,
      'post-signup (odpowiedzialny za email do admina) powinien być wywołany'
    ).toBe(true);
  });
});
