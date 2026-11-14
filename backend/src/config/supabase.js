const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

const isConfigured = Boolean(config.supabase.url && config.supabase.serviceRoleKey);

if (!isConfigured) {
  console.warn(
    '[Supabase Config Warning] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. Database and Auth calls will require valid environment variables.'
  );
}

// Administrative Supabase client (Service Role key bypasses RLS for trusted backend operations)
const supabaseAdmin = isConfigured
  ? createClient(config.supabase.url, config.supabase.serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Public/Anon Supabase client
const supabaseClient =
  config.supabase.url && config.supabase.anonKey
    ? createClient(config.supabase.url, config.supabase.anonKey)
    : null;

/**
 * Returns a Supabase client scoped to a user's JWT token for RLS enforcement
 * @param {string} token - The user's Bearer access token
 */
const getAuthenticatedClient = (token) => {
  if (!config.supabase.url || !config.supabase.anonKey) {
    return null;
  }
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

module.exports = {
  supabaseAdmin,
  supabaseClient,
  getAuthenticatedClient,
  isConfigured,
};
