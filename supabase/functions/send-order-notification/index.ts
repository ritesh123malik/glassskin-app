/**
 * send-order-notification Edge Function
 *
 * Triggered by a Supabase Database Webhook on `orders.status` column changes.
 * Checks per-user notification preferences server-side before dispatching.
 * Routes to the correct notification copy based on transition type.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { getCorsHeaders } from "../_shared/cors.ts"

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default'
  badge?: number
  channelId?: string
}

async function sendExpoPushNotifications(messages: PushMessage[]) {
  if (messages.length === 0) return

  const res = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(chunk),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`Expo Push API error: ${errText}`)
  } else {
    const result = await res.json()
    console.log('Expo Push API result:', JSON.stringify(result))
  }
}

function getNotificationContent(
  status: string,
  orderId: string
): { title: string; body: string; screen: string } | null {
  switch (status) {
    case 'processing':
      return {
        title: '✅ Order Confirmed!',
        body: `Your order ${orderId} has been confirmed and is being prepared.`,
        screen: 'OrderTracking',
      }
    case 'shipped':
      return {
        title: '🚚 Your Order is On Its Way!',
        body: `Order ${orderId} has been shipped and is heading to you.`,
        screen: 'OrderTracking',
      }
    case 'delivered':
      return {
        title: '📦 Order Delivered!',
        body: `Order ${orderId} has been delivered. We hope you love it!`,
        screen: 'OrderTracking',
      }
    default:
      return null
  }
}

serve(async (req) => {
  const requestOrigin = req.headers.get('origin')
  const corsHeaders = getCorsHeaders(requestOrigin)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const record = body.record
    const oldRecord = body.old_record

    if (!record || !oldRecord || record.status === oldRecord.status) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderId = record.id
    const newStatus = record.status
    const userId = record.user_id

    if (!userId) {
      return new Response(JSON.stringify({ received: true, skipped: 'no_user' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('order_notifications')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefs && prefs.order_notifications === false) {
      return new Response(JSON.stringify({ received: true, skipped: 'prefs_disabled' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ received: true, skipped: 'no_tokens' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const notification = getNotificationContent(newStatus, orderId)
    if (!notification) {
      return new Response(JSON.stringify({ received: true, skipped: 'no_content' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const messages: PushMessage[] = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: {
        screen: notification.screen,
        params: { orderId },
      },
    }))

    await sendExpoPushNotifications(messages)

    return new Response(JSON.stringify({ received: true, dispatched: messages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-order-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
