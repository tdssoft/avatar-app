import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function listUsers() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Database Users List                       ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get users from auth.users
    console.log('👥 Users from auth.users:\n');
    const authUsers = await client.query(`
      SELECT
        id,
        email,
        created_at,
        confirmed_at,
        last_sign_in_at,
        raw_user_meta_data,
        aud,
        role
      FROM auth.users
      ORDER BY created_at DESC;
    `);

    if (authUsers.rows.length === 0) {
      console.log('   No users found in auth.users\n');
    } else {
      authUsers.rows.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Created: ${user.created_at}`);
        console.log(`   Confirmed: ${user.confirmed_at || 'Not confirmed'}`);
        console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Audience: ${user.aud}`);
        if (user.raw_user_meta_data && Object.keys(user.raw_user_meta_data).length > 0) {
          console.log(`   Metadata: ${JSON.stringify(user.raw_user_meta_data, null, 2)}`);
        }
        console.log('');
      });
      console.log(`Total auth users: ${authUsers.rows.length}\n`);
    }

    // Get profiles
    console.log('📋 Profiles (public.profiles):\n');
    const profiles = await client.query(`
      SELECT
        id,
        user_id,
        first_name,
        last_name,
        phone,
        referral_code,
        avatar_url,
        created_at
      FROM public.profiles
      ORDER BY created_at DESC;
    `);

    if (profiles.rows.length === 0) {
      console.log('   No profiles found\n');
    } else {
      profiles.rows.forEach((profile, index) => {
        console.log(`${index + 1}. Profile ID: ${profile.id}`);
        console.log(`   User ID: ${profile.user_id}`);
        console.log(`   Name: ${profile.first_name || ''} ${profile.last_name || ''}`);
        console.log(`   Phone: ${profile.phone || 'N/A'}`);
        console.log(`   Referral Code: ${profile.referral_code || 'N/A'}`);
        console.log(`   Avatar: ${profile.avatar_url || 'No avatar'}`);
        console.log(`   Created: ${profile.created_at}`);
        console.log('');
      });
      console.log(`Total profiles: ${profiles.rows.length}\n`);
    }

    // Get user roles
    console.log('🔑 User Roles (public.user_roles):\n');
    const userRoles = await client.query(`
      SELECT
        ur.id,
        ur.user_id,
        ur.role,
        ur.created_at,
        au.email
      FROM public.user_roles ur
      LEFT JOIN auth.users au ON ur.user_id = au.id
      ORDER BY ur.created_at DESC;
    `);

    if (userRoles.rows.length === 0) {
      console.log('   No user roles assigned\n');
    } else {
      userRoles.rows.forEach((role, index) => {
        console.log(`${index + 1}. Role ID: ${role.id}`);
        console.log(`   User ID: ${role.user_id}`);
        console.log(`   Email: ${role.email || 'N/A'}`);
        console.log(`   Role: ${role.role}`);
        console.log(`   Created: ${role.created_at}`);
        console.log('');
      });
      console.log(`Total roles assigned: ${userRoles.rows.length}\n`);
    }

    // Get patients
    console.log('🏥 Patients (public.patients):\n');
    const patients = await client.query(`
      SELECT
        p.id,
        p.user_id,
        p.subscription_status,
        p.diagnosis_status,
        p.tags,
        p.created_at,
        au.email,
        pr.first_name,
        pr.last_name
      FROM public.patients p
      LEFT JOIN auth.users au ON p.user_id = au.id
      LEFT JOIN public.profiles pr ON p.user_id = pr.user_id
      ORDER BY p.created_at DESC;
    `);

    if (patients.rows.length === 0) {
      console.log('   No patients found\n');
    } else {
      patients.rows.forEach((patient, index) => {
        console.log(`${index + 1}. Patient ID: ${patient.id}`);
        console.log(`   User ID: ${patient.user_id}`);
        console.log(`   Email: ${patient.email || 'N/A'}`);
        console.log(`   Name: ${patient.first_name || ''} ${patient.last_name || ''}`);
        console.log(`   Subscription: ${patient.subscription_status}`);
        console.log(`   Diagnosis: ${patient.diagnosis_status}`);
        console.log(`   Tags: ${patient.tags ? patient.tags.join(', ') : 'None'}`);
        console.log(`   Created: ${patient.created_at}`);
        console.log('');
      });
      console.log(`Total patients: ${patients.rows.length}\n`);
    }

    // Get person profiles
    console.log('👨‍👩‍👧‍👦 Person Profiles (public.person_profiles):\n');
    const personProfiles = await client.query(`
      SELECT
        pp.id,
        pp.account_user_id,
        pp.name,
        pp.birth_date,
        pp.gender,
        pp.is_primary,
        pp.created_at,
        au.email
      FROM public.person_profiles pp
      LEFT JOIN auth.users au ON pp.account_user_id = au.id
      ORDER BY pp.account_user_id, pp.is_primary DESC, pp.created_at DESC;
    `);

    if (personProfiles.rows.length === 0) {
      console.log('   No person profiles found\n');
    } else {
      personProfiles.rows.forEach((pp, index) => {
        const primary = pp.is_primary ? '⭐ PRIMARY' : '';
        console.log(`${index + 1}. ${pp.name} ${primary}`);
        console.log(`   Profile ID: ${pp.id}`);
        console.log(`   Account User ID: ${pp.account_user_id}`);
        console.log(`   Account Email: ${pp.email || 'N/A'}`);
        console.log(`   Birth Date: ${pp.birth_date || 'N/A'}`);
        console.log(`   Gender: ${pp.gender || 'N/A'}`);
        console.log(`   Created: ${pp.created_at}`);
        console.log('');
      });
      console.log(`Total person profiles: ${personProfiles.rows.length}\n`);
    }

    // Summary
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   Summary                                     ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`
  Auth Users: ${authUsers.rows.length}
  Profiles: ${profiles.rows.length}
  User Roles: ${userRoles.rows.length}
  Patients: ${patients.rows.length}
  Person Profiles: ${personProfiles.rows.length}
    `);

  } catch (err) {
    console.error('\n❌ Error:', err);
  } finally {
    await client.end();
  }
}

listUsers();
