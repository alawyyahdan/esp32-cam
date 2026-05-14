require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for admin operations
);

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database...');
  console.log('');
  
  try {
    // Test connection first
    console.log('🔌 Testing Supabase connection...');
    const { error: testError } = await supabase.from('_test').select('*').limit(1);
    if (testError && testError.code !== 'PGRST116' && testError.code !== '42P01') {
      throw new Error(`Connection failed: ${testError.message}`);
    }
    console.log('✅ Supabase connection successful');
    console.log('');
    
    // Create users table
    console.log('📋 Creating users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index on email for faster lookups
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      `
    });
    
    if (usersError) {
      console.log('ℹ️ Users table might already exist or RPC not available, trying direct approach...');
      console.log('Error:', usersError.message);
    } else {
      console.log('✅ Users table created successfully');
    }

    // Create devices table
    console.log('📋 Creating devices table...');
    const { error: devicesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS devices (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          device_api_key VARCHAR(255) UNIQUE NOT NULL,
          viewer_api_key VARCHAR(255) UNIQUE NOT NULL,
          is_online BOOLEAN DEFAULT FALSE,
          last_active TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
        CREATE INDEX IF NOT EXISTS idx_devices_device_api_key ON devices(device_api_key);
        CREATE INDEX IF NOT EXISTS idx_devices_viewer_api_key ON devices(viewer_api_key);
      `
    });
    
    if (devicesError) {
      console.log('ℹ️ Devices table might already exist, continuing...');
    } else {
      console.log('✅ Devices table created successfully');
    }

    // Create stream_sessions table
    console.log('📋 Creating stream_sessions table...');
    const { error: sessionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS stream_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          device_id UUID NOT NULL,
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          ended_at TIMESTAMP WITH TIME ZONE
        );
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_stream_sessions_device_id ON stream_sessions(device_id);
        CREATE INDEX IF NOT EXISTS idx_stream_sessions_active ON stream_sessions(device_id, ended_at) WHERE ended_at IS NULL;
      `
    });
    
    if (sessionsError) {
      console.log('ℹ️ Stream sessions table might already exist, continuing...');
    } else {
      console.log('✅ Stream sessions table created successfully');
    }

    // Enable Row Level Security (RLS) for better security
    console.log('🔒 Setting up Row Level Security...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Enable RLS on all tables
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;
        
        -- Create policies for users table
        DROP POLICY IF EXISTS "Users can view own data" ON users;
        CREATE POLICY "Users can view own data" ON users
          FOR SELECT USING (auth.uid() = id);
        
        DROP POLICY IF EXISTS "Users can update own data" ON users;
        CREATE POLICY "Users can update own data" ON users
          FOR UPDATE USING (auth.uid() = id);
        
        -- Create policies for devices table
        DROP POLICY IF EXISTS "Users can view own devices" ON devices;
        CREATE POLICY "Users can view own devices" ON devices
          FOR ALL USING (auth.uid() = user_id);
        
        -- Create policies for stream_sessions table
        DROP POLICY IF EXISTS "Users can view own sessions" ON stream_sessions;
        CREATE POLICY "Users can view own sessions" ON stream_sessions
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM devices 
              WHERE devices.id = stream_sessions.device_id 
              AND devices.user_id = auth.uid()
            )
          );
      `
    });
    
    if (rlsError) {
      console.log('⚠️ RLS setup failed (might need manual setup in Supabase dashboard)');
      console.log('Error:', rlsError.message);
    } else {
      console.log('✅ Row Level Security configured');
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('⚠️  IMPORTANT: If tables were not created automatically,');
    console.log('   please run the SQL script manually in Supabase SQL Editor:');
    console.log('   File: database-setup.sql');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify tables exist in Supabase dashboard');
    console.log('2. Run: npm run dev (development) or ./deploy.sh (production)');
    console.log('3. Visit: http://localhost:3000');
    console.log('');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.log('');
    console.log('🔧 MANUAL SETUP REQUIRED:');
    console.log('');
    console.log('1. Go to Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/_/sql');
    console.log('');
    console.log('2. Copy and run the SQL from: database-setup.sql');
    console.log('');
    console.log('3. After running SQL, try starting the server again');
    console.log('');
    process.exit(1);
  }
}

// Alternative setup using direct SQL (if RPC doesn't work)
async function setupDatabaseDirect() {
  console.log('🚀 Setting up database with direct queries...');
  console.log('');
  
  try {
    // Test connection first
    const { error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist - need manual setup
      console.log('⚠️  Tables do not exist yet.');
      console.log('');
      console.log('🔧 MANUAL SETUP REQUIRED:');
      console.log('');
      console.log('1. Go to Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/_/sql');
      console.log('');
      console.log('2. Copy and paste the entire content from:');
      console.log('   database-setup.sql');
      console.log('');
      console.log('3. Click "Run" to execute the SQL');
      console.log('');
      console.log('4. After successful execution, run this setup again:');
      console.log('   npm run setup');
      console.log('');
      process.exit(1);
    } else if (error) {
      throw new Error(`Connection failed: ${error.message}`);
    } else {
      console.log('✅ Connected to Supabase successfully');
      console.log('✅ Tables already exist');
      console.log('');
      console.log('You can now start the server:');
      console.log('  npm run dev (development)');
      console.log('  ./deploy.sh (production)');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('');
    console.log('Please check your .env file:');
    console.log('  - SUPABASE_URL');
    console.log('  - SUPABASE_ANON_KEY');
    console.log('  - SUPABASE_SERVICE_KEY');
    console.log('');
    process.exit(1);
  }
}

// Run setup
if (process.env.SUPABASE_SERVICE_KEY) {
  setupDatabase();
} else {
  setupDatabaseDirect();
}
