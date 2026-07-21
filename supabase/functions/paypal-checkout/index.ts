import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { getCorsHeaders, requireAuthenticatedUser } from "../_shared/verifyJwt.ts"

function utf8ToBase64(str: string): string {
  return btoa(
    Array.from(new TextEncoder().encode(str))
      .map((byte) => String.fromCharCode(byte))
      .join('')
  )
}

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? ''
  const isLive = Deno.env.get('PAYPAL_ENV') === 'live'
  const baseUrl = isLive ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
  
  if (!clientId || !clientSecret) {
    throw new Error('PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is not configured on the backend')
  }

  const auth = utf8ToBase64(`${clientId}:${clientSecret}`)
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Failed to get PayPal token: ${errorText}`)
  }

  const data = await res.json()
  return { accessToken: data.access_token, baseUrl }
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
    const authResult = await requireAuthenticatedUser(req)
    if ('error' in authResult) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authenticatedUserId = authResult.userId

    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (action === 'create') {
      const { orderId } = await req.json()
      if (!orderId) {
        return new Response(JSON.stringify({ error: 'orderId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
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

      if (order.user_id !== authenticatedUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden: Order does not belong to you' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const productIds = order.items.map((item: any) => item.product_id)
      const { data: dbProducts, error: dbProductsError } = await supabase
        .from('products')
        .select('id, price, stock_quantity, name')
        .in('id', productIds)

      if (dbProductsError || !dbProducts) {
        throw new Error(`Failed to fetch product catalog details: ${dbProductsError?.message}`)
      }

      const productsMap = new Map(dbProducts.map((p: any) => [p.id, p]))
      
      let calculatedSubtotal = 0
      for (const item of order.items) {
        const dbProduct = productsMap.get(item.product_id)
        if (!dbProduct) {
          throw new Error(`Product not found in catalog: ${item.product_id}`)
        }

        if (dbProduct.stock_quantity < item.quantity) {
          return new Response(
            JSON.stringify({
              error: 'STOCK_SHORTAGE',
              productId: item.product_id,
              productName: dbProduct.name,
              availableStock: dbProduct.stock_quantity,
              requestedQty: item.quantity,
              message: `Only ${dbProduct.stock_quantity} left of "${dbProduct.name}" — please update your cart.`
            }),
            {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }

        const price = parseFloat(dbProduct.price)
        if (Math.abs(parseFloat(item.price) - price) > 0.01) {
          throw new Error(`Price mismatch for product ${item.product_name}`)
        }
        calculatedSubtotal += price * item.quantity
      }

      const discount = parseFloat(order.discount_amount)
      const tax = parseFloat(order.tax_amount)
      const shipping = parseFloat(order.shipping_amount)
      const expectedTotal = parseFloat((calculatedSubtotal - discount + tax + shipping).toFixed(2))

      if (Math.abs(expectedTotal - parseFloat(order.total_amount)) > 0.05) {
        throw new Error(`Total amount validation failed. Expected: ${expectedTotal}, Client sent: ${order.total_amount}`)
      }

      const { accessToken, baseUrl } = await getPayPalAccessToken()
      const paypalRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: orderId,
              amount: {
                currency_code: 'USD',
                value: expectedTotal.toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: 'GLASSSKIN',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: 'glassskin://paypal-callback',
            cancel_url: 'glassskin://paypal-cancel',
          },
        }),
      })

      if (!paypalRes.ok) {
        const paypalErr = await paypalRes.text()
        throw new Error(`PayPal order creation failed: ${paypalErr}`)
      }

      const paypalOrder = await paypalRes.json()
      const approveLink = paypalOrder.links.find((l: any) => l.rel === 'approve')?.href

      if (!approveLink) {
        throw new Error('Approval URL not found in PayPal response')
      }

      return new Response(
        JSON.stringify({
          approvalUrl: approveLink,
          paypalOrderId: paypalOrder.id,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (action === 'capture') {
      const { orderId, paypalOrderId } = await req.json()
      if (!orderId || !paypalOrderId) {
        return new Response(JSON.stringify({ error: 'orderId and paypalOrderId are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', orderId)
        .single()

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: `Order not found: ${orderError?.message}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (order.user_id !== authenticatedUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden: Order does not belong to you' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const productIds = order.items.map((item: any) => item.product_id)
      const { data: dbProducts, error: dbProductsError } = await supabase
        .from('products')
        .select('id, price, stock_quantity, name')
        .in('id', productIds)

      if (dbProductsError || !dbProducts) {
        throw new Error(`Failed to fetch product catalog details: ${dbProductsError?.message}`)
      }

      const productsMap = new Map(dbProducts.map((p: any) => [p.id, p]))
      
      let calculatedSubtotal = 0
      for (const item of order.items) {
        const dbProduct = productsMap.get(item.product_id)
        if (!dbProduct) {
          throw new Error(`Product not found in catalog: ${item.product_id}`)
        }

        const price = parseFloat(dbProduct.price)
        if (Math.abs(parseFloat(item.price) - price) > 0.01) {
          throw new Error(`Price mismatch for product ${item.product_name}`)
        }
        calculatedSubtotal += price * item.quantity
      }

      const discount = parseFloat(order.discount_amount)
      const tax = parseFloat(order.tax_amount)
      const shipping = parseFloat(order.shipping_amount)
      const expectedTotal = parseFloat((calculatedSubtotal - discount + tax + shipping).toFixed(2))

      const { accessToken, baseUrl } = await getPayPalAccessToken()
      const paypalRes = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!paypalRes.ok) {
        const captureErr = await paypalRes.text()
        throw new Error(`PayPal Capture API failed: ${captureErr}`)
      }

      const captureData = await paypalRes.json()

      if (captureData.status === 'COMPLETED') {
        const capturedValue = parseFloat(captureData.purchase_units[0].payments.captures[0].amount.value)

        if (Math.abs(capturedValue - expectedTotal) > 0.05) {
          console.error(`PayPal capture amount mismatch. Expected: ${expectedTotal}, Captured: ${capturedValue}`)
          const { error } = await supabase.rpc('fail_order_payment', { p_order_id: orderId })
          if (error) throw error

          return new Response(JSON.stringify({
            error: 'CAPTURE_AMOUNT_MISMATCH',
            expected: expectedTotal,
            captured: capturedValue,
            message: `Captured amount ${capturedValue} does not match expected total ${expectedTotal}. Order has been flagged and payment reversed.`
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        const { error } = await supabase.rpc('confirm_order_payment', { p_order_id: orderId })
        if (error) throw error

        return new Response(JSON.stringify({ success: true, status: 'COMPLETED' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        const { error } = await supabase.rpc('fail_order_payment', { p_order_id: orderId })
        if (error) throw error

        return new Response(JSON.stringify({ success: false, status: captureData.status }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
