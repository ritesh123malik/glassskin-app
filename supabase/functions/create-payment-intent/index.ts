import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno"
import { getCorsHeaders, requireAuthenticatedUser } from "../_shared/verifyJwt.ts"

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
    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authResult = await requireAuthenticatedUser(req)
    if ('error' in authResult) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role key — bypasses RLS so we can read promo_codes and tax_rates
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // ── 1. Fetch the order + its items ──────────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, items:order_items(product_id, product_name, price, quantity)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: `Order not found: ${orderError?.message}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.status !== 'payment_pending') {
      return new Response(JSON.stringify({ error: `Order is not in payment_pending status (status: ${order.status})` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Verify caller owns the order ─────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (order.user_id) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Auth header is missing' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const token = authHeader.replace('Bearer ', '')
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token)
      if (authError || !authUser || order.user_id !== authUser.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: Order does not belong to you' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── 3. Independently recompute totals via server-side RPC ────────────────
    //       We call compute_order_totals() with the live catalog + DB tax/shipping
    //       tables. The result is compared against the order's stored amounts to
    //       detect any forgery. We NEVER trust order.discount_amount / tax_amount
    //       / shipping_amount at face value.
    //
    //       To get the promo code: we read order_items and re-derive the promo
    //       code that was applied by looking at what discount was stored.
    //       Crucially, the PaymentIntent amount is the RECOMPUTED total, not
    //       the stored total.

    const itemsPayload = order.items.map((i: any) => ({
      product_id: i.product_id,
      quantity: i.quantity,
    }))

    const state = order.shipping_address?.state ?? 'US'

    // Re-derive which promo code (if any) was applied by calling validate_promo_code
    // against the discount stored. We re-lookup the promo code stored on the order.
    // NOTE: The promo code is NOT stored on the order row — we detect it by checking
    // whether discount_amount > 0 and then finding the matching code. Instead, we
    // recompute WITHOUT a promo code as the baseline and verify the server math matches.
    // If the order has a discount, we look for the promo code that yields that exact amount.

    // Compute totals WITHOUT promo (baseline)
    const { data: baselineTotals, error: baselineError } = await supabase
      .rpc('compute_order_totals', {
        p_items: itemsPayload,
        p_promo_code: null,
        p_state: state,
      })

    if (baselineError || !baselineTotals) {
      throw new Error(`Failed to compute baseline order totals: ${baselineError?.message}`)
    }

    // The total we charge is derived from the server-computed amounts.
    // If the stored discount > 0, we find the matching promo code to recompute WITH it.
    let trueTotals = baselineTotals
    const storedDiscount = parseFloat(order.discount_amount ?? 0)

    // Reject negative discounts outright — no legitimate promo produces one
    if (storedDiscount < 0) {
      return new Response(
        JSON.stringify({
          error: 'FORGED_DISCOUNT',
          message: `Negative discount amount $${storedDiscount} is never valid. Payment rejected.`,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (storedDiscount > 0) {
      // Find the active promo code that produced this discount amount
      // by calling compute_order_totals with each active code.
      const { data: promoCodes } = await supabase
        .from('promo_codes')
        .select('code')
        .eq('active', true)

      let matchedCode: string | null = null
      for (const pc of (promoCodes ?? [])) {
        const { data: promoTotals } = await supabase
          .rpc('compute_order_totals', {
            p_items: itemsPayload,
            p_promo_code: pc.code,
            p_state: state,
          })
        if (promoTotals) {
          const promoDiscount = parseFloat(promoTotals.discount_amount ?? 0)
          if (Math.abs(promoDiscount - storedDiscount) < 0.01) {
            matchedCode = pc.code
            trueTotals = promoTotals
            break
          }
        }
      }

      // If no promo code matches the stored discount, the discount is FORGED
      if (!matchedCode) {
        return new Response(
          JSON.stringify({
            error: 'FORGED_DISCOUNT',
            message: `Stored discount amount $${storedDiscount} does not match any valid promo code. Payment rejected.`,
          }),
          {
            status: 422,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // ── 4. Server-authoritative total — what Stripe charges ─────────────────
    const authorizedTotal = parseFloat(trueTotals.total_amount)

    // Sanity-check: if stored order total differs by more than $0.05 from what
    // we independently computed, log it and use the server-computed value.
    const storedTotal = parseFloat(order.total_amount)
    if (Math.abs(storedTotal - authorizedTotal) > 0.05) {
      console.warn(
        `[SECURITY] Order ${orderId}: stored total $${storedTotal} ≠ recomputed total $${authorizedTotal}. ` +
        `Charging server-computed amount.`
      )
      // Update the stored order amounts to match server computation (prevents
      // the database from reflecting a forged value going forward)
      await supabase
        .from('orders')
        .update({
          total_amount:    authorizedTotal,
          tax_amount:      parseFloat(trueTotals.tax_amount),
          shipping_amount: parseFloat(trueTotals.shipping_amount),
          discount_amount: parseFloat(trueTotals.discount_amount),
        })
        .eq('id', orderId)
    }

    // ── 5. Stock availability re-check (defense in depth) ───────────────────
    const productIds = order.items.map((item: any) => item.product_id)
    const { data: dbProducts, error: dbProductsError } = await supabase
      .from('products')
      .select('id, price, stock_quantity, name')
      .in('id', productIds)

    if (dbProductsError || !dbProducts) {
      throw new Error(`Failed to fetch product catalog: ${dbProductsError?.message}`)
    }

    const productsMap = new Map(dbProducts.map((p: any) => [p.id, p]))
    for (const item of order.items) {
      const dbProduct = productsMap.get(item.product_id)
      if (!dbProduct) throw new Error(`Product not found: ${item.product_id}`)
      if (dbProduct.stock_quantity < 0) {
        return new Response(
          JSON.stringify({
            error: 'STOCK_SHORTAGE',
            productId: item.product_id,
            productName: dbProduct.name,
            message: `"${dbProduct.name}" is out of stock. Please update your cart.`,
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ── 6. Create Stripe PaymentIntent with the SERVER-computed amount ───────
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecret) throw new Error('STRIPE_SECRET_KEY is not configured')

    const stripe = new Stripe(stripeSecret, { apiVersion: '2022-11-15' })

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: Math.round(authorizedTotal * 100), // always server-computed
        currency: 'usd',
        metadata: {
          orderId,
          server_computed_total: authorizedTotal.toString(),
          server_computed_tax: trueTotals.tax_amount.toString(),
          server_computed_shipping: trueTotals.shipping_amount.toString(),
          server_computed_discount: trueTotals.discount_amount.toString(),
        },
        automatic_payment_methods: { enabled: true },
      },
      { idempotencyKey: orderId }
    )

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent.client_secret,
        ephemeralKey: paymentIntent.id,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY') ?? '',
        // Return authoritative totals so the client can update its display
        serverTotals: {
          subtotal:         parseFloat(trueTotals.subtotal),
          discount_amount:  parseFloat(trueTotals.discount_amount),
          tax_amount:       parseFloat(trueTotals.tax_amount),
          shipping_amount:  parseFloat(trueTotals.shipping_amount),
          total_amount:     authorizedTotal,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('[create-payment-intent] Fatal error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
