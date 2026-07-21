import { NextResponse } from 'next/server';
import { ADMIN_AUTH_COOKIE } from '@/lib/constants';

export async function POST() {
  try {
    const response = NextResponse.json({ success: true }, { status: 200 });

    response.cookies.set(ADMIN_AUTH_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error('[logout] unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
