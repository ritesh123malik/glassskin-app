import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_AUTH_COOKIE } from '@/lib/constants';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

async function checkRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  ip: string,
  email: string
): Promise<{ allowed: boolean; remainingMs?: number; reason?: string }> {
  const now = new Date().toISOString();

  const { data: attempts, error } = await (supabaseAdmin as any)
    .from('login_attempts')
    .select('*')
    .eq('ip', ip)
    .eq('email', email)
    .gte('created_at', new Date(Date.now() - WINDOW_MS).toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[login] rate limit check error:', error);
    return { allowed: true };
  }

  const failedAttempts = (attempts as any[])?.filter((a) => !a.success) || [];

  if (failedAttempts.length >= MAX_ATTEMPTS) {
    const mostRecent = failedAttempts[0];
    const lastAttemptTime = new Date(mostRecent.created_at).getTime();
    const lockoutEnd = lastAttemptTime + LOCKOUT_MS;
    const remainingMs = lockoutEnd - Date.now();

    if (remainingMs > 0) {
      return {
        allowed: false,
        remainingMs,
        reason: `Too many failed attempts. Try again in ${Math.ceil(remainingMs / 60000)} minutes.`,
      };
    }
  }

  return { allowed: true };
}

async function recordAttempt(
  supabaseAdmin: ReturnType<typeof createClient>,
  ip: string,
  email: string,
  success: boolean
): Promise<void> {
  await (supabaseAdmin as any).from('login_attempts').insert({
    ip,
    email,
    success,
    created_at: new Date().toISOString(),
  });

  const cutoff = new Date(Date.now() - WINDOW_MS).toISOString();
  await (supabaseAdmin as any)
    .from('login_attempts')
    .delete()
    .lt('created_at', cutoff);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const ip = getClientIp(request);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

    const rateLimit = await checkRateLimit(supabaseAdmin as any, ip, email);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.reason || 'Too many failed attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    const success = !error && !!data.session;
    await recordAttempt(supabaseAdmin as any, ip, email, success);

    if (error || !data.session) {
      return NextResponse.json(
        { error: 'Invalid login credentials' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin privileges required.' },
        { status: 403 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        user: { id: data.user.id, email: data.user.email },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in,
        },
      },
      { status: 200 }
    );

    const maxAge = data.session.expires_in || 3600;
    const token = data.session.access_token;

    response.cookies.set(ADMIN_AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge,
    });

    return response;
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
