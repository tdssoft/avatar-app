import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function verifySchema() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Database Schema Verification             ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Check tables
    console.log('📊 Tables:');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    const expectedTables = [
      'audio_recordings',
      'nutrition_interview_history',
      'nutrition_interviews',
      'partner_shop_links',
      'patient_messages',
      'patient_notes',
      'patients',
      'person_profiles',
      'profiles',
      'recommendation_access_log',
      'recommendations',
      'referrals',
      'support_tickets',
      'user_results',
      'user_roles'
    ];

    expectedTables.forEach(tableName => {
      const exists = tables.rows.some(row => row.table_name === tableName);
      console.log(`   ${exists ? '✓' : '✗'} ${tableName}`);
    });

    console.log(`\n   Total: ${tables.rows.length} tables found`);

    // Check storage buckets
    console.log('\n🗄️  Storage Buckets:');
    const buckets = await client.query(`
      SELECT id, name, public
      FROM storage.buckets
      ORDER BY name;
    `);

    buckets.rows.forEach(bucket => {
      console.log(`   ✓ ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });

    // Check RLS status
    console.log('\n🔒 Row Level Security (RLS):');
    const rlsStatus = await client.query(`
      SELECT schemaname, tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    rlsStatus.rows.forEach(table => {
      const status = table.rowsecurity ? '✓ Enabled' : '✗ Disabled';
      console.log(`   ${status} - ${table.tablename}`);
    });

    // Check indexes
    console.log('\n📑 Indexes:');
    const indexes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      ORDER BY tablename, indexname;
    `);

    console.log(`   Total custom indexes: ${indexes.rows.length}`);

    // Group by table
    const indexesByTable = {};
    indexes.rows.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.keys(indexesByTable).sort().forEach(tableName => {
      console.log(`   ${tableName}:`);
      indexesByTable[tableName].forEach(indexName => {
        console.log(`      - ${indexName}`);
      });
    });

    // Check functions
    console.log('\n⚙️  Functions:');
    const functions = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);

    functions.rows.forEach(func => {
      console.log(`   ✓ ${func.routine_name}()`);
    });

    // Check types
    console.log('\n🏷️  Custom Types:');
    const types = await client.query(`
      SELECT typname
      FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname;
    `);

    types.rows.forEach(type => {
      console.log(`   ✓ ${type.typname}`);
    });

    // Check enum values
    const enumValues = await client.query(`
      SELECT enumlabel
      FROM pg_enum
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'app_role'
      )
      ORDER BY enumlabel;
    `);

    if (enumValues.rows.length > 0) {
      console.log(`      Values: ${enumValues.rows.map(r => r.enumlabel).join(', ')}`);
    }

    // Check triggers
    console.log('\n⚡ Triggers:');
    const triggers = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    const triggersByTable = {};
    triggers.rows.forEach(trigger => {
      if (!triggersByTable[trigger.event_object_table]) {
        triggersByTable[trigger.event_object_table] = [];
      }
      triggersByTable[trigger.event_object_table].push(trigger.trigger_name);
    });

    Object.keys(triggersByTable).sort().forEach(tableName => {
      console.log(`   ${tableName}:`);
      triggersByTable[tableName].forEach(triggerName => {
        console.log(`      - ${triggerName}`);
      });
    });

    // Summary
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Schema Verification Complete ✓              ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log(`
Summary:
  Tables: ${tables.rows.length}
  Storage Buckets: ${buckets.rows.length}
  Indexes: ${indexes.rows.length}
  Functions: ${functions.rows.length}
  Custom Types: ${types.rows.length}
  Triggers: ${triggers.rows.length}
    `);

  } catch (err) {
    console.error('\n❌ Verification error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifySchema();
