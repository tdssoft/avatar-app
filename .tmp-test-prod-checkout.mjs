import { createClient } from '@supabase/supabase-js';

const url = 'https://kong-production-d36f.up.railway.app';
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzcwNDE4ODAwLCJleHAiOjE5MjgxODUyMDB9.6ohjHDfOOw3rWchpo5KQpcBUc1UxkFubEfShngBxtRA';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3NzA0MTg4MDAsImV4cCI6MTkyODE4NTIwMH0.2_RFbFXxsBO5B3UsXMqWmebpQ26vDYSCU6qLmLXTyvg';
const admin = createClient(url, serviceKey);
const client = createClient(url, anon);

const stamp = `stripe-diag-${Date.now()}`;
const email = `${stamp}@example.com`;
const password = 'AvatarE2E123!';
let userId;
let patientId;
let profileId;
try {
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { firstName: 'Stripe', lastName: stamp },
  });
  if (createUserError) throw createUserError;
  userId = createdUser.user.id;
  const { data: patient } = await admin.from('patients').select('id').eq('user_id', userId).maybeSingle();
  patientId = patient?.id;
  const { data: profiles } = await admin.from('person_profiles').select('id').eq('account_user_id', userId).order('is_primary', { ascending: false }).limit(1);
  profileId = profiles?.[0]?.id;
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  const token = signInData.session?.access_token;
  if (!token) throw new Error('No access token');
  const res = await fetch(`${url}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anon,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      packages: ['mini'],
      origin: 'https://app.eavatar.diet',
      payment_method: 'card',
      profile_id: profileId,
    }),
  });
  const text = await res.text();
  console.log(JSON.stringify({ status: res.status, body: text }, null, 2));
} finally {
  if (patientId) await admin.from('patients').delete().eq('id', patientId);
  if (profileId) await admin.from('person_profiles').delete().eq('id', profileId);
  if (userId) {
    await admin.from('profiles').delete().eq('user_id', userId);
    await admin.auth.admin.deleteUser(userId);
  }
}
