import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      .eq('user_id', user.id);

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
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

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
