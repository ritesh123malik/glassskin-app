import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isAdminSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-supabase-anon-key')
);

if (!isAdminSupabaseConfigured) {
  console.error(
    '[admin/supabase] Missing required environment variables: ' +
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in admin/.env.local. ' +
    'Copy admin/.env.example to admin/.env.local and fill in your Supabase project credentials.'
  );
}

const url = supabaseUrl || '';
const key = supabaseAnonKey || '';

export const supabase = createClient(url, key);

/**
 * Creates a Supabase client authenticated with the given access token.
 * Use this for server-side calls that need to respect Row Level Security.
 */
export const createAuthenticatedClient = (accessToken: string) => {
  return createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
