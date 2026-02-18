import pkg from 'pg';
import { readFileSync } from 'fs';
const { Client } = pkg;

// Database connection
const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function runMigration() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Database Migration Tool                   ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✓ Connected successfully\n');

    // Read migration file
    console.log('📄 Reading migration file...');
    const migrationSQL = readFileSync('supabase/migrations/20260208000000_complete_database_schema.sql', 'utf8');
    console.log('✓ Migration file loaded\n');

    // Execute migration
    console.log('🔄 Executing migration...');
    console.log('This may take a few moments...\n');

    await client.query(migrationSQL);

    console.log('✓ Migration executed successfully\n');

    // Verify tables
    console.log('🔍 Verifying database schema...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log(`\n✓ Found ${result.rows.length} tables:\n`);
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Migration completed successfully! ✓         ║');
    console.log('╚════════════════════════════════════════════════╝\n');

  } catch (err) {
    console.error('\n❌ Migration error:');
    console.error(err);
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   Migration failed! ✗                         ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migration
runMigration();
