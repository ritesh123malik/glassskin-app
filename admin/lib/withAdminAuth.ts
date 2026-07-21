import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_AUTH_COOKIE } from './constants'

function getUserIdFromToken(token: string): string {
  const payload = token.split('.')[1]
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const json = Buffer.from(base64, 'base64').toString('utf8')
  const decoded = JSON.parse(json)
  return decoded.sub
}

export async function requireAdmin(request: NextRequest): Promise<{ userId: string } | { error: string; status: number }> {
  const accessToken = request.cookies.get(ADMIN_AUTH_COOKIE)?.value

  if (!accessToken) {
    return { error: 'Unauthorized', status: 401 }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const userId = getUserIdFromToken(accessToken)

  if (serviceRoleKey) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await adminClient
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data || data.role !== 'admin') {
      return { error: 'Forbidden', status: 403 }
    }
    return { userId }
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error || !data || data.role !== 'admin') {
    return { error: 'Forbidden', status: 403 }
  }
  return { userId }
}
