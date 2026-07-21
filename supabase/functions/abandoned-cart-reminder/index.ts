/**
 * abandoned-cart-reminder Edge Function
 *
 * Scheduled via Supabase Cron (pg_cron) to run periodically.
 * Finds carts untouched for a configurable window, checks:
 *   1. User has cart_reminders enabled (server-side gating)
 *   2. Not already sent a reminder in the cooldown window (idempotent)
 * Dispatches push notifications to all registered devices.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { getCorsHeaders } from "../_shared/cors.ts"

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send'

// Configurable via env or defaults
const ABANDONMENT_WINDOW_HOURS = parseInt(Deno.env.get('ABANDONED_CART_HOURS') ?? '2')
const COOLDOWN_HOURS = parseInt(Deno.env.get('ABANDONED_CART_COOLDOWN_HOURS') ?? '24')

interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, any>
  sound?: 'default'
}

async function sendExpoPushNotifications(messages: PushMessage[]) {
  if (messages.length === 0) return

  const res = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`Expo Push API error: ${errText}`)
  } else {
    const result = await res.json()
    console.log('Expo Push API result:', JSON.stringify(result))
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

    const abandonmentCutoff = new Date()
    abandonmentCutoff.setHours(abandonmentCutoff.getHours() - ABANDONMENT_WINDOW_HOURS)

    const cooldownCutoff = new Date()
    cooldownCutoff.setHours(cooldownCutoff.getHours() - COOLDOWN_HOURS)

    const { data: abandonedCarts, error: cartsError } = await supabase
      .rpc('get_abandoned_cart_users', {
        p_abandonment_cutoff: abandonmentCutoff.toISOString(),
        p_cooldown_cutoff: cooldownCutoff.toISOString(),
      })

    if (cartsError) throw cartsError
    if (!abandonedCarts || abandonedCarts.length === 0) {
      console.log('No abandoned carts found for this window.')
      return new Response(JSON.stringify({ message: 'No abandoned carts found', dispatched: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Found ${abandonedCarts.length} users with abandoned carts`)

    let totalDispatched = 0

    for (const cart of abandonedCarts) {
      const userId: string = cart.user_id

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('cart_reminders')
        .eq('user_id', userId)
        .maybeSingle()

      if (prefs && prefs.cart_reminders === false) {
        console.log(`User ${userId} has cart reminders disabled — skipping`)
        continue
      }

      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', userId)

      if (!tokens || tokens.length === 0) {
        console.log(`No push tokens for user ${userId} — skipping`)
        continue
      }

      const messages: PushMessage[] = tokens.map((t: { token: string }) => ({
        to: t.token,
        title: '🛍️ You Left Something Behind!',
        body: `Your GLASSSKIN cart is waiting for you. Complete your clean skincare routine today.`,
        sound: 'default',
        data: {
          screen: 'Cart',
          params: {},
        },
      }))

      await sendExpoPushNotifications(messages)
      totalDispatched += messages.length
    }

    return new Response(JSON.stringify({ message: 'Abandoned cart reminders dispatched', dispatched: totalDispatched }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('abandoned-cart-reminder error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
