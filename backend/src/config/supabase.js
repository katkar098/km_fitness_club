const { createClient } = require("@supabase/supabase-js");

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [
  !url && "SUPABASE_URL",
  !publishableKey && "SUPABASE_PUBLISHABLE_KEY",
  !serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY"
].filter(Boolean);

if (missing.length) {
  throw new Error(
    `Missing environment variables: ${missing.join(", ")}`
  );
}

// Used only for login/auth operations if needed
const authClient = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Full database access (Backend only)
const supabaseAdmin = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = {
  authClient,
  supabaseAdmin
};