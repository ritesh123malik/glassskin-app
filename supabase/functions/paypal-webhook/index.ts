import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { verifyPayPalWebhookSignature } from "./verify.ts"

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? ''
  const isLive = Deno.env.get('PAYPAL_ENV') === 'live'
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'

  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not configured')
  }

  const auth = btoa(`${clientId}:${clientSecret}`)
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Failed to get PayPal token: ${await res.text()}`)
  }

  const data = await res.json()
  return { accessToken: data.access_token, baseUrl }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const body = await req.json()
  const eventId = body.id
  const eventType = body.event_type
  const resource = body.resource ?? {}
  const orderId = resource.purchase_units?.[0]?.reference_id

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { accessToken, baseUrl } = await getPayPalAccessToken()
    const signatureOk = await verifyPayPalWebhookSignature(req, body, accessToken, baseUrl)

    await supabase.from('paypal_webhook_events').upsert(
      {
        event_id: eventId,
        event_type: eventType,
        paypal_order_id: resource.id,
        order_id: orderId,
        payload: body,
        verified: signatureOk,
        processed_at: new Date().toISOString(),
      },
      { onConflict: 'event_id' }
    )

    if (!signatureOk) {
      return new Response(JSON.stringify({ error: 'Invalid PayPal webhook signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (eventType === 'CHECKOUT.ORDER.APPROVED' || eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      if (orderId) {
        const { error } = await supabase.rpc('confirm_order_payment', { p_order_id: orderId })
        if (error) throw error
      }
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED' || eventType === 'CHECKOUT.ORDER.VOIDED') {
      if (orderId) {
        const { error } = await supabase.rpc('fail_order_payment', { p_order_id: orderId })
        if (error) throw error
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('paypal-webhook error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
