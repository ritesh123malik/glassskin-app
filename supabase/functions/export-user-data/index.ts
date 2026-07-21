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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // We can use the regular client to fetch data since RLS allows owners to view their own data
    
    const [
      { data: profile },
      { data: orders },
      { data: cartItems },
      { data: wishlists },
      { data: reviews }
    ] = await Promise.all([
      supabaseClient.from('users').select('*').eq('id', userId).single(),
      supabaseClient.from('orders').select('*, order_items(*)').eq('user_id', userId),
      supabaseClient.from('cart_items').select('*').eq('user_id', userId),
      supabaseClient.from('wishlists').select('*').eq('user_id', userId),
      supabaseClient.from('reviews').select('*').eq('user_id', userId),
    ]);

    const authUser = (await supabaseClient.auth.getUser()).data.user

    const exportData = {
      account: {
        id: userId,
        email: authUser?.email,
        created_at: authUser?.created_at,
        last_sign_in_at: authUser?.last_sign_in_at,
      },
      profile: profile || {},
      orders: orders || [],
      cart_items: cartItems || [],
      wishlists: wishlists || [],
      reviews: reviews || []
    };

    return new Response(JSON.stringify(exportData, null, 2), {
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
