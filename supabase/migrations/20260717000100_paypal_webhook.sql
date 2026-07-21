-- Migration: Remove stale create_order_transaction overloads
-- Date: 2026-07-17
--
-- PostgREST cannot resolve overloaded RPCs when multiple functions expose the
-- same named parameters in different orders. Keep exactly one canonical
-- signature: order/user/address/payment/items/promo, with legacy amount
-- parameters accepted only as optional compatibility args.

DROP FUNCTION IF EXISTS public.create_order_transaction(
  TEXT,
  UUID,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  JSONB,
  TEXT,
  JSONB
);

DROP FUNCTION IF EXISTS public.create_order_transaction(
  TEXT,
  UUID,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  JSONB,
  TEXT,
  JSONB,
  TEXT
);

DROP FUNCTION IF EXISTS public.create_order_transaction(
  TEXT,
  UUID,
  JSONB,
  TEXT,
  JSONB,
  TEXT,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  DECIMAL
);

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_id TEXT,
  p_user_id UUID,
  p_shipping_address JSONB,
  p_payment_method TEXT,
  p_items JSONB,
  p_promo_code TEXT DEFAULT NULL,
  p_total_amount DECIMAL(10,2) DEFAULT NULL,
  p_tax_amount DECIMAL(10,2) DEFAULT NULL,
  p_shipping_amount DECIMAL(10,2) DEFAULT NULL,
  p_discount_amount DECIMAL(10,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
  v_db_price DECIMAL(10,2);
  v_totals JSONB;
  v_discount DECIMAL(10,2);
  v_tax DECIMAL(10,2);
  v_shipping DECIMAL(10,2);
  v_total DECIMAL(10,2);
  v_state TEXT;
BEGIN
  -- For fully-authenticated users, verify the profile exists. Anonymous users
  -- have auth.uid() but no public.users row, so they are allowed through.
  IF p_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id)
  THEN
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id
        AND email IS NOT NULL
        AND NOT (
          (raw_app_meta_data->>'provider') = 'anonymous'
          OR (raw_app_meta_data->'providers' @> '"anonymous"'::jsonb)
        )
    ) THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
  END IF;

  -- Lock product rows and check stock before computing totals.
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    product_name TEXT,
    price DECIMAL(10,2),
    quantity INTEGER
  ) LOOP
    SELECT stock_quantity, price INTO v_current_stock, v_db_price
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
        v_item.product_name, v_current_stock, v_item.quantity;
    END IF;
  END LOOP;

  -- Server-computed amounts are authoritative. Legacy client amount params are
  -- intentionally ignored.
  v_state := COALESCE(NULLIF(TRIM(p_shipping_address->>'state'), ''), 'US');
  v_totals := public.compute_order_totals(p_items, p_promo_code, v_state);

  v_discount := (v_totals->>'discount_amount')::DECIMAL(10,2);
  v_tax := (v_totals->>'tax_amount')::DECIMAL(10,2);
  v_shipping := (v_totals->>'shipping_amount')::DECIMAL(10,2);
  v_total := (v_totals->>'total_amount')::DECIMAL(10,2);

  INSERT INTO public.orders (
    id,
    user_id,
    status,
    total_amount,
    tax_amount,
    shipping_amount,
    discount_amount,
    shipping_address,
    payment_method
  ) VALUES (
    p_order_id,
    p_user_id,
    'payment_pending',
    v_total,
    v_tax,
    v_shipping,
    v_discount,
    p_shipping_address,
    p_payment_method
  );

  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    product_name TEXT,
    price DECIMAL(10,2),
    quantity INTEGER
  ) LOOP
    SELECT price INTO v_db_price
    FROM public.products
    WHERE id = v_item.product_id;

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, price, quantity)
    VALUES (p_order_id, v_item.product_id, v_item.product_name, v_db_price, v_item.quantity);
  END LOOP;

  IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) <> '' THEN
    UPDATE public.promo_codes
    SET uses_count = uses_count + 1
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_promo_code));
  END IF;

  IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    DELETE FROM public.cart_items WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'id', p_order_id,
    'user_id', p_user_id,
    'status', 'payment_pending',
    'total_amount', v_total,
    'tax_amount', v_tax,
    'shipping_amount', v_shipping,
    'discount_amount', v_discount,
    'shipping_address', p_shipping_address,
    'payment_method', p_payment_method,
    'created_at', NOW()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_transaction(
  TEXT,
  UUID,
  JSONB,
  TEXT,
  JSONB,
  TEXT,
  DECIMAL,
  DECIMAL,
  DECIMAL,
  DECIMAL
) TO authenticated, anon;
-- Newsletter subscribers table
-- Stores email addresses for marketing/newsletter communications
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT DEFAULT 'homepage',
  is_active BOOLEAN NOT NULL DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- Index for fast lookups by email
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON public.newsletter_subscribers(email);

-- Index for active subscribers
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_active ON public.newsletter_subscribers(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins can manage newsletter subscribers"
  ON public.newsletter_subscribers FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Public can subscribe
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (is_active = true);
