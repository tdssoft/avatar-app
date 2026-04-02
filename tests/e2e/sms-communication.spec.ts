import { expect, test } from '@playwright/test';
import { installSupabaseMocks } from './helpers/supabaseMock';

test.use({ video: 'on' });

const nowIso = new Date().toISOString();

const PATIENT_WITH_PHONE = {
  patient: {
    id: 'patient-1',
    user_id: 'user-1',
    subscription_status: 'Aktywna',
    diagnosis_status: 'Gotowa',
    last_communication_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    tags: [],
  },
  profile: {
    id: 'profile-user-1',
    user_id: 'user-1',
    first_name: 'Jan',
    last_name: 'Kowalski',
    phone: '784202512',
    avatar_url: null,
    referral_code: 'JAN12345',
  },
  email: 'jan@example.com',
  person_profiles: [
    { id: 'pp-user-1', account_user_id: 'user-1', name: 'Jan Kowalski', is_primary: true, created_at: nowIso },
  ],
  recommendations: [],
  notes: [],
  messages: [],
  tags: [],
};

const PATIENT_NO_PHONE = {
  ...PATIENT_WITH_PHONE,
  profile: {
    ...PATIENT_WITH_PHONE.profile,
    first_name: 'Anna',
    last_name: 'Brak',
    phone: null,
  },
};

async function mockRpc(page: any, responseData: any) {
  await page.route('**/rest/v1/rpc/get_admin_patient_core', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(responseData),
    });
  });
  await page.route('**/rest/v1/rpc/get_admin_patient_profile_data', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ result_files: [], device_files: [], ai_entries: [], can_open_interview: false }),
    });
  });
}

test.describe('SMS Communication', () => {

  test('pacjent z numerem telefonu — wysyłanie SMS działa', async ({ page }) => {
    await installSupabaseMocks(page, 'admin');
    await mockRpc(page, PATIENT_WITH_PHONE);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Hasło').fill('Admin1234!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/patient/patient-1');
    await expect(page.getByRole('heading', { name: /Pacjent: Jan Kowalski/ })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: 'Komunikacja' }).click();
    await expect(page.getByRole('heading', { name: 'Komunikacja SMS' })).toBeVisible();

    // Przycisk powinien być aktywny (pacjent ma telefon)
    const textarea = page.getByPlaceholder('Napisz wiadomość SMS do pacjenta...');
    await expect(textarea).toBeEnabled();

    await textarea.fill('Hej Jan, przypomnienie o wizycie jutro o 10:00!');
    await page.getByRole('button', { name: 'Wyślij SMS' }).click();

    // SMS powinien pojawić się w historii
    await expect(page.getByText('Hej Jan, przypomnienie o wizycie jutro o 10:00!')).toBeVisible({ timeout: 5_000 });
  });

  test('pacjent BEZ numeru telefonu — przycisk wyślij zablokowany', async ({ page }) => {
    await installSupabaseMocks(page, 'admin');
    await mockRpc(page, PATIENT_NO_PHONE);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Hasło').fill('Admin1234!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/patient/patient-1');
    await expect(page.getByRole('heading', { name: /Pacjent: Anna Brak/ })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: 'Komunikacja' }).click();
    await expect(page.getByRole('heading', { name: 'Komunikacja SMS' })).toBeVisible();

    // Komunikat o braku telefonu
    await expect(page.getByText('Pacjent nie ma ustawionego numeru telefonu')).toBeVisible();

    // Textarea i przycisk zablokowane
    const textarea = page.getByPlaceholder('Napisz wiadomość SMS do pacjenta...');
    await expect(textarea).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Wyślij SMS' })).toBeDisabled();
  });

  test('błąd wysyłania SMS — komunikat błędu widoczny', async ({ page }) => {
    await installSupabaseMocks(page, 'admin');
    await mockRpc(page, PATIENT_WITH_PHONE);

    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@example.com');
    await page.getByLabel('Hasło').fill('Admin1234!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/admin$/);

    await page.goto('/admin/patient/patient-1');
    await expect(page.getByRole('heading', { name: /Pacjent: Jan Kowalski/ })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('tab', { name: 'Komunikacja' }).click();
    await expect(page.getByRole('heading', { name: 'Komunikacja SMS' })).toBeVisible();

    // Wiadomość zawierająca "fail" wywołuje błąd w mocku
    await page.getByPlaceholder('Napisz wiadomość SMS do pacjenta...').fill('fail test');
    await page.getByRole('button', { name: 'Wyślij SMS' }).click();

    // Toast z błędem powinien być widoczny
    await expect(page.getByText(/Nie udało się wysłać SMS|mock provider failure/)).toBeVisible({ timeout: 5_000 });
  });
});
