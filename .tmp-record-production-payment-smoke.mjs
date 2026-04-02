import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const supabaseUrl = 'https://kong-production-d36f.up.railway.app';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzA0MTg4MDAsImV4cCI6MTkyODE4NTIwMH0.2_RFbFXxsBO5B3UsXMqWmebpQ26vDYSCU6qLmLXTyvg';
const admin = createClient(supabaseUrl, serviceKey);
const baseUrl = 'https://app.eavatar.diet';
const reportsDir = path.resolve('reports/production-payment-smoke');
mkdirSync(reportsDir, { recursive: true });

async function seedUser() {
  const stamp = `prod-payment-${Date.now()}`;
  const email = `${stamp}@example.com`;
  const password = 'AvatarE2E123!';
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName: 'Platnosc', lastName: stamp },
  });
  if (createUserError) throw createUserError;
  const userId = createdUser.user.id;

  let { data: patient } = await admin.from('patients').select('id').eq('user_id', userId).maybeSingle();
  if (!patient?.id) {
    const { data: insertedPatient, error: patientError } = await admin
      .from('patients')
      .insert({ user_id: userId, subscription_status: 'Brak' })
      .select('id')
      .single();
    if (patientError) throw patientError;
    patient = insertedPatient;
  }

  await admin.from('profiles').upsert({ user_id: userId, first_name: 'Platnosc', last_name: stamp, phone: '123123123' }, { onConflict: 'user_id' });

  let { data: profiles } = await admin
    .from('person_profiles')
    .select('id, name, is_primary')
    .eq('account_user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (!profiles || profiles.length === 0) {
    const { data: insertedProfile, error: profileError } = await admin
      .from('person_profiles')
      .insert({ account_user_id: userId, name: `Profil główny ${stamp}`, is_primary: true })
      .select('id, name, is_primary')
      .single();
    if (profileError) throw profileError;
    profiles = [insertedProfile];
  }

  const primaryProfile = profiles.find((profile) => profile.is_primary) ?? profiles[0];
  if (!primaryProfile?.id) throw new Error('Missing primary profile');

  await admin.from('profile_access').delete().eq('account_user_id', userId);
  await admin.from('nutrition_interviews').delete().eq('person_profile_id', primaryProfile.id);
  await admin.from('recommendations').delete().eq('patient_id', patient.id);

  return { stamp, email, password, userId, patientId: patient.id, primaryProfileId: primaryProfile.id };
}

async function cleanup(seed) {
  if (!seed) return;
  await admin.from('profile_access').delete().eq('account_user_id', seed.userId);
  await admin.from('nutrition_interviews').delete().eq('person_profile_id', seed.primaryProfileId);
  await admin.from('recommendations').delete().eq('patient_id', seed.patientId);
  await admin.from('patients').delete().eq('id', seed.patientId);
  await admin.from('person_profiles').delete().eq('account_user_id', seed.userId);
  await admin.from('profiles').delete().eq('user_id', seed.userId);
  await admin.auth.admin.deleteUser(seed.userId);
}

const seed = await seedUser();
let browser;
let context;
let page;
const networkErrors = [];
const requestFailures = [];
const consoleErrors = [];

try {
  browser = await chromium.launch({ headless: true, slowMo: 350 });
  context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, recordVideo: { dir: reportsDir, size: { width: 1440, height: 1100 } } });
  page = await context.newPage();

  page.on('response', async (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && (url.includes('kong-production-d36f.up.railway.app') || url.includes('stripe.com'))) {
      networkErrors.push({ status, url, method: response.request().method() });
    }
  });
  page.on('requestfailed', (request) => requestFailures.push({ url: request.url(), method: request.method(), errorText: request.failure()?.errorText ?? 'failed' }));
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(seed.email);
  await page.locator('#password').fill(seed.password);
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard/);
  await page.waitForTimeout(2500);

  await page.goto(`${baseUrl}/payment?group=avatar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.getByText(/Mini Program Startowy/i).first().click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /^Dalej$/i }).click();
  await page.waitForURL(/\/payment\/method/);
  await page.waitForTimeout(2000);
  await page.getByLabel(/Karta kredytowa/i).click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: /^Dalej$/i }).click();
  await page.waitForURL(/\/payment\/checkout/);
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /Przejdź do płatności/i }).click();

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 45000 });
  await page.waitForTimeout(5000);

  const stripeUrl = page.url();
  const stripeTitle = await page.title();

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  const finalVideoPath = path.join(reportsDir, `production-payment-smoke-${Date.now()}.webm`);
  renameSync(videoPath, finalVideoPath);

  const result = {
    success: stripeUrl.includes('checkout.stripe.com'),
    email: seed.email,
    stripeUrl,
    stripeTitle,
    networkErrors,
    requestFailures,
    consoleErrors,
    videoPath: finalVideoPath,
  };
  writeFileSync(path.join(reportsDir, 'production-payment-smoke.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  try { if (context) await context.close(); } catch {}
  try { if (browser) await browser.close(); } catch {}
  await cleanup(seed);
}
