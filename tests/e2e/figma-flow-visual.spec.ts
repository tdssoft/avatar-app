import { expect, test } from '@playwright/test';

const out = (name: string) => `tests/artifacts/${name}.png`;

test('login -> signup(3 steps) -> verify -> payment(3 steps) visual smoke', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Witamy w Avatar!' })).toBeVisible();
  await page.screenshot({ path: out('01-login') });

  await page.getByRole('link', { name: 'Zarejestruj się' }).click();
  await expect(page.getByText('Krok 1/3')).toBeVisible();
  await page.screenshot({ path: out('02-signup-step1') });

  await page.getByLabel('Wgraj zdjęcie później').click();
  await page.getByRole('button', { name: /Dalej/ }).click();
  await expect(page.getByText('Krok 2/3')).toBeVisible();
  await page.screenshot({ path: out('03-signup-step2') });

  await page.getByRole('button', { name: 'Avatar 1' }).click();
  await page.getByRole('button', { name: /Dalej/ }).click();
  await expect(page.getByText('Krok 3/3')).toBeVisible();
  await page.screenshot({ path: out('04-signup-step3') });

  await page.goto('/signup/verify-email');
  await expect(page.getByRole('heading', { name: 'Zweryfikuj adres e-mail' })).toBeVisible();
  await page.screenshot({ path: out('05-verify-email') });

  await page.goto('/payment');
  await expect(page.getByRole('heading', { name: 'Szczegóły pakietu' })).toBeVisible();
  await page.screenshot({ path: out('06-payment-step1') });

  await page.getByText('Mini Program Startowy').first().click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Metoda płatności' })).toBeVisible();
  await page.screenshot({ path: out('07-payment-step2') });

  await page.getByLabel('Karta kredytowa').click();
  await page.getByRole('button', { name: 'Dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Płatność' })).toBeVisible();
  await page.screenshot({ path: out('08-payment-step3') });
});
