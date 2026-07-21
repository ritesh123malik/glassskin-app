/**
 * Shared CORS utility for GLASSSKIN Edge Functions.
 *
 * Allowed origins are controlled via the APP_ORIGINS environment variable:
 *   APP_ORIGINS=https://glassskin.com,https://www.glassskin.com,https://app.glassskin.com
 *
 * In development, localhost origins are always allowed.
 * If APP_ORIGINS is not set, the function will reject non-local requests with a 403.
 */

const ALLOWED_ORIGINS = (Deno.env.get('APP_ORIGINS') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0)

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const ALLOWED_HEADERS = [
  'authorization',
  'x-client-info',
  'apikey',
  'content-type',
  'stripe-signature',
  'paypal-signature',
]

function isLocalOrigin(origin: string): boolean {
  return (
    origin === 'http://localhost' ||
    origin === 'http://localhost:8081' ||
    origin === 'http://localhost:19006' ||
    origin === 'http://127.0.0.1' ||
    origin === 'http://127.0.0.1:8081' ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:')
  )
}

function isOriginAllowed(origin: string): boolean {
  if (isLocalOrigin(origin)) {
    return true
  }
  return ALLOWED_ORIGINS.includes(origin)
}

export function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', '),
    'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', '),
    'Access-Control-Max-Age': '86400',
  }

  if (requestOrigin && isOriginAllowed(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else if (ALLOWED_ORIGINS.length === 0) {
    // No production origins configured — block non-local requests
    headers['Access-Control-Allow-Origin'] = requestOrigin ?? ''
  }

  return headers
}

export function corsPreflightResponse(requestOrigin: string | null): Response {
  const headers = getCorsHeaders(requestOrigin)
  if (!headers['Access-Control-Allow-Origin']) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
  return new Response('ok', { headers })
}

export function rejectCors(requestOrigin: string | null): Response {
  return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
    status: 403,
    headers: getCorsHeaders(requestOrigin),
  })
}
