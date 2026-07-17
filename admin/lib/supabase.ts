import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('your-project') ||
  supabaseAnonKey.includes('your-supabase-anon-key')
) {
  throw new Error(
    'Admin Supabase environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in admin/.env.local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Creates a Supabase client authenticated with the given access token.
 * Use this for server-side calls that need to respect Row Level Security.
 */
export const createAuthenticatedClient = (accessToken: string) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};
