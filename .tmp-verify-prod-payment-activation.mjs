import crypto from 'node:crypto';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const supabaseUrl = 'https://kong-production-d36f.up.railway.app';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcwNDE4ODAwLCJleHAiOjE5MjgxODUyMDB9.6ohjHDfOOw3rWchpo5KQpcBUc1UxkFubEfShngBxtRA';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzA0MTg4MDAsImV4cCI6MTkyODE4NTIwMH0.2_RFbFXxsBO5B3UsXMqWmebpQ26vDYSCU6qLmLXTyvg';
const webhookSecret = 'whsec_e2e_test_only';
const webhookUrl = 'https://kong-production-d36f.up.railway.app/functions/v1/stripe-webhook';
const appUrl = 'https://app.eavatar.diet';
const reportsDir = path.resolve('reports/production-payment-activation');
mkdirSync(reportsDir, { recursive: true });
const admin = createClient(supabaseUrl, serviceKey);

function signPayload(body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${body}`;
  const sig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
  return `t=${timestamp},v1=${sig}`;
}

async function seedUser() {
  const stamp = `prod-activation-${Date.now()}`;
  const email = `${stamp}@example.com`;
  const password = 'AvatarE2E123!';
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName: 'Aktywacja', lastName: stamp },
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

  await admin.from('profiles').upsert({ user_id: userId, first_name: 'Aktywacja', last_name: stamp, phone: '123123123' }, { onConflict: 'user_id' });

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
  await admin.from('patients').update({ subscription_status: 'Brak' }).eq('id', patient.id);

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
try {
  const event = {
    id: `evt_prod_activation_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_live_simulated_${Date.now()}`,
        client_reference_id: seed.userId,
        metadata: {
          user_id: seed.userId,
          profile_id: seed.primaryProfileId,
          selected_packages: 'mini',
          payment_method: 'card',
        },
        subscription: null,
      },
    },
  };
  const body = JSON.stringify(event);
  const webhookRes = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': signPayload(body),
    },
    body,
  });
  const webhookText = await webhookRes.text();

  const { data: accessRow, error: accessError } = await admin
    .from('profile_access')
    .select('person_profile_id, status, selected_packages, source')
    .eq('person_profile_id', seed.primaryProfileId)
    .eq('account_user_id', seed.userId)
    .maybeSingle();
  if (accessError) throw accessError;

  const { data: patientRow, error: patientError } = await admin
    .from('patients')
    .select('subscription_status')
    .eq('id', seed.patientId)
    .single();
  if (patientError) throw patientError;

  browser = await chromium.launch({ headless: true, slowMo: 250 });
  context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, recordVideo: { dir: reportsDir, size: { width: 1440, height: 1100 } } });
  page = await context.newPage();

  await page.goto(`${appUrl}/login`, { waitUntil: 'networkidle' });
  await page.locator('#email').fill(seed.email);
  await page.locator('#password').fill(seed.password);
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: /log in/i }).click();
  await page.waitForURL(/\/dashboard/);
  await page.waitForTimeout(1500);
  await page.goto(`${appUrl}/payment/success`, { waitUntil: 'networkidle' });
  await page.waitForURL(/\/interview/, { timeout: 20000 });
  await page.waitForTimeout(3000);

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  const finalVideoPath = path.join(reportsDir, `production-payment-activation-${Date.now()}.webm`);
  renameSync(videoPath, finalVideoPath);

  const result = {
    success: webhookRes.ok && accessRow?.status === 'active' && patientRow.subscription_status === 'Aktywna',
    webhookStatus: webhookRes.status,
    webhookText,
    accessRow,
    patientRow,
    finalUrl: page?.url?.() ?? null,
    videoPath: finalVideoPath,
    seed: { email: seed.email, primaryProfileId: seed.primaryProfileId },
  };
  writeFileSync(path.join(reportsDir, 'production-payment-activation.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  try { if (context) await context.close(); } catch {}
  try { if (browser) await browser.close(); } catch {}
  await cleanup(seed);
}
