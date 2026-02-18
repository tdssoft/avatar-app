import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function checkTablesWithPSQL() {
  try {
    await client.connect();
    console.log('🔍 Sprawdzam tabele komendą podobną do \\dt...\n');

    // Equivalent to \dt command in psql
    const result = await client.query(`
      SELECT
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    console.log('Lista tabel w schemacie PUBLIC:\n');
    console.log('Schema  | Tabela                          | Owner');
    console.log('--------+---------------------------------+--------------');

    result.rows.forEach(row => {
      console.log(`${row.schemaname.padEnd(7)} | ${row.tablename.padEnd(31)} | ${row.tableowner}`);
    });

    console.log(`\n(${result.rows.length} wierszy)`);

    if (result.rows.length === 0) {
      console.log('\n❌ Brak tabel w schemacie public!');
      console.log('Trzeba wykonać migrację.');
    } else {
      console.log('\n✅ Tabele są obecne w bazie!');
    }

  } catch (err) {
    console.error('❌ Błąd:', err.message);
  } finally {
    await client.end();
  }
}

checkTablesWithPSQL();
