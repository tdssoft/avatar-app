import pkg from 'pg';
import fetch from 'node-fetch';
import crypto from 'crypto';
const { Client } = pkg;

// Bubble.io API Configuration
const BUBBLE_API_BASE = 'https://app.eavatar.diet/version-test/api/1.1/obj';
const BUBBLE_API_KEY = '6db971c777b281bb35ef04e6d00369e1';

// Supabase Database Connection
const dbClient = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

// Default password hash for migrated users (they will need to reset)
const DEFAULT_PASSWORD_HASH = '$2a$10$rBV2YhYPzOFEkKGJvGVHqOZ3Yj6vN8pJ8qQxXyP9fZDNvN0pLK5C2'; // "MigratedUser123!"

function generateUUID() {
  return crypto.randomUUID();
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Fetch data from Bubble.io API
 */
async function fetchFromBubble(dataType, constraints = {}) {
  try {
    const url = new URL(`${BUBBLE_API_BASE}/${dataType}`);

    // Add constraints as query parameters
    if (Object.keys(constraints).length > 0) {
      url.searchParams.append('constraints', JSON.stringify(constraints));
    }

    console.log(`   Fetching from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${BUBBLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Bubble API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.response?.results || [];
  } catch (error) {
    console.error(`   ❌ Error fetching ${dataType}:`, error.message);
    return [];
  }
}

/**
 * List available data types in Bubble.io
 */
async function listBubbleDataTypes() {
  console.log('🔍 Checking Bubble.io data types...\n');

  const commonTypes = [
    'user',
    'patient',
    'pacjent',
    'profile',
    'recommendation',
    'rekomendacja',
    'result',
    'wynik',
    'message',
    'wiadomosc',
    'note',
    'notatka'
  ];

  console.log('Testing common data types:\n');

  for (const type of commonTypes) {
    try {
      const url = `${BUBBLE_API_BASE}/${type}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${BUBBLE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const count = data.response?.results?.length || 0;
        console.log(`   ✓ ${type}: ${count} records found`);
      } else {
        console.log(`   ✗ ${type}: not found (${response.status})`);
      }
    } catch (error) {
      console.log(`   ✗ ${type}: error`);
    }
  }
}

/**
 * Migrate patients from Bubble.io to Supabase
 */
async function migratePatients(bubblePatients) {
  console.log(`\n🏥 Migrating ${bubblePatients.length} patients...\n`);

  const migratedCount = { success: 0, failed: 0 };
  const userMapping = {}; // Map Bubble ID to Supabase user_id

  for (const bubblePatient of bubblePatients) {
    try {
      // Extract patient data from Bubble
      const email = bubblePatient.email || bubblePatient.Email || `patient_${bubblePatient._id}@migrated.local`;
      const firstName = bubblePatient.first_name || bubblePatient.firstName || bubblePatient.name?.split(' ')[0] || 'Imię';
      const lastName = bubblePatient.last_name || bubblePatient.lastName || bubblePatient.name?.split(' ').slice(1).join(' ') || 'Nazwisko';
      const phone = bubblePatient.phone || bubblePatient.Phone || '';

      // Create UUID for new user
      const userId = generateUUID();
      const profileId = generateUUID();
      const patientId = generateUUID();
      const personProfileId = generateUUID();
      const referralCode = generateReferralCode();

      // 1. Create auth.users record
      await dbClient.query(`
        INSERT INTO auth.users (
          id, email, encrypted_password,
          email_confirmed_at, created_at, updated_at,
          raw_app_meta_data, raw_user_meta_data,
          aud, role
        ) VALUES (
          $1, $2, $3,
          NOW(), NOW(), NOW(),
          '{"provider":"email","providers":["email"],"migrated_from":"bubble"}'::jsonb,
          '{}'::jsonb,
          'authenticated', 'authenticated'
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id
      `, [userId, email.toLowerCase().trim(), DEFAULT_PASSWORD_HASH]);

      // 2. Create profile
      await dbClient.query(`
        INSERT INTO public.profiles (
          id, user_id, first_name, last_name, phone, referral_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [profileId, userId, firstName, lastName, phone, referralCode]);

      // 3. Create user_roles (regular user)
      await dbClient.query(`
        INSERT INTO public.user_roles (user_id, role, created_at)
        VALUES ($1, 'user', NOW())
        ON CONFLICT (user_id, role) DO NOTHING
      `, [userId]);

      // 4. Create patient record
      const subscriptionStatus = bubblePatient.subscription_status || bubblePatient.SubscriptionStatus || 'Brak';
      const diagnosisStatus = bubblePatient.diagnosis_status || bubblePatient.DiagnosisStatus || 'Brak';
      const adminNotes = bubblePatient.admin_notes || bubblePatient.notes || '';
      const tags = bubblePatient.tags || [];

      await dbClient.query(`
        INSERT INTO public.patients (
          id, user_id, subscription_status, diagnosis_status,
          admin_notes, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [patientId, userId, subscriptionStatus, diagnosisStatus, adminNotes, tags]);

      // 5. Create primary person_profile
      const birthDate = bubblePatient.birth_date || bubblePatient.birthDate || null;
      const gender = bubblePatient.gender || bubblePatient.Gender || null;

      await dbClient.query(`
        INSERT INTO public.person_profiles (
          id, account_user_id, name, birth_date, gender, is_primary, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      `, [personProfileId, userId, `${firstName} ${lastName}`, birthDate, gender]);

      // Store mapping
      userMapping[bubblePatient._id] = {
        userId,
        patientId,
        personProfileId,
        email
      };

      console.log(`   ✓ Migrated: ${email} (${firstName} ${lastName})`);
      migratedCount.success++;

    } catch (error) {
      console.error(`   ❌ Failed to migrate patient ${bubblePatient.email || bubblePatient._id}:`, error.message);
      migratedCount.failed++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   Success: ${migratedCount.success}`);
  console.log(`   Failed: ${migratedCount.failed}`);

  return userMapping;
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   Bubble.io → Supabase Migration Tool        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📡 Connecting to Supabase database...');
    await dbClient.connect();
    console.log('✓ Connected successfully\n');

    // Step 1: List available data types
    await listBubbleDataTypes();

    // Step 2: Ask user which data type to migrate
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Ready to migrate patients                   ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    // Try different patient data type names
    let patients = [];
    const patientTypes = ['patient', 'pacjent', 'user', 'Patient', 'Pacjent'];

    for (const type of patientTypes) {
      console.log(`\n🔍 Trying to fetch '${type}' data type...`);
      patients = await fetchFromBubble(type);
      if (patients.length > 0) {
        console.log(`✓ Found ${patients.length} records in '${type}' type\n`);

        // Show sample data
        if (patients[0]) {
          console.log('📋 Sample record structure:');
          console.log(JSON.stringify(patients[0], null, 2).substring(0, 500) + '...\n');
        }
        break;
      }
    }

    if (patients.length === 0) {
      console.log('\n⚠️  No patient data found. Please check:');
      console.log('   1. The API key is correct');
      console.log('   2. The data type name in Bubble.io');
      console.log('   3. The API endpoint URL');
      console.log('\nTry accessing: https://app.eavatar.diet/version-test/api/1.1/obj/YOUR_DATA_TYPE');
      return;
    }

    // Step 3: Migrate patients
    await dbClient.query('BEGIN');
    const userMapping = await migratePatients(patients);
    await dbClient.query('COMMIT');

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Migration Completed! ✓                      ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📝 Next steps:\n');
    console.log('   1. All migrated users have default password: MigratedUser123!');
    console.log('   2. Users should reset their passwords on first login');
    console.log('   3. Verify the data in Supabase dashboard');
    console.log('   4. Consider migrating additional data (recommendations, messages, etc.)\n');

    // Save mapping to file
    const fs = await import('fs');
    fs.writeFileSync('bubble-to-supabase-mapping.json', JSON.stringify(userMapping, null, 2));
    console.log('💾 User mapping saved to: bubble-to-supabase-mapping.json\n');

  } catch (error) {
    await dbClient.query('ROLLBACK');
    console.error('\n❌ Migration error:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

// Run migration
runMigration();
