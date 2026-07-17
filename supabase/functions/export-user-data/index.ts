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

    // We can use the regular client to fetch data since RLS allows owners to view their own data
    
    const [
      { data: profile },
      { data: orders },
      { data: cartItems },
      { data: wishlists },
      { data: reviews }
    ] = await Promise.all([
      supabaseClient.from('users').select('*').eq('id', user.id).single(),
      supabaseClient.from('orders').select('*, order_items(*)').eq('user_id', user.id),
      supabaseClient.from('cart_items').select('*').eq('user_id', user.id),
      supabaseClient.from('wishlists').select('*').eq('user_id', user.id),
      supabaseClient.from('reviews').select('*').eq('user_id', user.id),
    ]);

    const exportData = {
      account: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
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
