import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

const { Client } = pkg;

// Configuration
const CSV_DIR = './csv';
const DB_CONNECTION_STRING = 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres';
const DEFAULT_PASSWORD_HASH = '$2a$10$rBV2YhYPzOFEkKGJvGVHqOZ3Yj6vN8pJ8qQxXyP9fZDNvN0pLK5C2'; // "MigratedUser123!"

// Database client
const dbClient = new Client({ connectionString: DB_CONNECTION_STRING });

// ID mappings (Bubble → Supabase)
const idMapping = {
  users: new Map(),           // email → user_id
  patients: new Map(),        // user_id → patient_id
  chats: new Map(),           // chat_id → user_id
  recommendations: new Map(), // rec_id → rec_id
  notes: new Map(),           // note_id → note_id
};

// Statistics
const stats = {
  users: { created: 0, skipped: 0, failed: 0 },
  profiles: { created: 0, skipped: 0, failed: 0 },
  patients: { created: 0, skipped: 0, failed: 0 },
  person_profiles: { created: 0, skipped: 0, failed: 0 },
  referrals: { created: 0, skipped: 0, failed: 0 },
  recommendations: { created: 0, skipped: 0, failed: 0 },
  messages: { created: 0, skipped: 0, failed: 0 },
  notes: { created: 0, skipped: 0, failed: 0 },
  links: { created: 0, skipped: 0, failed: 0 },
  user_results: { created: 0, skipped: 0, failed: 0 },
  nutrition_interviews: { created: 0, skipped: 0, failed: 0 },
};

/**
 * Read and parse CSV file
 */
function readCSV(filename) {
  try {
    const filepath = path.join(CSV_DIR, filename);
    if (!fs.existsSync(filepath)) {
      console.log(`   ⚠️  File not found: ${filename}`);
      return [];
    }
    const content = fs.readFileSync(filepath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    });
  } catch (error) {
    console.error(`   ❌ Error reading ${filename}:`, error.message);
    return [];
  }
}

/**
 * Generate random UUID
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate referral code
 */
function generateReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Parse Bubble date format
 */
function parseBubbleDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

/**
 * Convert yes/no to boolean
 */
function parseBoolean(value) {
  if (!value) return false;
  const str = value.toString().toLowerCase();
  return str === 'yes' || str === 'tak' || str === 'true' || str === '1';
}

/**
 * Import Users
 */
