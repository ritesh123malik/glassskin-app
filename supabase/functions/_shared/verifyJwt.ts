/**
 * Shared JWT verification utility for GLASSSKIN Edge Functions.
 *
 * For state-changing requests (POST/PUT/PATCH/DELETE), call requireAuthenticatedUser()
 * to:
 *   1. Verify the Authorization header contains a valid Supabase JWT
 *   2. Verify the token's `aud` claim matches the Supabase project URL
 *   3. Verify the token is not an anonymous token
 *   4. Return the user ID from the `sub` claim
 *
 * This provides CSRF protection because:
 *   - A cross-origin attacker cannot read the JWT to include it in a forged request
 *   - The `aud` claim ensures the token was issued for our project
 *   - The `sub` claim identifies the authenticated user
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const json = Buffer.from(base64, 'base64').toString('utf8')
  return json
}

function decodeJwt(token: string): { payload: any; error?: string } {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { payload: null, error: 'Invalid token format' }
  }

  try {
    const payload = JSON.parse(base64UrlDecode(parts[1]))
    return { payload }
  } catch {
    return { payload: null, error: 'Failed to decode token payload' }
  }
}

async function verifyWithSupabase(token: string): Promise<{ userId: string } | { error: string; status: number }> {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.38.4')
  const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY
  const supabase = createClient(SUPABASE_URL, key)

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  return { userId: data.user.id }
}

export async function requireAuthenticatedUser(
  req: Request
): Promise<{ userId: string } | { error: string; status: number }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing Authorization header', status: 401 }
  }

  const token = authHeader.slice(7)

  // Decode and validate claims locally first (fast fail)
  const { payload, error: decodeError } = decodeJwt(token)
  if (decodeError || !payload) {
    return { error: decodeError || 'Invalid token', status: 401 }
  }

  // Verify audience claim matches our project URL
  if (payload.aud !== SUPABASE_URL.replace(/\/$/, '')) {
    return { error: 'Invalid token audience', status: 401 }
  }

  // Reject anonymous tokens for user-facing actions
  if (payload.app_metadata?.provider === 'anonymous' || payload.role === 'anonymous') {
    return { error: 'Anonymous access not permitted', status: 401 }
  }

  // Verify token is not expired
  if (payload.exp && Date.now() >= payload.exp * 1000) {
    return { error: 'Token expired', status: 401 }
  }

  // Verify with Supabase (catches revoked tokens)
  return verifyWithSupabase(token)
}
