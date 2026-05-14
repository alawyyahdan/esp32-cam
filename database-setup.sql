-- ESP32-CAM Streaming Provider - Database Setup
-- Run this SQL in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Devices table
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

-- Stream sessions table
CREATE TABLE IF NOT EXISTS stream_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_api_key ON devices(device_api_key);
CREATE INDEX IF NOT EXISTS idx_devices_viewer_api_key ON devices(viewer_api_key);

-- Stream sessions indexes
CREATE INDEX IF NOT EXISTS idx_stream_sessions_device_id ON stream_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_stream_sessions_active ON stream_sessions(device_id, ended_at) WHERE ended_at IS NULL;

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Devices policies
DROP POLICY IF EXISTS "Users can view own devices" ON devices;
CREATE POLICY "Users can view own devices" ON devices
  FOR ALL USING (auth.uid() = user_id);

-- Stream sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON stream_sessions;
CREATE POLICY "Users can view own sessions" ON stream_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM devices 
      WHERE devices.id = stream_sessions.device_id 
      AND devices.user_id = auth.uid()
    )
  );

-- ============================================
-- 5. GRANT PERMISSIONS (for service role)
-- ============================================

-- Grant all permissions to authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON devices TO authenticated;
GRANT ALL ON stream_sessions TO authenticated;

-- Grant all permissions to service role (for server operations)
GRANT ALL ON users TO service_role;
GRANT ALL ON devices TO service_role;
GRANT ALL ON stream_sessions TO service_role;

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Tables created: users, devices, stream_sessions
-- Indexes created for performance
-- RLS enabled for security
-- Policies configured for access control