async function importUsers() {
  console.log('\n👥 Importing Users...');
  const users = readCSV('export_All-Users_2026-02-10_18-31-37.csv');

  console.log(`   Found ${users.length} users in CSV\n`);

  for (const user of users) {
    const email = user.email?.trim().toLowerCase();

    if (!email) {
      console.log(`   ⚠️  Skipping user without email`);
      stats.users.skipped++;
      continue;
    }

    try {
      // Check if user already exists
      const existingUser = await dbClient.query(
        'SELECT id FROM auth.users WHERE email = $1',
        [email]
      );

      let userId;

      if (existingUser.rows.length > 0) {
        userId = existingUser.rows[0].id;
        idMapping.users.set(email, userId);

        // Get patient_id for existing user
        const existingPatient = await dbClient.query(
          'SELECT id FROM public.patients WHERE user_id = $1',
          [userId]
        );
        if (existingPatient.rows.length > 0) {
          idMapping.patients.set(userId, existingPatient.rows[0].id);
        }

        console.log(`   ⏭️  User exists: ${email}`);
        stats.users.skipped++;
      } else {
        // Create new user
        userId = generateUUID();
        const profileId = generateUUID();
        const patientId = generateUUID();
        const personProfileId = generateUUID();
        const referralCode = generateReferralCode();

        // 1. Create auth.users
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
        `, [userId, email, DEFAULT_PASSWORD_HASH]);

        // 2. Create profile
        const firstName = user.firstName || 'Imię';
        const lastName = user.lastName || 'Nazwisko';
        const phone = user.phoneNumber || '';
        const photo = user.photo || '';
        const avatarUrl = photo ? `https:${photo}` : null;

        await dbClient.query(`
          INSERT INTO public.profiles (
            id, user_id, first_name, last_name, phone, avatar_url, referral_code,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [profileId, userId, firstName, lastName, phone, avatarUrl, referralCode]);

        // 3. Create user_roles (regular user)
        await dbClient.query(`
          INSERT INTO public.user_roles (user_id, role, created_at)
          VALUES ($1, 'user', NOW())
          ON CONFLICT (user_id, role) DO NOTHING
        `, [userId]);

        // 4. Create patient record
        await dbClient.query(`
          INSERT INTO public.patients (
            id, user_id, subscription_status, diagnosis_status,
            created_at, updated_at
          ) VALUES ($1, $2, 'Brak', 'Brak', NOW(), NOW())
        `, [patientId, userId]);

        // Store patient mapping
        idMapping.patients.set(userId, patientId);

        // 5. Create person_profile
        await dbClient.query(`
          INSERT INTO public.person_profiles (
            id, account_user_id, name, is_primary,
            created_at, updated_at
          ) VALUES ($1, $2, $3, true, NOW(), NOW())
        `, [personProfileId, userId, `${firstName} ${lastName}`]);

        // Store mapping
        idMapping.users.set(email, userId);
        if (user.Chat) {
          idMapping.chats.set(user.Chat, userId);
        }

        console.log(`   ✅ Created: ${email} (${firstName} ${lastName})`);
        stats.users.created++;
        stats.profiles.created++;
        stats.patients.created++;
        stats.person_profiles.created++;
      }

    } catch (error) {
      console.error(`   ❌ Failed for ${email}:`, error.message);
      stats.users.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.users.created} created, ${stats.users.skipped} skipped, ${stats.users.failed} failed`);
}

/**
 * Import Referrals
 */
async function importReferrals() {
  console.log('\n🔗 Importing Referrals...');
  const referrals = readCSV('export_All-Referrals_2026-02-10_18-31-18.csv');

  console.log(`   Found ${referrals.length} referrals in CSV\n`);

  for (const ref of referrals) {
    try {
      const referringEmail = ref.recommendingUser_?.trim().toLowerCase();
      const recommendedEmail = ref.recommendedUser_?.trim().toLowerCase();

      if (!referringEmail || !recommendedEmail) {
        stats.referrals.skipped++;
        continue;
      }

      const referringUserId = idMapping.users.get(referringEmail);
      const recommendedUserId = idMapping.users.get(recommendedEmail);

      if (!referringUserId || !recommendedUserId) {
        console.log(`   ⚠️  User not found for referral: ${referringEmail} → ${recommendedEmail}`);
        stats.referrals.skipped++;
        continue;
      }

      // Get referrer's referral code from profile
      const profileResult = await dbClient.query(
        'SELECT referral_code, first_name, last_name FROM public.profiles WHERE user_id = $1',
        [referringUserId]
      );

      if (profileResult.rows.length === 0) {
        console.log(`   ⚠️  Profile not found for: ${referringEmail}`);
        stats.referrals.skipped++;
        continue;
      }

      const referralCode = profileResult.rows[0].referral_code;

      // Get referred user's name and email
      const referredProfileResult = await dbClient.query(
        'SELECT first_name, last_name FROM public.profiles WHERE user_id = $1',
        [recommendedUserId]
      );

      const referredFirstName = referredProfileResult.rows[0]?.first_name || 'Imię';
      const referredLastName = referredProfileResult.rows[0]?.last_name || 'Nazwisko';
      const referredName = `${referredFirstName} ${referredLastName}`;

      const referralId = generateUUID();
      const createdAt = parseBubbleDate(ref['Creation Date']) || new Date();

      await dbClient.query(`
        INSERT INTO public.referrals (
          id, referrer_user_id, referrer_code, referred_user_id,
          referred_email, referred_name, status, created_at, activated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'completed', $7, $7)
      `, [
        referralId,
        referringUserId,
        referralCode,
        recommendedUserId,
        recommendedEmail,
        referredName,
        createdAt
      ]);

      console.log(`   ✅ Created referral: ${referringEmail} → ${recommendedEmail}`);
      stats.referrals.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create referral:`, error.message);
      stats.referrals.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.referrals.created} created, ${stats.referrals.skipped} skipped`);
}

/**
 * Import Notes
 */
async function importNotes() {
  console.log('\n📝 Importing Notes...');
  const notes = readCSV('export_All-Notes_2026-02-10_18-30-55.csv');

  console.log(`   Found ${notes.length} notes in CSV\n`);

  // Find first admin user to use as note author
  const adminResult = await dbClient.query(`
    SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1
  `);

  let defaultAdminId = null;
  if (adminResult.rows.length > 0) {
    defaultAdminId = adminResult.rows[0].user_id;
  } else {
    // Create a system admin if none exists
    const systemAdminId = generateUUID();
    await dbClient.query(`
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, aud, role,
        raw_app_meta_data, raw_user_meta_data
      ) VALUES (
        $1, 'system@avatarapp.pl', $2,
        NOW(), NOW(), NOW(), 'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
      ) ON CONFLICT (email) DO NOTHING
    `, [systemAdminId, DEFAULT_PASSWORD_HASH]);

    await dbClient.query(`
      INSERT INTO public.user_roles (user_id, role, created_at)
      VALUES ($1, 'admin', NOW())
      ON CONFLICT (user_id, role) DO NOTHING
    `, [systemAdminId]);

    defaultAdminId = systemAdminId;
    console.log(`   ℹ️  Created system admin for notes`);
  }

  for (const note of notes) {
    try {
      const patientEmail = note.patient?.trim().toLowerCase();
      const adminEmail = note.admin?.trim().toLowerCase();
      const body = note.body || '';

      if (!patientEmail || !body) {
        stats.notes.skipped++;
        continue;
      }

      const patientUserId = idMapping.users.get(patientEmail);
      if (!patientUserId) {
        console.log(`   ⚠️  Patient not found: ${patientEmail}`);
        stats.notes.skipped++;
        continue;
      }

      const patientId = idMapping.patients.get(patientUserId);
      if (!patientId) {
        console.log(`   ⚠️  Patient record not found for: ${patientEmail}`);
        stats.notes.skipped++;
        continue;
      }

      let adminUserId = defaultAdminId;
      if (adminEmail) {
        const foundAdminId = idMapping.users.get(adminEmail);
        if (foundAdminId) {
          adminUserId = foundAdminId;
        }
      }

      const noteId = generateUUID();
      const createdAt = parseBubbleDate(note['Creation Date']) || new Date();

      await dbClient.query(`
        INSERT INTO public.patient_notes (
          id, patient_id, admin_id, note_text, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [noteId, patientId, adminUserId, body, createdAt]);

      console.log(`   ✅ Created note for: ${patientEmail}`);
      stats.notes.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create note:`, error.message);
      stats.notes.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.notes.created} created, ${stats.notes.skipped} skipped`);
}

