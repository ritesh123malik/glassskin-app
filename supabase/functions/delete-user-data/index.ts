import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireAuthenticatedUser } from '../_shared/verifyJwt.ts';

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

    const userId = authResult.userId

    // We need service role to delete the user and update orders bypassing RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Anonymize Orders
    // We cannot delete orders for tax/financial audit reasons.
    // So we NULL out the user_id and scrub PII from the shipping_address.
    const { data: orders, error: ordersFetchError } = await supabaseAdmin
      .from('orders')
      .select('id, shipping_address')
      .eq('user_id', userId);

    if (ordersFetchError) throw ordersFetchError;

    for (const order of orders || []) {
      const address = order.shipping_address || {};
      // Keep only non-PII geographic data for tax reporting
      const anonymizedAddress = {
        city: address.city || 'Unknown',
        state: address.state || 'Unknown',
        postalCode: address.postalCode || 'Unknown',
        country: address.country || 'Unknown',
        // Scrubbed fields:
        name: '[ANONYMIZED]',
        line1: '[ANONYMIZED]',
        line2: null,
        phone: null,
      };

      await supabaseAdmin
        .from('orders')
        .update({ 
          user_id: null,
          shipping_address: anonymizedAddress
        })
        .eq('id', order.id);
    }

    // 2. Delete the user from auth.users (This will cascade to public.users, cart_items, wishlists, reviews)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: 'User data successfully deleted and anonymized' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
