-- =============================================================================
-- Migration: Server-Side Pricing Engine & Promo Code Tables
-- Date: 2026-07-16
-- Purpose: Eliminate order-total-forgery vulnerability by computing ALL pricing
--          amounts (discount, tax, shipping, total) server-side only.
--          Client-supplied discount_amount / tax_amount / shipping_amount are
--          IGNORED — only the server-computed values are persisted.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. promo_codes table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   DECIMAL(10,2) NOT NULL CHECK (discount_value > 0),
  min_subtotal     DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_uses         INTEGER,                    -- NULL = unlimited
  uses_count       INTEGER NOT NULL DEFAULT 0,
  valid_from       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMP WITH TIME ZONE,   -- NULL = no expiry
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: table is NOT directly selectable by clients; access only via SECURITY DEFINER RPCs
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- No direct SELECT policy — clients must call validate_promo_code() RPC
-- Service-role key (used by Edge Functions) bypasses RLS by default.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Seed promo codes (replacing every hardcoded client reference)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.promo_codes (code, discount_type, discount_value, min_subtotal, max_uses, active)
VALUES
  ('GLASSSKIN20', 'percent', 20.00, 0.00, NULL, true),
  ('GLOW10',      'percent', 10.00, 0.00, NULL, true)
ON CONFLICT (code) DO UPDATE SET
  discount_type  = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_subtotal   = EXCLUDED.min_subtotal,
  max_uses       = EXCLUDED.max_uses,
  active         = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. tax_rates table (keyed by state abbreviation)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code TEXT UNIQUE NOT NULL,   -- 2-letter US state code, uppercase
  rate       DECIMAL(6,4) NOT NULL,  -- e.g. 0.0825 = 8.25%
  label      TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;
-- Clients may NOT read raw tax_rates; amounts are returned by RPCs only.

INSERT INTO public.tax_rates (state_code, rate, label) VALUES
  ('AL', 0.0400, 'Alabama'),
  ('AK', 0.0000, 'Alaska'),
  ('AZ', 0.0560, 'Arizona'),
  ('AR', 0.0650, 'Arkansas'),
  ('CA', 0.0825, 'California'),
  ('CO', 0.0290, 'Colorado'),
  ('CT', 0.0635, 'Connecticut'),
  ('DE', 0.0000, 'Delaware'),
  ('FL', 0.0600, 'Florida'),
  ('GA', 0.0400, 'Georgia'),
  ('HI', 0.0400, 'Hawaii'),
  ('ID', 0.0600, 'Idaho'),
  ('IL', 0.0625, 'Illinois'),
  ('IN', 0.0700, 'Indiana'),
  ('IA', 0.0600, 'Iowa'),
  ('KS', 0.0650, 'Kansas'),
  ('KY', 0.0600, 'Kentucky'),
  ('LA', 0.0445, 'Louisiana'),
  ('ME', 0.0550, 'Maine'),
  ('MD', 0.0600, 'Maryland'),
  ('MA', 0.0625, 'Massachusetts'),
  ('MI', 0.0600, 'Michigan'),
  ('MN', 0.0688, 'Minnesota'),
  ('MS', 0.0700, 'Mississippi'),
  ('MO', 0.0423, 'Missouri'),
  ('MT', 0.0000, 'Montana'),
  ('NE', 0.0550, 'Nebraska'),
  ('NV', 0.0685, 'Nevada'),
  ('NH', 0.0000, 'New Hampshire'),
  ('NJ', 0.0663, 'New Jersey'),
  ('NM', 0.0513, 'New Mexico'),
  ('NY', 0.0888, 'New York'),
  ('NC', 0.0475, 'North Carolina'),
  ('ND', 0.0500, 'North Dakota'),
  ('OH', 0.0575, 'Ohio'),
  ('OK', 0.0450, 'Oklahoma'),
  ('OR', 0.0000, 'Oregon'),
  ('PA', 0.0600, 'Pennsylvania'),
  ('RI', 0.0700, 'Rhode Island'),
  ('SC', 0.0600, 'South Carolina'),
  ('SD', 0.0450, 'South Dakota'),
  ('TN', 0.0700, 'Tennessee'),
  ('TX', 0.0625, 'Texas'),
  ('UT', 0.0485, 'Utah'),
  ('VT', 0.0600, 'Vermont'),
  ('VA', 0.0530, 'Virginia'),
  ('WA', 0.0650, 'Washington'),
  ('WV', 0.0600, 'West Virginia'),
  ('WI', 0.0500, 'Wisconsin'),
  ('WY', 0.0400, 'Wyoming'),
  ('DC', 0.0600, 'District of Columbia')
ON CONFLICT (state_code) DO UPDATE SET rate = EXCLUDED.rate, label = EXCLUDED.label;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. shipping_rates table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_code      TEXT UNIQUE NOT NULL,
  base_rate       DECIMAL(10,2) NOT NULL,
  free_threshold  DECIMAL(10,2) NOT NULL DEFAULT 50.00,
  label           TEXT,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