/**
 * Import Messages
 */
async function importMessages() {
  console.log('\n💬 Importing Messages...');
  const messages = readCSV('export_All-Messages_2026-02-10_18-30-48.csv');

  console.log(`   Found ${messages.length} messages in CSV\n`);

  for (const msg of messages) {
    try {
      const senderEmail = msg.sender?.trim().toLowerCase();
      const body = msg.body || '';
      const isAdmin = parseBoolean(msg.is_admin);
      const chatId = msg.chat;

      if (!senderEmail || !body) {
        stats.messages.skipped++;
        continue;
      }

      let userId = idMapping.users.get(senderEmail);

      // Try to find user by chat ID if email not found
      if (!userId && chatId) {
        userId = idMapping.chats.get(chatId);
      }

      if (!userId) {
        console.log(`   ⚠️  User not found: ${senderEmail}`);
        stats.messages.skipped++;
        continue;
      }

      const patientId = idMapping.patients.get(userId);
      if (!patientId) {
        console.log(`   ⚠️  Patient record not found for: ${senderEmail}`);
        stats.messages.skipped++;
        continue;
      }

      const messageId = generateUUID();
      const createdAt = parseBubbleDate(msg['Creation Date']) || new Date();
      const messageType = isAdmin ? 'answer' : 'question';

      await dbClient.query(`
        INSERT INTO public.patient_messages (
          id, patient_id, admin_id, message_type, message_text, sent_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        messageId,
        patientId,
        isAdmin ? userId : null,
        messageType,
        body,
        createdAt
      ]);

      console.log(`   ✅ Created message from: ${senderEmail} (${messageType})`);
      stats.messages.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create message:`, error.message);
      stats.messages.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.messages.created} created, ${stats.messages.skipped} skipped`);
}

/**
 * Import Links
 */
async function importLinks() {
  console.log('\n🔗 Importing Links...');
  const links = readCSV('export_All-Links_2026-02-10_18-30-33.csv');

  console.log(`   Found ${links.length} links in CSV\n`);

  // Find first admin user
  const adminResult = await dbClient.query(`
    SELECT user_id FROM public.user_roles WHERE role = 'admin' LIMIT 1
  `);

  let defaultAdminId = null;
  if (adminResult.rows.length > 0) {
    defaultAdminId = adminResult.rows[0].user_id;
  } else {
    console.log(`   ⚠️  No admin user found, skipping links import`);
    stats.links.skipped = links.length;
    return;
  }

  for (const link of links) {
    try {
      const url = link.URL || '';
      const relatedUserEmail = link.relatedUser_?.trim().toLowerCase();

      if (!url) {
        stats.links.skipped++;
        continue;
      }

      const userId = relatedUserEmail ? idMapping.users.get(relatedUserEmail) : null;

      // Skip if no user found
      if (!userId) {
        console.log(`   ⚠️  User not found for link, skipping`);
        stats.links.skipped++;
        continue;
      }

      const linkId = generateUUID();
      const createdAt = parseBubbleDate(link['Creation Date']) || new Date();

      await dbClient.query(`
        INSERT INTO public.partner_shop_links (
          id, partner_user_id, shop_url, added_by_admin_id, created_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [linkId, userId, url, defaultAdminId, createdAt]);

      console.log(`   ✅ Created link: ${url.substring(0, 50)}...`);
      stats.links.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create link:`, error.message);
      stats.links.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.links.created} created, ${stats.links.skipped} skipped`);
}

