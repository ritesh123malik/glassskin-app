import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/withAdminAuth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!url || url.includes('your-project')) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key || key.includes('your-supabase-anon-key')) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: 'Admin Supabase environment is not configured.',
        missing,
        hint: 'Copy admin/.env.example to admin/.env.local and fill in your Supabase project credentials. Then restart the dev server.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: 'ok', configured: true });
}
