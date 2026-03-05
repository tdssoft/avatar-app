import { Page, Route } from '@playwright/test';

type Mode = 'user' | 'admin';
type MockOptions = {
  userSubscriptionStatus?: string;
  extraReferrals?: Row[];
  seedSentInterviewForPrimaryProfile?: boolean;
  seedJanNoInterviewStaszekSent?: boolean;
  seedRecommendationForPrimaryProfile?: boolean;
  seedMultipleRecommendationsForPrimaryProfile?: boolean;
  seedInterviewSentForAdminProfile?: boolean;
  seedEmailLikePrimaryProfileName?: boolean;
  seedNoPersonProfiles?: boolean;
};

type Row = Record<string, any>;

type Db = Record<string, Row[]>;

const nowIso = new Date().toISOString();

const baseDb = (): Db => ({
  profiles: [
    {
      id: 'profile-user-1',
      user_id: 'user-1',
      first_name: 'Jan',
      last_name: 'Kowalski',
      phone: '123456789',
      avatar_url: null,
      referral_code: 'JAN12345',
    },
    {
      id: 'profile-admin-1',
      user_id: 'admin-1',
      first_name: 'Admin',
      last_name: 'User',
      phone: '987654321',
      avatar_url: null,
      referral_code: 'ADM12345',
    },
  ],
  user_roles: [
    { user_id: 'admin-1', role: 'admin' },
  ],
  patients: [
    {
      id: 'patient-1',
      user_id: 'user-1',
      subscription_status: 'Brak',
      diagnosis_status: 'Oczekuje',
      last_communication_at: nowIso,
      created_at: nowIso,
      tags: ['test'],
    },
  ],
  person_profiles: [
    { id: 'pp-user-1', account_user_id: 'user-1', name: 'Jan Kowalski', is_primary: true, created_at: nowIso },
  ],
  profile_access: [],
  nutrition_interviews: [],
  recommendations: [],
  referrals: [
    {
      referrer_user_id: 'admin-1',
      referrer_code: 'ADM12345',
      referred_user_id: 'user-1',
      referred_email: 'jan@example.com',
      referred_name: 'Jan Kowalski',
      status: 'pending',
    },
  ],
  partner_shop_links: [
    {
      id: 'shop-1',
      partner_user_id: 'admin-1',
      shop_url: 'https://example.com/shop',
      shop_name: 'Sklep testowy',
      added_by_admin_id: 'admin-1',
    },
  ],
  patient_messages: [
    {
      id: 'pm-question-1',
      patient_id: 'patient-1',
      admin_id: null,
      message_type: 'question',
      message_text: 'Czy mogę łączyć suplementy z obecnymi lekami?',
      person_profile_id: 'pp-user-1',
      sent_at: nowIso,
    },
  ],
  patient_notes: [],
  audio_recordings: [],
  patient_result_files: [],
  patient_device_files: [],
  patient_ai_entries: [],
});

const USERS = {
  user: {
    id: 'user-1',
    email: 'jan@example.com',
    password: 'Test1234!',
    user_metadata: {
      firstName: 'Jan',
      lastName: 'Kowalski',
      phone: '123456789',
      referralCode: 'JAN12345',
      onboardingConfirmed: true,
    },
  },
  admin: {
    id: 'admin-1',
    email: 'admin@example.com',
    password: 'Admin1234!',
    user_metadata: {
      firstName: 'Admin',
      lastName: 'User',
      phone: '987654321',
      referralCode: 'ADM12345',
      onboardingConfirmed: true,
    },
  },
};

function json(route: Route, status: number, data: any, headers: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers,
    body: JSON.stringify(data),
  });
}

function parseEq(value: string) {
  return value.startsWith('eq.') ? decodeURIComponent(value.slice(3)) : null;
}

function parseIn(value: string) {
  if (!value.startsWith('in.(') || !value.endsWith(')')) return null;
  return value.slice(4, -1).split(',').map((x) => decodeURIComponent(x.trim()));
}