/**
 * Import Recommendations
 */
async function importRecommendations() {
  console.log('\n🩺 Importing Recommendations...');
  const recommendations = readCSV('export_All-Recommendations_2026-02-10_18-31-12.csv');

  console.log(`   Found ${recommendations.length} recommendations in CSV\n`);

  for (const rec of recommendations) {
    try {
      const diagnosisSummary = rec.diagnosisSummary || '';
      const dietaryRecommendations = rec.dietaryRecommendations || '';
      const aiData = rec.aiData || '';

      // Skip empty recommendations
      if (!diagnosisSummary && !dietaryRecommendations) {
        stats.recommendations.skipped++;
        continue;
      }

      // Try to find related user (recommendations might not have direct user link in CSV)
      // We'll create orphan recommendations that can be linked later
      const recId = generateUUID();
      const createdAt = parseBubbleDate(rec['Creation Date']) || new Date();

      await dbClient.query(`
        INSERT INTO public.recommendations (
          id, patient_id, diagnosis_summary, dietary_recommendations,
          ai_analysis_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $6)
      `, [recId, null, diagnosisSummary, dietaryRecommendations, aiData, createdAt]);

      console.log(`   ✅ Created recommendation (orphan, can be linked later)`);
      stats.recommendations.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create recommendation:`, error.message);
      stats.recommendations.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.recommendations.created} created, ${stats.recommendations.skipped} skipped`);
}

/**
 * Import User Results
 */
async function importUserResults() {
  console.log('\n📊 Importing User Results...');
  const results = readCSV('export_All-PreviousMedicalResults_2026-02-10_18-31-01.csv');

  console.log(`   Found ${results.length} results in CSV\n`);

  for (const result of results) {
    try {
      const creatorEmail = result.Creator?.trim().toLowerCase();
      const filesString = result.file || '';

      if (!creatorEmail || !filesString) {
        stats.user_results.skipped++;
        continue;
      }

      const userId = idMapping.users.get(creatorEmail);

      if (!userId) {
        console.log(`   ⚠️  User not found: ${creatorEmail}`);
        stats.user_results.skipped++;
        continue;
      }

      // Parse multiple file URLs (comma separated)
      const fileUrls = filesString.split(',').map(url => url.trim()).filter(url => url);

      for (const fileUrl of fileUrls) {
        const resultId = generateUUID();
        const createdAt = parseBubbleDate(result['Creation Date']) || new Date();

        // Extract filename from URL
        const filename = fileUrl.split('/').pop()?.split('?')[0] || 'result.pdf';
        const decodedFilename = decodeURIComponent(filename);

        await dbClient.query(`
          INSERT INTO public.user_results (
            id, user_id, file_path, file_name, file_type, uploaded_at
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [resultId, userId, fileUrl, decodedFilename, 'application/pdf', createdAt]);

        console.log(`   ✅ Created result for: ${creatorEmail} - ${decodedFilename}`);
        stats.user_results.created++;
      }

    } catch (error) {
      console.error(`   ❌ Failed to create result:`, error.message);
      stats.user_results.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.user_results.created} created, ${stats.user_results.skipped} skipped`);
}

/**
 * Import Nutrition Interviews
 */
async function importNutritionInterviews() {
  console.log('\n🥗 Importing Nutrition Interviews...');
  const interviews = readCSV('export_All-MedicalQuestionnaires_2026-02-10_18-30-39.csv');

  console.log(`   Found ${interviews.length} nutrition interviews in CSV\n`);

  for (const interview of interviews) {
    try {
      // Skip if all fields are empty
      const hasData = Object.values(interview).some(val => val && val.trim());
      if (!hasData) {
        stats.nutrition_interviews.skipped++;
        continue;
      }

      // Create interview with available data
      const interviewId = generateUUID();

      // Build interview_data JSON from available fields
      const interviewData = {
        liquidsDescription: interview[' liquidsDescription'] || interview.liquidsDescription || '',
        addictions: interview.addictions || '',
        alergies: interview.alergies || '',
        animalFats: interview.animalFats || '',
        animalFatsFrequency: interview.animalFatsFrequency || '',
        birthDate: interview.birthDate || '',
        bowelMovementsDescription: interview.bowelMovementsDescription || '',
        // Add more fields as needed from the CSV
      };

      await dbClient.query(`
        INSERT INTO public.nutrition_interviews (
          id, patient_id, interview_data, created_at, updated_at
        ) VALUES ($1, $2, $3, NOW(), NOW())
      `, [interviewId, null, JSON.stringify(interviewData)]);

      console.log(`   ✅ Created nutrition interview (orphan, can be linked later)`);
      stats.nutrition_interviews.created++;

    } catch (error) {
      console.error(`   ❌ Failed to create nutrition interview:`, error.message);
      stats.nutrition_interviews.failed++;
    }
  }

  console.log(`\n   Summary: ${stats.nutrition_interviews.created} created, ${stats.nutrition_interviews.skipped} skipped`);
}

/**
 * Main migration function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║   CSV → Supabase Migration Tool               ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    // Connect to database
    console.log('\n📡 Connecting to Supabase database...');
    await dbClient.connect();
    console.log('✅ Connected successfully');

    // Start transaction
    await dbClient.query('BEGIN');

    // Import data in correct order (respecting foreign keys)
    await importUsers();
    await importReferrals();
    await importNotes();
    await importMessages();
    await importLinks();
    await importRecommendations();
    await importUserResults();
    await importNutritionInterviews();

    // Commit transaction
    await dbClient.query('COMMIT');

    // Save ID mappings
    const mappingData = {
      users: Array.from(idMapping.users.entries()),
      chats: Array.from(idMapping.chats.entries()),
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      'csv-import-mapping.json',
      JSON.stringify(mappingData, null, 2)
    );

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Migration Completed Successfully! ✅         ║');
    console.log('╚════════════════════════════════════════════════╝');

    console.log('\n📊 Final Statistics:\n');
    console.log(`   Users:               ${stats.users.created} created, ${stats.users.skipped} skipped, ${stats.users.failed} failed`);
    console.log(`   Profiles:            ${stats.profiles.created} created`);
    console.log(`   Patients:            ${stats.patients.created} created`);
    console.log(`   Person Profiles:     ${stats.person_profiles.created} created`);
    console.log(`   Referrals:           ${stats.referrals.created} created, ${stats.referrals.skipped} skipped`);
    console.log(`   Notes:               ${stats.notes.created} created, ${stats.notes.skipped} skipped`);
    console.log(`   Messages:            ${stats.messages.created} created, ${stats.messages.skipped} skipped`);
    console.log(`   Links:               ${stats.links.created} created, ${stats.links.skipped} skipped`);
    console.log(`   Recommendations:     ${stats.recommendations.created} created, ${stats.recommendations.skipped} skipped`);
    console.log(`   User Results:        ${stats.user_results.created} created, ${stats.user_results.skipped} skipped`);
    console.log(`   Nutrition Interviews:${stats.nutrition_interviews.created} created, ${stats.nutrition_interviews.skipped} skipped`);

    console.log('\n💾 Mapping saved to: csv-import-mapping.json');
    console.log('\n📝 Next steps:');
    console.log('   1. All migrated users have default password: MigratedUser123!');
    console.log('   2. Users should reset their passwords on first login');
    console.log('   3. Verify the data in Supabase dashboard');
    console.log('   4. Check csv-import-mapping.json for ID mappings\n');

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
main();
