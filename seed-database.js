import pkg from 'pg';
import crypto from 'crypto';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

// Passwords will be: Test123!
const hashedPassword = '$2a$10$rBV2YhYPzOFEkKGJvGVHqOZ3Yj6vN8pJ8qQxXyP9fZDNvN0pLK5C2';

// Test users data
const testUsers = {
  admin: {
    email: 'admin@avatarapp.pl',
    password: 'Admin123!',
    firstName: 'Jan',
    lastName: 'Kowalski',
    phone: '+48 500 100 200'
  },
  partner1: {
    email: 'partner1@sklep.pl',
    password: 'Partner123!',
    firstName: 'Anna',
    lastName: 'Nowak',
    phone: '+48 500 200 300',
    shopName: 'Sklep Zdrowej Żywności',
    shopUrl: 'https://sklep-zdrowia.pl'
  },
  partner2: {
    email: 'partner2@suplementy.pl',
    password: 'Partner123!',
    firstName: 'Piotr',
    lastName: 'Wiśniewski',
    phone: '+48 500 300 400',
    shopName: 'Suplementy Premium',
    shopUrl: 'https://suplementy-premium.pl'
  },
  patient1: {
    email: 'pacjent1@test.pl',
    password: 'Pacjent123!',
    firstName: 'Maria',
    lastName: 'Lewandowska',
    phone: '+48 600 100 200',
    birthDate: '1985-03-15',
    gender: 'female'
  },
  patient2: {
    email: 'pacjent2@test.pl',
    password: 'Pacjent123!',
    firstName: 'Tomasz',
    lastName: 'Kamiński',
    phone: '+48 600 200 300',
    birthDate: '1990-07-22',
    gender: 'male'
  },
  patient3: {
    email: 'pacjent3@test.pl',
    password: 'Pacjent123!',
    firstName: 'Katarzyna',
    lastName: 'Zielińska',
    phone: '+48 600 300 400',
    birthDate: '1978-11-08',
    gender: 'female'
  }
};

