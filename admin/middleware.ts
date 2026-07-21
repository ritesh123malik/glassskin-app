import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_AUTH_COOKIE } from './lib/constants'

interface JwtPayload {
  aud?: string;
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  role?: string;
  [key: string]: any;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(base64, 'base64').toString('utf8')
    return JSON.parse(json) as JwtPayload
  } catch (err) {
    console.error('[middleware] failed to decode JWT:', err)
    return null
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  if (!payload.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

function hasValidAudience(payload: JwtPayload, supabaseUrl: string): boolean {
  if (!payload.aud) return false
  const expectedAud = supabaseUrl.replace(/\/$/, '')
  return payload.aud === expectedAud || payload.aud === 'authenticated'
}

function getUserIdFromToken(token: string): string {
  const payload = token.split('.')[1]
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = Buffer.from(base64, 'base64').toString('utf8')
  const decoded = JSON.parse(json)
  return decoded.sub
}

async function verifyAdminRole(accessToken: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  try {
    const userId = getUserIdFromToken(accessToken)

    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey)
      const { data, error } = await adminClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      if (error || !data || data.role !== 'admin') {
        console.error('[middleware] service-role admin check failed:', error?.message, data)
        return false
      }
      return true
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data || data.role !== 'admin') {
      console.error('[middleware] anon admin check failed:', error?.message, data)
      return false
    }
    return true
  } catch (err) {
    console.error('[middleware] verifyAdminRole error:', err)
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''

  if (
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/health' ||
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get(ADMIN_AUTH_COOKIE)?.value

  if (!accessToken) {
    console.warn(`[middleware] no ${ADMIN_AUTH_COOKIE} cookie, redirecting to /login`)
    return redirectToLogin(request)
  }

  const payload = decodeJwt(accessToken)

  if (!payload) {
    console.warn('[middleware] invalid JWT token, redirecting to /login')
    return redirectToLogin(request)
  }

  if (!hasValidAudience(payload, supabaseUrl)) {
    console.warn('[middleware] invalid JWT audience:', payload.aud)
    return redirectToLogin(request)
  }

  if (isTokenExpired(payload)) {
    console.warn('[middleware] expired JWT token, redirecting to /login')
    return redirectToLogin(request)
  }

  const isAdmin = await verifyAdminRole(accessToken)

  if (!isAdmin) {
    console.warn('[middleware] admin check failed, redirecting to /login')
    return redirectToLogin(request)
  }

  return NextResponse.next()
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!login|api/auth/login|api/auth/logout|api/health|_next/static|_next/image|favicon\\.ico).*)',
  ],
}