function matchRow(row: Row, params: URLSearchParams) {
  for (const [key, value] of params.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;

    if (value.startsWith('eq.')) {
      const expected = parseEq(value);
      if (`${row[key] ?? ''}` !== `${expected ?? ''}`) return false;
      continue;
    }

    if (value.startsWith('in.(')) {
      const values = parseIn(value) || [];
      if (!values.includes(`${row[key] ?? ''}`)) return false;
      continue;
    }

    if (value === 'not.is.null') {
      if (row[key] == null) return false;
      continue;
    }

    if (value === 'is.null') {
      if (row[key] != null) return false;
      continue;
    }
  }
  return true;
}

function selectRows(tableRows: Row[], url: URL) {
  let rows = tableRows.filter((row) => matchRow(row, url.searchParams));

  const order = url.searchParams.get('order');
  if (order) {
    const [field, direction] = order.split('.');
    rows = [...rows].sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av === bv) return 0;
      if (direction === 'desc') return av > bv ? -1 : 1;
      return av > bv ? 1 : -1;
    });
  }

  const limitRaw = url.searchParams.get('limit');
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (!Number.isNaN(limit)) rows = rows.slice(0, limit);
  }

  return rows;
}

function authUserResponse(user: any) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: nowIso,
    phone: '',
    confirmed_at: nowIso,
    last_sign_in_at: nowIso,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: user.user_metadata,
    identities: [],
    created_at: nowIso,
    updated_at: nowIso,
  };
}

