/**
 * send-order-notification Edge Function
 *
 * Triggered by a Supabase Database Webhook on `orders.status` column changes.
 * Checks per-user notification preferences server-side before dispatching.
 * Routes to the correct notification copy based on transition type.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  const chunks: PushMessage[][] = []
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100))
  }

  for (const chunk of chunks) {
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Webhook payload from Supabase Database Webhooks (HTTP POST)
    const payload = await req.json()
    console.log('Received webhook payload:', JSON.stringify(payload))

    // Support both direct calls and Supabase webhook format
    const record = payload.record || payload
    const oldRecord = payload.old_record || {}

    const { id: orderId, user_id: userId, status: newStatus } = record
    const oldStatus = oldRecord.status

    // Skip if status hasn't changed
    if (newStatus === oldStatus) {
      return new Response(JSON.stringify({ message: 'Status unchanged, skipping' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const notificationContent = getNotificationContent(newStatus, orderId)
    if (!notificationContent) {
      return new Response(JSON.stringify({ message: `No notification defined for status: ${newStatus}` }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // If user_id is null (guest order) we cannot push — skip
    if (!userId) {
      return new Response(JSON.stringify({ message: 'Guest order — no push token available' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Server-side preference gate: check user's order_notifications flag
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('order_notifications')
      .eq('user_id', userId)
      .maybeSingle()

    if (prefs && prefs.order_notifications === false) {
      return new Response(JSON.stringify({ message: 'User has disabled order notifications — skipping' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch all push tokens for the user
    const { data: tokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', userId)

    if (tokensError || !tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No push tokens found for user' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build push messages for all registered devices
    const messages: PushMessage[] = tokens.map((t: { token: string }) => ({
      to: t.token,
      title: notificationContent.title,
      body: notificationContent.body,
      sound: 'default',
      data: {
        screen: notificationContent.screen,
        params: { orderId },
      },
    }))

    await sendExpoPushNotifications(messages)

    return new Response(JSON.stringify({ success: true, dispatched: messages.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-order-notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