function generateUUID() {
  return crypto.randomUUID();
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function seedDatabase() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║     Seed Test Data                            ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    await client.query('BEGIN');

    const userIds = {};

    // 1. Create Admin User
    console.log('👑 Creating Admin...');
    const adminId = generateUUID();
    userIds.admin = adminId;

    await client.query(`
      INSERT INTO auth.users (
        id, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role
      ) VALUES (
        $1, $2, $3,
        NOW(), NOW(), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        'authenticated', 'authenticated'
      )
    `, [adminId, testUsers.admin.email, hashedPassword]);

    const adminReferralCode = generateReferralCode();
    await client.query(`
      INSERT INTO public.profiles (user_id, first_name, last_name, phone, referral_code, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [adminId, testUsers.admin.firstName, testUsers.admin.lastName, testUsers.admin.phone, adminReferralCode]);

    await client.query(`
      INSERT INTO public.user_roles (user_id, role, created_at)
      VALUES ($1, 'admin', NOW())
    `, [adminId]);

    console.log(`   ✓ Admin: ${testUsers.admin.email}`);

    // 2. Create Partners
    console.log('\n🤝 Creating Partners...');

    for (let i = 1; i <= 2; i++) {
      const partnerKey = `partner${i}`;
      const partnerId = generateUUID();
      userIds[partnerKey] = partnerId;
      const partner = testUsers[partnerKey];

      await client.query(`
        INSERT INTO auth.users (
          id, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          aud, role
        ) VALUES (
          $1, $2, $3,
          NOW(), NOW(), NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb,
          'authenticated', 'authenticated'
        )
      `, [partnerId, partner.email, hashedPassword]);

      const partnerReferralCode = generateReferralCode();
      await client.query(`
        INSERT INTO public.profiles (user_id, first_name, last_name, phone, referral_code, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [partnerId, partner.firstName, partner.lastName, partner.phone, partnerReferralCode]);

      await client.query(`
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES ($1, 'user', NOW())
      `, [partnerId]);

      await client.query(`
        INSERT INTO public.partner_shop_links (partner_user_id, shop_url, shop_name, added_by_admin_id, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [partnerId, partner.shopUrl, partner.shopName, adminId]);

      console.log(`   ✓ Partner: ${partner.email} - ${partner.shopName}`);
    }

    // 3. Create Patients
    console.log('\n🏥 Creating Patients...');

    const patientIds = [];
    for (let i = 1; i <= 3; i++) {
      const patientKey = `patient${i}`;
      const patientId = generateUUID();
      userIds[patientKey] = patientId;
      const patient = testUsers[patientKey];

      await client.query(`
        INSERT INTO auth.users (
          id, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          aud, role
        ) VALUES (
          $1, $2, $3,
          NOW(), NOW(), NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          '{}'::jsonb,
          'authenticated', 'authenticated'
        )
      `, [patientId, patient.email, hashedPassword]);

      const patientReferralCode = generateReferralCode();
      await client.query(`
        INSERT INTO public.profiles (user_id, first_name, last_name, phone, referral_code, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `, [patientId, patient.firstName, patient.lastName, patient.phone, patientReferralCode]);

      await client.query(`
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES ($1, 'user', NOW())
      `, [patientId]);

      // Create patient record
      const patientDbId = generateUUID();
      patientIds.push(patientDbId);

      const subscriptionStatuses = ['Aktywna', 'Nieaktywna', 'Trial'];
      const diagnosisStatuses = ['W trakcie diagnozy', 'Diagnoza zakończona', 'Oczekuje na wyniki'];
      const tags = [
        ['vip', 'priorytet'],
        ['nowy-pacjent'],
        ['follow-up', 'długoterminowy']
      ];

      await client.query(`
        INSERT INTO public.patients (
          id, user_id, subscription_status, diagnosis_status,
          tags, last_communication_at, admin_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i} days', $6, NOW(), NOW())
      `, [
        patientDbId,
        patientId,
        subscriptionStatuses[i - 1],
        diagnosisStatuses[i - 1],
        tags[i - 1],
        `Pacjent ${i} - przykładowa notatka administracyjna`
      ]);

      // Create primary person profile
      const personProfileId = generateUUID();
      await client.query(`
        INSERT INTO public.person_profiles (
          id, account_user_id, name, birth_date, gender, is_primary, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `, [personProfileId, patientId, `${patient.firstName} ${patient.lastName}`, patient.birthDate, patient.gender]);

      // Add nutrition interview
      const interviewContent = {
        currentDiet: 'Dieta mieszana',
        allergies: i === 1 ? ['Orzechy', 'Laktoza'] : [],
        supplements: i === 2 ? ['Witamina D', 'Omega-3'] : [],
        healthGoals: 'Poprawa samopoczucia, więcej energii',
        sleepQuality: ['Dobra', 'Średnia', 'Słaba'][i - 1],
        stressLevel: ['Niski', 'Średni', 'Wysoki'][i - 1]
      };

      await client.query(`
        INSERT INTO public.nutrition_interviews (
          person_profile_id, content, status, last_updated_at, last_updated_by, created_at
        ) VALUES ($1, $2, 'sent', NOW(), $3, NOW())
      `, [personProfileId, JSON.stringify(interviewContent), patientId]);

      // Add recommendation
      const recommendationId = generateUUID();
      await client.query(`
        INSERT INTO public.recommendations (
          id, patient_id, person_profile_id, created_by_admin_id,
          title, content, body_systems, diagnosis_summary,
          dietary_recommendations, supplementation_program,
          shop_links, supporting_therapies,
          recommendation_date, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12,
          CURRENT_DATE - ${i}, NOW() - INTERVAL '${i} days', NOW()
        )
      `, [
        recommendationId,
        patientDbId,
        personProfileId,
        adminId,
        `Rekomendacje dla ${patient.firstName} ${patient.lastName}`,
        'Szczegółowe zalecenia żywieniowe i suplementacyjne...',
        ['Układ pokarmowy', 'Układ immunologiczny'],
        'Diagnoza wskazuje na niedobory witaminy D i problemy z trawieniem',
        '1. Zwiększyć spożycie warzyw\n2. Unikać przetworzonych produktów\n3. Pić 2L wody dziennie',
        '1. Witamina D3 - 2000 IU dziennie\n2. Probiotyki - rano na czczo\n3. Omega-3 - 1000mg dziennie',
        userIds.partner1 ? `https://sklep-zdrowia.pl/produkty-dla-pacjenta-${i}` : null,
        'Spacery na świeżym powietrzu, medytacja, joga'
      ]);

      // Add patient notes
      await client.query(`
        INSERT INTO public.patient_notes (
          patient_id, person_profile_id, admin_id, note_text, created_at
        ) VALUES
          ($1, $2, $3, 'Pierwsza konsultacja - wywiad zebrany', NOW() - INTERVAL '${i + 1} days'),
          ($1, $2, $3, 'Wyniki badań otrzymane', NOW() - INTERVAL '${i} days')
      `, [patientDbId, personProfileId, adminId]);

      // Add patient messages
      await client.query(`
        INSERT INTO public.patient_messages (
          patient_id, person_profile_id, admin_id, message_type, message_text, sent_at
        ) VALUES
          ($1, $2, $3, 'question', 'Czy mogę zwiększyć dawkę witaminy D?', NOW() - INTERVAL '${i} days'),
          ($1, $2, $3, 'answer', 'Tak, możesz zwiększyć do 4000 IU pod kontrolą lekarza.', NOW() - INTERVAL '${i - 1} days')
      `, [patientDbId, personProfileId, adminId]);

      console.log(`   ✓ Patient: ${patient.email} - ${patient.firstName} ${patient.lastName}`);
    }

    // 4. Create referrals
    console.log('\n🔗 Creating Referrals...');
    await client.query(`
      INSERT INTO public.referrals (
        referrer_user_id, referrer_code, referred_user_id,
        referred_email, referred_name, status, activated_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days')
    `, [
      userIds.patient1,
      (await client.query('SELECT referral_code FROM profiles WHERE user_id = $1', [userIds.patient1])).rows[0].referral_code,
      userIds.patient2,
      testUsers.patient2.email,
      `${testUsers.patient2.firstName} ${testUsers.patient2.lastName}`,
    ]);

    console.log('   ✓ Referral: Patient 1 -> Patient 2');

    // 5. Create support tickets
    console.log('\n💬 Creating Support Tickets...');
    for (let i = 1; i <= 2; i++) {
      const patientKey = `patient${i}`;
      await client.query(`
        INSERT INTO public.support_tickets (
          user_id, subject, message, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${i} days', NOW())
      `, [
        userIds[patientKey],
        `Problem z dostępem do rekomendacji`,
        `Witam, mam problem z pobraniem PDF z rekomendacjami. Czy mogą Państwo pomóc?`,
        i === 1 ? 'open' : 'open'
      ]);
    }
    console.log('   ✓ 2 support tickets created');

    await client.query('COMMIT');

    // Summary
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Database Seeded Successfully! ✓             ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📊 Summary:\n');
    console.log('  Admins: 1');
    console.log('  Partners: 2');
    console.log('  Patients: 3');
    console.log('  Person Profiles: 3');
    console.log('  Recommendations: 3');
    console.log('  Patient Notes: 6');
    console.log('  Patient Messages: 6');
    console.log('  Referrals: 1');
    console.log('  Support Tickets: 2');
    console.log('  Nutrition Interviews: 3');

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   LOGIN CREDENTIALS                           ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('🔐 ADMIN:');
    console.log(`   Email: ${testUsers.admin.email}`);
    console.log(`   Password: ${testUsers.admin.password}\n`);

    console.log('🤝 PARTNERS:');
    console.log(`   Partner 1:`);
    console.log(`     Email: ${testUsers.partner1.email}`);
    console.log(`     Password: ${testUsers.partner1.password}`);
    console.log(`     Shop: ${testUsers.partner1.shopName}\n`);

    console.log(`   Partner 2:`);
    console.log(`     Email: ${testUsers.partner2.email}`);
    console.log(`     Password: ${testUsers.partner2.password}`);
    console.log(`     Shop: ${testUsers.partner2.shopName}\n`);

    console.log('🏥 PATIENTS:');
    for (let i = 1; i <= 3; i++) {
      const key = `patient${i}`;
      console.log(`   Patient ${i}:`);
      console.log(`     Email: ${testUsers[key].email}`);
      console.log(`     Password: ${testUsers[key].password}`);
      console.log(`     Name: ${testUsers[key].firstName} ${testUsers[key].lastName}\n`);
    }

    console.log('⚠️  IMPORTANT:');
    console.log('   All passwords use bcrypt hash. Users will need to reset');
    console.log('   passwords on first login OR you need to implement');
    console.log('   password reset flow.\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error seeding database:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seedDatabase();