-- No direct client SELECT; amounts are returned by RPCs only.

INSERT INTO public.shipping_rates (state_code, base_rate, free_threshold, label) VALUES
  ('HI', 15.00, 100.00, 'Hawaii — remote surcharge'),
  ('AK', 15.00, 100.00, 'Alaska — remote surcharge')
ON CONFLICT (state_code) DO UPDATE SET base_rate = EXCLUDED.base_rate, free_threshold = EXCLUDED.free_threshold;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. validate_promo_code(code, subtotal) — SECURITY DEFINER RPC
--    Returns the discount amount to apply (or raises if invalid).
--    Clients call this RPC; they never query the promo_codes table directly.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code     TEXT,
  p_subtotal DECIMAL(10,2)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo public.promo_codes%ROWTYPE;
  v_discount DECIMAL(10,2) := 0;
BEGIN
  -- Look up the code (case-insensitive)
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_code))
    AND active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code not found or inactive');
  END IF;

  -- Check validity window
  IF v_promo.valid_from > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code is not yet active');
  END IF;
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code has expired');
  END IF;

  -- Check min subtotal
  IF p_subtotal < v_promo.min_subtotal THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', format('Minimum order of $%s required for this code', v_promo.min_subtotal)
    );
  END IF;

  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.uses_count >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code usage limit reached');
  END IF;

  -- Compute discount
  IF v_promo.discount_type = 'percent' THEN
    v_discount := ROUND(p_subtotal * (v_promo.discount_value / 100.0), 2);
  ELSIF v_promo.discount_type = 'fixed' THEN
    v_discount := LEAST(v_promo.discount_value, p_subtotal);
  END IF;

  RETURN jsonb_build_object(
    'valid',          true,
    'discount_type',  v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', v_discount,
    'code',           v_promo.code
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. compute_order_totals — server-side pricing engine
--    Returns: subtotal, discount, shipping, tax, total (all server-computed).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_order_totals(
  p_items         JSONB,         -- [{product_id, quantity}]
  p_promo_code    TEXT DEFAULT NULL,
  p_state         TEXT DEFAULT 'US'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item           RECORD;
  v_db_price       DECIMAL(10,2);
  v_subtotal       DECIMAL(10,2) := 0;
  v_discount       DECIMAL(10,2) := 0;
  v_tax_rate       DECIMAL(6,4)  := 0;
  v_base_shipping  DECIMAL(10,2) := 5.99;
  v_free_threshold DECIMAL(10,2) := 50.00;
  v_shipping       DECIMAL(10,2);
  v_tax            DECIMAL(10,2);
  v_total          DECIMAL(10,2);
  v_promo_result   JSONB;
  v_state_upper    TEXT;
BEGIN
  -- 1. Compute subtotal from live catalog prices (no client prices trusted)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER) LOOP
    SELECT price INTO v_db_price FROM public.products WHERE id = v_item.product_id;
    IF v_db_price IS NULL THEN
      RAISE EXCEPTION 'Product % not found in catalog', v_item.product_id;
    END IF;
    v_subtotal := v_subtotal + (v_db_price * v_item.quantity);
  END LOOP;

  -- 2. Validate and compute discount server-side
  IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) <> '' THEN
    v_promo_result := public.validate_promo_code(p_promo_code, v_subtotal);
    IF NOT (v_promo_result->>'valid')::boolean THEN
      RAISE EXCEPTION 'Invalid promo code: %', v_promo_result->>'error';
    END IF;
    v_discount := (v_promo_result->>'discount_amount')::DECIMAL(10,2);
  END IF;

  -- 3. Look up tax rate from tax_rates table
  v_state_upper := UPPER(TRIM(COALESCE(p_state, 'US')));
  SELECT rate INTO v_tax_rate FROM public.tax_rates WHERE state_code = v_state_upper;
  IF v_tax_rate IS NULL THEN
    v_tax_rate := 0.0700; -- Default 7% if unknown state
  END IF;

  -- 4. Look up shipping rate from shipping_rates table (fall back to defaults)
  SELECT base_rate, free_threshold INTO v_base_shipping, v_free_threshold
  FROM public.shipping_rates WHERE state_code = v_state_upper;
  IF v_base_shipping IS NULL THEN
    v_base_shipping  := 5.99;
    v_free_threshold := 50.00;
  END IF;

  -- 5. Compute tax, shipping, total
  v_tax      := ROUND((v_subtotal - v_discount) * v_tax_rate, 2);
  v_shipping := CASE WHEN (v_subtotal - v_discount) >= v_free_threshold THEN 0.00 ELSE v_base_shipping END;
  v_total    := ROUND(v_subtotal - v_discount + v_tax + v_shipping, 2);

  RETURN jsonb_build_object(
    'subtotal',         v_subtotal,
    'discount_amount',  v_discount,
    'tax_amount',       v_tax,
    'shipping_amount',  v_shipping,
    'total_amount',     v_total,
    'tax_rate',         v_tax_rate,
    'state',            v_state_upper
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Redefine create_order_transaction — client-supplied amounts IGNORED
--    The function calls compute_order_totals internally, persists its output,
--    and also increments the promo code uses_count atomically.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_id        TEXT,
  p_user_id         UUID,
  p_shipping_address JSONB,
  p_payment_method  TEXT,
  p_items           JSONB,
  p_promo_code      TEXT DEFAULT NULL,
  -- Legacy params accepted but IGNORED (kept for backward compat so old clients
  -- don't crash; values are never used — server recomputes everything).
  p_total_amount    DECIMAL(10,2) DEFAULT NULL,
  p_tax_amount      DECIMAL(10,2) DEFAULT NULL,
  p_shipping_amount DECIMAL(10,2) DEFAULT NULL,
  p_discount_amount DECIMAL(10,2) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item            RECORD;
  v_current_stock   INTEGER;
  v_db_price        DECIMAL(10,2);
  v_totals          JSONB;
  v_subtotal        DECIMAL(10,2);
  v_discount        DECIMAL(10,2);
  v_tax             DECIMAL(10,2);
  v_shipping        DECIMAL(10,2);
  v_total           DECIMAL(10,2);
  v_state           TEXT;
BEGIN
  -- 1. Verify user profile exists (for authenticated orders)
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 2. Lock product rows and check stock BEFORE computing totals to prevent TOCTOU races
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID, product_name TEXT, price DECIMAL(10,2), quantity INTEGER
  ) LOOP
    SELECT stock_quantity, price INTO v_current_stock, v_db_price
    FROM public.products WHERE id = v_item.product_id FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product % not found', v_item.product_id;
    END IF;
    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % (available: %, requested: %)',
        v_item.product_name, v_current_stock, v_item.quantity;
    END IF;
  END LOOP;

  -- 3. Compute all amounts server-side — client values are completely ignored
  v_state   := COALESCE(NULLIF(TRIM(p_shipping_address->>'state'), ''), 'US');
  v_totals  := public.compute_order_totals(p_items, p_promo_code, v_state);

  v_subtotal := (v_totals->>'subtotal')::DECIMAL(10,2);
  v_discount := (v_totals->>'discount_amount')::DECIMAL(10,2);
  v_tax      := (v_totals->>'tax_amount')::DECIMAL(10,2);
  v_shipping := (v_totals->>'shipping_amount')::DECIMAL(10,2);
  v_total    := (v_totals->>'total_amount')::DECIMAL(10,2);

  -- 4. Insert order with SERVER-COMPUTED amounts (never client amounts)
  INSERT INTO public.orders (
    id, user_id, status, total_amount, tax_amount, shipping_amount,
    discount_amount, shipping_address, payment_method
  ) VALUES (
    p_order_id, p_user_id, 'payment_pending',
    v_total, v_tax, v_shipping, v_discount,
    p_shipping_address, p_payment_method
  );

  -- 5. Decrement stock and insert order_items (using DB catalog price, not client price)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID, product_name TEXT, price DECIMAL(10,2), quantity INTEGER
  ) LOOP
    SELECT price INTO v_db_price FROM public.products WHERE id = v_item.product_id;

    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;

    INSERT INTO public.order_items (order_id, product_id, product_name, price, quantity)
    VALUES (p_order_id, v_item.product_id, v_item.product_name, v_db_price, v_item.quantity);
  END LOOP;

  -- 6. Increment promo code uses_count atomically
  IF p_promo_code IS NOT NULL AND TRIM(p_promo_code) <> '' THEN
    UPDATE public.promo_codes
    SET uses_count = uses_count + 1
    WHERE UPPER(TRIM(code)) = UPPER(TRIM(p_promo_code));
  END IF;

  -- 7. Clear user's server-side cart
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.cart_items WHERE user_id = p_user_id;
  END IF;

  -- 8. Return the server-computed order (client gets back what the server decided)
  RETURN jsonb_build_object(
    'id',               p_order_id,
    'user_id',          p_user_id,
    'status',           'payment_pending',
    'total_amount',     v_total,
    'tax_amount',       v_tax,
    'shipping_amount',  v_shipping,
    'discount_amount',  v_discount,
    'shipping_address', p_shipping_address,
    'payment_method',   p_payment_method,
    'created_at',       NOW()
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Grant execute on new RPCs to authenticated + anon roles
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, DECIMAL) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.compute_order_totals(JSONB, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_order_transaction(TEXT, UUID, JSONB, TEXT, JSONB, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated, anon;
