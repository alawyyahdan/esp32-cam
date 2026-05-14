require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupDatabase() {
  console.log('🚀 Verifying Supabase database...');
  console.log('');

  const requiredTables = ['users', 'devices', 'stream_sessions'];
  const missingTables = [];

  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && (error.code === 'PGRST116' || error.code === '42P01' || error.message.includes('does not exist'))) {
      missingTables.push(table);
      console.log(`❌ Table "${table}" not found`);
    } else if (error) {
      // Some other error (e.g. RLS blocking) - table likely exists
      console.log(`✅ Table "${table}" exists (access restricted by RLS - OK)`);
    } else {
      console.log(`✅ Table "${table}" exists`);
    }
  }

  console.log('');

  if (missingTables.length > 0) {
    console.log('⚠️  Missing tables:', missingTables.join(', '));
    console.log('');
    console.log('🔧 MANUAL SETUP REQUIRED:');
    console.log('');
    console.log('1. Go to Supabase SQL Editor:');
    console.log(`   ${process.env.SUPABASE_URL.replace('.supabase.co', '')}/dashboard or https://supabase.com/dashboard/project/_/sql`);
    console.log('');
    console.log('2. Copy and run the SQL from: database-setup.sql');
    console.log('');
    console.log('3. After running SQL, try starting the server again');
    console.log('');
    process.exit(1);
  }

  console.log('✅ All required tables exist. Database is ready!');
  console.log('');
}

setupDatabase();
