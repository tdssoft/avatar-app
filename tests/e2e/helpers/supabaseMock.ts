import { Page, Route } from '@playwright/test';

type Mode = 'user' | 'admin';
type MockOptions = {
  userSubscriptionStatus?: string;
  extraReferrals?: Row[];
  seedSentInterviewForPrimaryProfile?: boolean;
  seedJanNoInterviewStaszekSent?: boolean;
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

      const candidate = Object.values(USERS).find((u) => u.email === body.email && u.password === body.password);
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
          const withId = { ...row, id: row.id || `${table}-${rows.length + Math.random().toString(36).slice(2, 8)}` };
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