export async function installSupabaseMocks(page: Page, mode: Mode, options: MockOptions = {}) {
  const db = baseDb();
  if (options.userSubscriptionStatus) {
    const userPatient = db.patients.find((p) => p.user_id === USERS.user.id);
    if (userPatient) {
      userPatient.subscription_status = options.userSubscriptionStatus;
    }
  }
  if (options.extraReferrals?.length) {
    db.referrals.push(...options.extraReferrals);
  }
  if (options.seedSentInterviewForPrimaryProfile) {
    db.nutrition_interviews.push({
      id: "ni-primary-sent",
      person_profile_id: "pp-user-1",
      content: {},
      status: "sent",
      last_updated_at: new Date().toISOString(),
      last_updated_by: USERS.user.id,
    });
  }
  if (options.seedRecommendationForPrimaryProfile) {
    db.recommendations.push({
      id: "rec-primary-1",
      patient_id: "patient-1",
      person_profile_id: "pp-user-1",
      title: "Zalecenie kontrolne",
      diagnosis_summary: "Podsumowanie diagnozy dla profilu Jan.",
      dietary_recommendations: "Kuracja A dla profilu Jan.",
      recommendation_date: nowIso,
      created_at: nowIso,
    });
  }
  if (options.seedMultipleRecommendationsForPrimaryProfile) {
    db.recommendations.push(
      {
        id: "rec-primary-1",
        patient_id: "patient-1",
        person_profile_id: "pp-user-1",
        title: "Zalecenie kontrolne",
        diagnosis_summary: "Podsumowanie diagnozy dla profilu Jan.",
        dietary_recommendations: "Kuracja A dla profilu Jan.",
        recommendation_date: "2026-01-12T00:00:00.000Z",
        created_at: nowIso,
      },
      {
        id: "rec-primary-2",
        patient_id: "patient-1",
        person_profile_id: "pp-user-1",
        title: "Zalecenie rozszerzone",
        diagnosis_summary: "Podsumowanie diagnozy B dla profilu Jan.",
        dietary_recommendations: "Kuracja B dla profilu Jan.",
        recommendation_date: "2026-02-15T00:00:00.000Z",
        created_at: nowIso,
      },
    );
  }
  if (options.seedInterviewSentForAdminProfile) {
    db.nutrition_interviews.push({
      id: "ni-admin-sent",
      person_profile_id: "pp-user-1",
      content: { summary: "sent interview" },
      status: "sent",
      last_updated_at: nowIso,
      last_updated_by: USERS.user.id,
    });
  }
  if (options.seedEmailLikePrimaryProfileName) {
    const primary = db.person_profiles.find((p) => p.id === "pp-user-1");
    if (primary) {
      primary.name = USERS.user.email;
    }
  }
  if (options.seedNoPersonProfiles) {
    db.person_profiles = db.person_profiles.filter((pp) => pp.account_user_id !== USERS.user.id);
  }
  if (options.seedJanNoInterviewStaszekSent) {
    const janProfile = db.person_profiles.find((p) => p.id === "pp-user-1");
    if (janProfile) {
      janProfile.name = "Jan";
      janProfile.is_primary = true;
    }

    const hasStaszek = db.person_profiles.some((p) => p.id === "pp-user-2");
    if (!hasStaszek) {
      db.person_profiles.push({
        id: "pp-user-2",
        account_user_id: USERS.user.id,
        name: "Staszek",
        is_primary: false,
        created_at: nowIso,
      });
    }

    db.profile_access = db.profile_access.filter(
      (pa) => pa.person_profile_id !== "pp-user-1" && pa.person_profile_id !== "pp-user-2",
    );
    db.profile_access.push(
      {
        id: "pa-user-jan",
        person_profile_id: "pp-user-1",
        account_user_id: USERS.user.id,
        status: "active",
        source: "admin",
        stripe_session_id: null,
        stripe_subscription_id: null,
        selected_packages: "pakiet_diagnostyczny",
        activated_at: nowIso,
        expires_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
      {
        id: "pa-user-staszek",
        person_profile_id: "pp-user-2",
        account_user_id: USERS.user.id,
        status: "active",
        source: "admin",
        stripe_session_id: null,
        stripe_subscription_id: null,
        selected_packages: "pakiet_diagnostyczny",
        activated_at: nowIso,
        expires_at: null,
        created_at: nowIso,
        updated_at: nowIso,
      },
    );

    db.nutrition_interviews = db.nutrition_interviews.filter((ni) => ni.person_profile_id !== "pp-user-1");
    db.nutrition_interviews = db.nutrition_interviews.filter((ni) => ni.person_profile_id !== "pp-user-2");
    db.nutrition_interviews.push({
      id: "ni-user-staszek-sent",
      person_profile_id: "pp-user-2",
      content: { summary: "Wywiad wysłany" },
      status: "sent",
      last_updated_at: nowIso,
      last_updated_by: USERS.user.id,
    });

    db.patient_messages.push(
      {
        id: "pm-jan-question-state",
        patient_id: "patient-1",
        admin_id: null,
        message_type: "question",
        message_text: "Jan: pytanie zadane",
        person_profile_id: "pp-user-1",
        sent_at: nowIso,
      },
      {
        id: "pm-staszek-question-state",
        patient_id: "patient-1",
        admin_id: null,
        message_type: "question",
        message_text: "Staszek: pytanie zadane",
        person_profile_id: "pp-user-2",
        sent_at: nowIso,
      },
    );
  }
  if ((options.userSubscriptionStatus || "").toLowerCase() === "aktywna") {
    db.profile_access.push({
      id: "pa-user-primary",
      person_profile_id: "pp-user-1",
      account_user_id: USERS.user.id,
      status: "active",
      source: "stripe",
      stripe_session_id: null,
      stripe_subscription_id: null,
      selected_packages: "mini",
      activated_at: nowIso,
      expires_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }
  const tokenUserMap: Record<string, any> = {};
  const dynamicUsers: any[] = [USERS.user, USERS.admin];

  const getUserByEmail = (email: string) =>
    dynamicUsers.find((u) => `${u.email}`.toLowerCase() === `${email}`.toLowerCase());

  const upsertCoreRowsForUser = (user: any) => {
    let profile = db.profiles.find((p) => p.user_id === user.id);
    if (!profile) {
      profile = {
        id: `profile-${Math.random().toString(36).slice(2, 8)}`,
        user_id: user.id,
        first_name: user.user_metadata?.firstName || null,
        last_name: user.user_metadata?.lastName || null,
        phone: user.user_metadata?.phone || null,
        avatar_url: null,
        referral_code: user.user_metadata?.referralCode || null,
      };
      db.profiles.push(profile);
    }

    const hasPatient = db.patients.some((p) => p.user_id === user.id);
    if (!hasPatient) {
      db.patients.push({
        id: `patient-${Math.random().toString(36).slice(2, 8)}`,
        user_id: user.id,
        subscription_status: "Brak",
        diagnosis_status: "Brak",
        last_communication_at: null,
        created_at: nowIso,
        updated_at: nowIso,
        tags: [],
      });
    }

    const hasPrimaryProfile = db.person_profiles.some((pp) => pp.account_user_id === user.id && pp.is_primary);
    if (!hasPrimaryProfile) {
      const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "—";
      db.person_profiles.push({
        id: `pp-${Math.random().toString(36).slice(2, 8)}`,
        account_user_id: user.id,
        name: fullName,
        is_primary: true,
        created_at: nowIso,
      });
    }
  };

  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();

    if (url.pathname.includes('/auth/v1/token') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const candidate = dynamicUsers.find(
        (u) => `${u.email}`.toLowerCase() === `${body.email || ""}`.toLowerCase() && u.password === body.password
      );
      if (!candidate) {
        return json(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      }

      const token = `token-${candidate.id}`;
      tokenUserMap[token] = candidate;

      return json(route, 200, {
        access_token: token,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `refresh-${candidate.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: authUserResponse(candidate),
      });
    }

    if (url.pathname.includes('/auth/v1/signup') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const email = `${body?.email || ''}`.trim().toLowerCase();
      const password = `${body?.password || ''}`;
      if (!email || !password) {
        return json(route, 400, { error: 'invalid_request', error_description: 'Missing email or password' });
      }

      if (getUserByEmail(email)) {
        return json(route, 400, { error: 'User already registered' });
      }

      const newUser = {
        id: `user-${Math.random().toString(36).slice(2, 8)}`,
        email,
        password,
        user_metadata: {
          ...(body?.data || {}),
        },
      };
      dynamicUsers.push(newUser);
      upsertCoreRowsForUser(newUser);

      return json(route, 200, {
        user: authUserResponse(newUser),
        session: null,
      });
    }

    if (url.pathname.includes('/auth/v1/user') && method === 'GET') {
      const bearer = (req.headers()['authorization'] || '').replace('Bearer ', '');
      const fallback = mode === 'admin' ? USERS.admin : USERS.user;
      const user = tokenUserMap[bearer] || fallback;
      const response = authUserResponse(user);
      // Keep compatibility with different auth client response parsing strategies.
      return json(route, 200, { ...response, user: response });
    }

    if (url.pathname.includes('/auth/v1/user') && method === 'PUT') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }
      const bearer = (req.headers()['authorization'] || '').replace('Bearer ', '');
      const fallback = mode === 'admin' ? USERS.admin : USERS.user;
      const user = tokenUserMap[bearer] || fallback;

      if (body?.data && typeof body.data === 'object') {
        user.user_metadata = {
          ...user.user_metadata,
          ...body.data,
        };
      }

      const response = authUserResponse(user);
      return json(route, 200, { ...response, user: response });
    }

    if (url.pathname.includes('/auth/v1/recover') && method === 'POST') {
      return json(route, 200, {});
    }

    if (url.pathname.includes('/auth/v1/logout')) {
      return json(route, 200, {});
    }

    if (url.pathname.includes('/functions/v1/send-question-notification')) {
      return json(route, 200, { ok: true });
    }

    if (url.pathname.includes('/functions/v1/admin-get-patient-contact') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }
      if (`${body?.patientId || ''}` === 'patient-1') {
        return json(route, 200, { email: USERS.user.email });
      }
      return json(route, 404, { error: 'Patient not found' });
    }

    if (url.pathname.includes('/functions/v1/post-signup') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const userId = `${body?.userId || ''}`.trim();
      const email = `${body?.email || ''}`.trim().toLowerCase();
      const firstName = `${body?.firstName || ''}`.trim();
      const lastName = `${body?.lastName || ''}`.trim();
      const phone = `${body?.phone || ''}`.trim();
      const referralCode = `${body?.referralCode || ''}`.trim();

      if (!userId || !email || !firstName || !lastName) {
        return json(route, 400, { error: 'Missing required fields' });
      }

      let user = dynamicUsers.find((u) => u.id === userId);
      if (!user) {
        user = { id: userId, email, password: 'Temp1234!', user_metadata: {} };
        dynamicUsers.push(user);
      }
      user.user_metadata = {
        ...user.user_metadata,
        firstName,
        lastName,
        phone,
        referralCode,
        onboardingConfirmed: true,
      };

      upsertCoreRowsForUser(user);

      const profile = db.profiles.find((p) => p.user_id === userId);
      if (profile) {
        profile.first_name = firstName;
        profile.last_name = lastName;
        profile.phone = phone || null;
        profile.referral_code = referralCode || profile.referral_code;
      }

      const primary = db.person_profiles.find((pp) => pp.account_user_id === userId && pp.is_primary);
      if (primary) {
        primary.name = `${firstName} ${lastName}`.trim() || '—';
      }

      return json(route, 200, { success: true });
    }

    if (url.pathname.includes('/functions/v1/admin-create-patient') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const firstName = `${body?.firstName || ''}`.trim();
      const lastName = `${body?.lastName || ''}`.trim();
      const email = `${body?.email || ''}`.trim().toLowerCase();
      const phone = `${body?.phone || ''}`.trim();
      if (!firstName || !lastName || !email) {
        return json(route, 400, { error: 'Missing required fields (firstName, lastName, email)' });
      }

      if (getUserByEmail(email)) {
        return json(route, 400, { error: 'User already registered' });
      }

      const userId = `user-${Math.random().toString(36).slice(2, 8)}`;
      const user = {
        id: userId,
        email,
        password: 'Temp1234!',
        user_metadata: {
          firstName,
          lastName,
          phone,
          referralCode: `REF${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          onboardingConfirmed: true,
        },
      };
      dynamicUsers.push(user);
      upsertCoreRowsForUser(user);

      const profile = db.profiles.find((p) => p.user_id === userId);
      if (profile) {
        profile.first_name = firstName;
        profile.last_name = lastName;
        profile.phone = phone || null;
      }

      const primary = db.person_profiles.find((pp) => pp.account_user_id === userId && pp.is_primary);
      if (primary) {
        primary.name = `${firstName} ${lastName}`.trim() || '—';
      }

      const patient = db.patients.find((p) => p.user_id === userId);

      return json(route, 200, {
        success: true,
        userId,
        patientId: patient?.id || null,
        message: 'Patient account created successfully',
        emailSent: true,
        tempPassword: 'Temp1234!',
      });
    }

    if (url.pathname.includes('/functions/v1/admin-delete-user') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const patientId = `${body?.patient_id || ''}`.trim();
      if (!patientId) {
        return json(route, 400, { error: 'Brak ID pacjenta' });
      }

      const patient = db.patients.find((p) => `${p.id}` === patientId);
      if (!patient) {
        return json(route, 404, { error: 'Nie znaleziono pacjenta' });
      }

      const userId = `${patient.user_id}`;
      if (mode === 'admin' && userId === USERS.admin.id) {
        return json(route, 400, { error: 'Nie możesz usunąć własnego konta' });
      }

      const profileIds = db.person_profiles
        .filter((pp) => pp.account_user_id === userId)
        .map((pp) => pp.id);

      db.patient_ai_entries = db.patient_ai_entries.filter((r) => `${r.patient_id}` !== patientId);
      db.patient_device_files = db.patient_device_files.filter((r) => `${r.patient_id}` !== patientId);
      db.patient_result_files = db.patient_result_files.filter((r) => `${r.patient_id}` !== patientId);
      db.patient_messages = db.patient_messages.filter((r) => `${r.patient_id}` !== patientId);
      db.patient_notes = db.patient_notes.filter((r) => `${r.patient_id}` !== patientId);
      db.recommendations = db.recommendations.filter((r) => `${r.patient_id}` !== patientId);
      db.nutrition_interviews = db.nutrition_interviews.filter((r) => !profileIds.includes(`${r.person_profile_id}`));
      db.audio_recordings = db.audio_recordings.filter(
        (r) => `${r.recorded_by}` !== userId && !profileIds.includes(`${r.person_profile_id}`)
      );
      db.profile_access = db.profile_access.filter(
        (r) => `${r.account_user_id}` !== userId && !profileIds.includes(`${r.person_profile_id}`)
      );
      db.person_profiles = db.person_profiles.filter((r) => `${r.account_user_id}` !== userId);
      db.patients = db.patients.filter((r) => `${r.id}` !== patientId);
      db.profiles = db.profiles.filter((r) => `${r.user_id}` !== userId);
      db.user_roles = db.user_roles.filter((r) => `${r.user_id}` !== userId);
      db.referrals = db.referrals.filter(
        (r) => `${r.referred_user_id}` !== userId && `${r.referrer_user_id}` !== userId
      );
      db.partner_shop_links = db.partner_shop_links.filter((r) => `${r.partner_user_id}` !== userId);

      const userIdx = dynamicUsers.findIndex((u) => `${u.id}` === userId);
      if (userIdx >= 0) dynamicUsers.splice(userIdx, 1);

      return json(route, 200, { success: true, message: 'Użytkownik został usunięty' });
    }

    if (url.pathname.includes('/functions/v1/admin-ensure-person-profile') && method === 'POST') {
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const patientId = `${body?.patientId || ''}`.trim();
      const accountUserIdRaw = `${body?.accountUserId || ''}`.trim();
      let accountUserId = accountUserIdRaw;
      if (!accountUserId && patientId) {
        const patient = db.patients.find((p) => `${p.id}` === patientId);
        accountUserId = patient?.user_id || "";
      }
      if (!accountUserId) {
        return json(route, 400, { error: 'Brak accountUserId lub patientId' });
      }

      const existingPrimary = db.person_profiles.find((p) => p.account_user_id === accountUserId && p.is_primary);
      const profile = db.profiles.find((p) => p.user_id === accountUserId);
      const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '—';

      if (!existingPrimary) {
        const created = {
          id: `pp-${Math.random().toString(36).slice(2, 8)}`,
          account_user_id: accountUserId,
          name: fullName,
          is_primary: true,
          created_at: nowIso,
        };
        db.person_profiles.push(created);
        return json(route, 200, { success: true, person_profile_id: created.id, name: created.name });
      }

      if (!existingPrimary.name || `${existingPrimary.name}`.includes('@')) {
        existingPrimary.name = fullName;
      }
      return json(route, 200, { success: true, person_profile_id: existingPrimary.id, name: existingPrimary.name });
    }

    if (url.pathname.includes('/storage/v1/object/sign/') && method === 'POST') {
      const parts = url.pathname.split('/storage/v1/object/sign/')[1]?.split('/') || [];
      const bucket = parts.shift() || 'mock-bucket';
      const filePath = decodeURIComponent(parts.join('/'));
      return json(route, 200, { signedURL: `https://mock.storage/${bucket}/${filePath}?token=mock` });
    }

    if (url.pathname.includes('/storage/v1/object/') && (method === 'POST' || method === 'PUT')) {
      return json(route, 200, { Key: 'mock-uploaded' });
    }

    if (url.pathname.includes('/storage/v1/object/') && method === 'DELETE') {
      return json(route, 200, {});
    }

    if (url.pathname.includes('/functions/v1/create-checkout-session')) {
      const userPatient = db.patients.find((p) => p.user_id === USERS.user.id);
      if (userPatient) {
        userPatient.subscription_status = 'Aktywna';
      }
      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }
      if (body?.profile_id) {
        db.profile_access = db.profile_access.filter((r) => r.person_profile_id !== body.profile_id);
        db.profile_access.push({
          id: `pa-${Math.random().toString(36).slice(2, 8)}`,
          person_profile_id: body.profile_id,
          account_user_id: USERS.user.id,
          status: "active",
          source: "stripe",
          stripe_session_id: "cs_mock",
          stripe_subscription_id: null,
          selected_packages: Array.isArray(body?.packages) ? body.packages.join(",") : "mini",
          activated_at: new Date().toISOString(),
          expires_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      return json(route, 200, { url: 'https://checkout.stripe.com/mock-session' });
    }

    if (url.pathname.includes('/functions/v1/send-patient-sms') && method === 'POST') {
      if (mode !== 'admin') {
        return json(route, 403, { error: 'Brak uprawnień administratora' });
      }

      let body: any = {};
      try {
        body = req.postDataJSON();
      } catch {
        body = {};
      }

      const messageText = `${body?.message_text || ''}`.trim();
      const patientId = `${body?.patient_id || ''}`.trim();

      if (!patientId || !messageText) {
        return json(route, 400, { error: 'Brak wymaganych pól: patient_id, message_text' });
      }

      if (messageText.toLowerCase().includes('fail')) {
        return json(route, 502, { error: 'Nie udało się wysłać SMS: mock provider failure' });
      }

      const newMessage = {
        id: `pm-sms-${Math.random().toString(36).slice(2, 8)}`,
        patient_id: patientId,
        admin_id: USERS.admin.id,
        message_type: 'sms',
        message_text: messageText,
        person_profile_id: body?.person_profile_id || null,
        sent_at: new Date().toISOString(),
      };

      db.patient_messages.push(newMessage);
      return json(route, 200, { success: true, message: 'SMS sent successfully', twilio_sid: 'SM_MOCK_SID' });
    }

    if (url.pathname.includes('/rest/v1/')) {
      const table = url.pathname.split('/rest/v1/')[1];
      const rows = db[table] || [];

      if (method === 'HEAD') {
        const selected = selectRows(rows, url);
        const count = selected.length;
        const contentRange = count > 0 ? `0-${count - 1}/${count}` : '*/0';
        return route.fulfill({
          status: 200,
          headers: {
            'content-range': contentRange,
            'access-control-expose-headers': 'content-range',
          },
          body: '',
        });
      }

      if (method === 'GET') {
        const selected = selectRows(rows, url);
        const accept = req.headers()['accept'] || '';
        const wantsObject = accept.includes('application/vnd.pgrst.object+json');

        if (wantsObject) {
          if (selected.length === 0) {
            return json(route, 406, { message: 'JSON object requested, multiple (or no) rows returned' });
          }
          return json(route, 200, selected[0]);
        }

        return json(route, 200, selected);
      }

      if (method === 'POST') {
        let payload: any = {};
        try {
          payload = req.postDataJSON();
        } catch {
          payload = {};
        }

        const toInsert = Array.isArray(payload) ? payload : [payload];
        const inserted = toInsert.map((row) => {
          const withId = {
            ...row,
            id: row.id || `${table}-${rows.length + Math.random().toString(36).slice(2, 8)}`,
            created_at: row.created_at ?? nowIso,
            uploaded_at: row.uploaded_at ?? nowIso,
            sent_at: row.sent_at ?? nowIso,
          };
          rows.push(withId);
          return withId;
        });
        db[table] = rows;

        const prefer = req.headers()['prefer'] || '';
        if (prefer.includes('return=representation')) {
          const accept = req.headers()['accept'] || '';
          const wantsObject = accept.includes('application/vnd.pgrst.object+json');
          return json(route, 201, wantsObject ? inserted[0] : inserted);
        }

        return route.fulfill({ status: 201, body: '' });
      }

      if (method === 'PATCH') {
        let payload: any = {};
        try {
          payload = req.postDataJSON();
        } catch {
          payload = {};
        }

        const selected = selectRows(rows, url);
        const updated = selected.map((row) => {
          Object.assign(row, payload);
          return row;
        });

        const prefer = req.headers()['prefer'] || '';
        if (prefer.includes('return=representation')) {
          const accept = req.headers()['accept'] || '';
          const wantsObject = accept.includes('application/vnd.pgrst.object+json');
          return json(route, 200, wantsObject ? updated[0] : updated);
        }

        return route.fulfill({ status: 204, body: '' });
      }

      if (method === 'DELETE') {
        const selected = selectRows(rows, url);
        db[table] = rows.filter((row) => !selected.includes(row));
        return route.fulfill({ status: 204, body: '' });
      }
    }

    return route.continue();
  });
}
