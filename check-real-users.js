import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: 'postgresql://supabase_admin:eukqdx2zx6u6n1o4b8qhr6sglkvg8hm1rb9580xoe6t1wxsx3ek9tpia5jgf5p7q@trolley.proxy.rlwy.net:31136/postgres'
});

async function checkUsers() {
  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        au.email,
        au.created_at,
        p.first_name,
        p.last_name
      FROM auth.users au
      LEFT JOIN public.profiles p ON au.id = p.user_id
      WHERE au.email LIKE '%ojdana%' OR au.email LIKE '%mieszek%'
      ORDER BY au.created_at DESC;
    `);

    console.log('\n🔍 Prawdziwi użytkownicy w bazie:\n');

    if (result.rows.length === 0) {
      console.log('❌ Nie znaleziono użytkowników Ojdana/Mieszek');
      console.log('   Import prawdopodobnie się nie powiódł z powodu błędu w recommendations.');
    } else {
      result.rows.forEach(user => {
        console.log(`✅ ${user.email}`);
        console.log(`   Imię: ${user.first_name} ${user.last_name}`);
        console.log(`   Utworzony: ${user.created_at}\n`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkUsers();
