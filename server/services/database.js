const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with SERVICE KEY so server-side ops bypass RLS
// ANON_KEY is for client-side (browser); SERVICE_KEY is for trusted server code
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Database connection test
async function connectDatabase() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet
      throw error;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

// Graceful shutdown (not needed for Supabase but keeping for compatibility)
async function disconnectDatabase() {
  console.log('🔌 Supabase connection closed');
}

// User operations
const userService = {
  async createUser(email, passwordHash) {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        devices (*)
      `)
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      return null; // User not found
    }
    
    // Transform to match expected format
    if (data) {
      return {
        ...data,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return data;
  },

  async findUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        devices (*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    
    // Transform to match expected format
    if (data) {
      return {
        ...data,
        passwordHash: data.password_hash,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }
    return data;
  },
};

// Device operations
const deviceService = {
  async createDevice(userId, name, deviceApiKey, viewerApiKey) {
    const { data, error } = await supabase
      .from('devices')
      .insert([
        {
          user_id: userId,
          name,
          device_api_key: deviceApiKey,
          viewer_api_key: viewerApiKey,
          is_online: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async findDeviceByApiKey(apiKey, type = 'device') {
    const column = type === 'device' ? 'device_api_key' : 'viewer_api_key';
    
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        users (*)
      `)
      .eq(column, apiKey)
      .single();

    if (error) return null;
    
    // Transform to match Prisma structure
    return {
      ...data,
      user: data.users,
      deviceApiKey: data.device_api_key,
      viewerApiKey: data.viewer_api_key,
      isOnline: data.is_online,
      lastActive: data.last_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id
    };
  },

  async findDeviceById(id) {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        users (*)
      `)
      .eq('id', id)
      .single();

    if (error) return null;
    
    // Transform to match Prisma structure
    return {
      ...data,
      user: data.users,
      deviceApiKey: data.device_api_key,
      viewerApiKey: data.viewer_api_key,
      isOnline: data.is_online,
      lastActive: data.last_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userId: data.user_id
    };
  },

  async updateDeviceStatus(id, isOnline) {
    const { data, error } = await supabase
      .from('devices')
      .update({
        is_online: isOnline,
        last_active: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserDevices(userId) {
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to match Prisma structure
    return data.map(device => ({
      ...device,
      deviceApiKey: device.device_api_key,
      viewerApiKey: device.viewer_api_key,
      isOnline: device.is_online,
      lastActive: device.last_active,
      createdAt: device.created_at,
      updatedAt: device.updated_at,
      userId: device.user_id
    }));
  },

  async deleteDevice(id, userId) {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return { count: 1 }; // Supabase doesn't return count, but we assume success
  },

  async regenerateApiKeys(id, userId, deviceApiKey, viewerApiKey) {
    const { data, error } = await supabase
      .from('devices')
      .update({
        device_api_key: deviceApiKey,
        viewer_api_key: viewerApiKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select();

    if (error) throw error;
    return { count: data.length };
  },
};

// Stream session operations
const streamService = {
  async startSession(deviceId) {
    const { data, error } = await supabase
      .from('stream_sessions')
      .insert([
        {
          device_id: deviceId,
          started_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async endSession(deviceId) {
    const { data, error } = await supabase
      .from('stream_sessions')
      .update({
        ended_at: new Date().toISOString()
      })
      .eq('device_id', deviceId)
      .is('ended_at', null)
      .select();

    if (error) throw error;
    return data;
  },

  async getActiveSession(deviceId) {
    const { data, error } = await supabase
      .from('stream_sessions')
      .select('*')
      .eq('device_id', deviceId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') return null;
    return data;
  },
};

module.exports = {
  supabase,
  connectDatabase,
  disconnectDatabase,
  userService,
  deviceService,
  streamService,
};