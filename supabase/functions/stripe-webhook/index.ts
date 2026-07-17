import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno"

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
    const stripe = new Stripe(stripeSecret, {
      apiVersion: '2022-11-15',
    })

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    // Service role client to confirm/fail order payments
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Stripe Webhook Event Type: ${event.type}`)

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.orderId

      if (orderId) {
        console.log(`Payment succeeded for Order ${orderId}. Confirming order...`)
        const { error } = await supabase.rpc('confirm_order_payment', { p_order_id: orderId })
        if (error) throw error
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const orderId = paymentIntent.metadata.orderId

      if (orderId) {
        console.warn(`Payment failed for Order ${orderId}. Reverting order and stock...`)
        const { error } = await supabase.rpc('fail_order_payment', { p_order_id: orderId })
        if (error) throw error
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error(`Webhook error: ${err.message}`)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }
})
