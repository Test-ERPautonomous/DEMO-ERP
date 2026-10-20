/**
 * Najm Al Huda Workshop ERP - Supabase CommonJS Client
 * Safe initialization using environment variables only.
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_API_KEY ||
  process.env.SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  ''
).trim();

const isConfigured = Boolean(
  supabaseUrl &&
  /^https?:\/\//i.test(supabaseUrl) &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseKey &&
  supabaseKey.length > 20
);

const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://unconfigured.supabase.co',
  isConfigured ? supabaseKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured_server_placeholder_key_must_set_env',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

module.exports = {
  createClient,
  supabase,
  isConfigured,
};
