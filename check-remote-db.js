import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function checkRemoteDatabase() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║     Remote Database Tables                    ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  try {
    await client.connect();
    console.log('✓ Connected to Railway PostgreSQL\n');

    // Get all tables
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        CASE
          WHEN rowsecurity THEN 'Enabled'
          ELSE 'Disabled'
        END as rls_status
      FROM pg_tables
      WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      ORDER BY schemaname, tablename;
    `);

    console.log('📊 Tables found:\n');

    // Group by schema
    const tablesBySchema = {};
    result.rows.forEach(row => {
      if (!tablesBySchema[row.schemaname]) {
        tablesBySchema[row.schemaname] = [];
      }
      tablesBySchema[row.schemaname].push({
        name: row.tablename,
        rls: row.rls_status
      });
    });

    // Display tables by schema
    Object.keys(tablesBySchema).sort().forEach(schema => {
      console.log(`\n📁 Schema: ${schema}`);
      console.log('─'.repeat(50));
      tablesBySchema[schema].forEach((table, index) => {
        const rls = table.rls === 'Enabled' ? '🔒' : '🔓';
        console.log(`   ${index + 1}. ${table.name} ${rls} RLS: ${table.rls}`);
      });
    });

    console.log(`\n\nTotal tables: ${result.rows.length}`);

    // Get row counts for public schema tables
    console.log('\n\n📈 Row counts (public schema):\n');

    const publicTables = result.rows.filter(r => r.schemaname === 'public');

    for (const table of publicTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) FROM public.${table.tablename}`);
        const count = countResult.rows[0].count;
        console.log(`   ${table.tablename}: ${count} rows`);
      } catch (err) {
        console.log(`   ${table.tablename}: Error counting rows`);
      }
    }

    // Get storage buckets
    console.log('\n\n🗄️  Storage Buckets:\n');
    try {
      const buckets = await client.query(`
        SELECT id, name, public, created_at
        FROM storage.buckets
        ORDER BY name;
      `);

      if (buckets.rows.length > 0) {
        buckets.rows.forEach((bucket, index) => {
          const visibility = bucket.public ? '🌐 Public' : '🔒 Private';
          console.log(`   ${index + 1}. ${bucket.name} (${visibility})`);
        });
      } else {
        console.log('   No storage buckets found');
      }
    } catch (err) {
      console.log('   Storage schema not found or inaccessible');
    }

    console.log('\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkRemoteDatabase();
