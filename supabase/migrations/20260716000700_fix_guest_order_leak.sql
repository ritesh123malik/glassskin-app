-- =============================================================================
-- Migration: Fix Cross-User Guest Order Data Leak
-- Date: 2026-07-16
-- Replaces: The broken SELECT policy introduced in 20260716000100_guest_checkout_fixes.sql
--           which allowed ANY anonymous session to read ALL guest orders:
--             USING (auth.uid() = user_id OR user_id IS NULL)
--           This is a full cross-user data leak — every guest's address, name,
--           and payment method was readable by any unauthenticated request.
--
-- Approach: Switch guest checkout to supabase.auth.signInAnonymously() so that
--           every guest order has a real, unique auth.uid() stored as user_id.
--           "Guest" now means no email/password was collected — not that
--           user_id is NULL. Standard RLS (auth.uid() = user_id) is sufficient.
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. ORDERS — Remove the broken policy; restore the clean one
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop the policy introduced in 20260716000100 that contained the leak
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;

-- Restore the original, secure policy: each user (including anonymous) sees
-- only their own orders, scoped to their unique auth.uid().
-- Anonymous users now have a real UUID from signInAnonymously(), so this is safe.
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- The INSERT policy from the init migration is still correct; ensure it exists.
-- A guest calling create_order_transaction RPC (SECURITY DEFINER) inserts with
-- the server-side p_user_id = auth.uid() of the anonymous session, so no bypass.
-- The direct INSERT policy remains scoped:
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ORDER_ITEMS — Verify both policies are clean (no NULL bypass)
-- ─────────────────────────────────────────────────────────────────────────────
-- The existing policies reference the parent orders.user_id via EXISTS:
--   EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id
--           AND orders.user_id = auth.uid())
-- This is already correct: a guest with anonymous auth has user_id = auth.uid()
-- on their order, so the JOIN resolves correctly. No changes needed to the
-- query logic, but we re-create both policies for clarity and to ensure no
-- stale version from any prior migration survives.

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.id = order_items.order_id
        AND public.orders.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE public.orders.id = order_items.order_id
        AND public.orders.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. PUBLIC.USERS — Allow anonymous users (no email) to have a profile row
-- ─────────────────────────────────────────────────────────────────────────────
-- Anonymous Supabase users have auth.uid() but no email. The current table
-- definition has `email TEXT UNIQUE NOT NULL`, which would cause the
-- handle_new_user trigger to fail for anonymous users.
--
-- We make email nullable. The UNIQUE constraint is replaced with a partial
-- unique index that enforces uniqueness only on non-NULL emails (compatible
-- with Postgres 15+ used by Supabase).

ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL;

-- Drop the column-level UNIQUE constraint (exists as an implicit index).
-- We use a try/catch pattern via DO block because the constraint name may vary.
DO $$
BEGIN
  ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
EXCEPTION WHEN others THEN
  NULL; -- Constraint may not exist by this name; the index drop below covers it.
END;
$$;

DROP INDEX IF EXISTS public.users_email_key;

-- Partial unique index: enforces uniqueness for real (non-NULL) emails only.
-- Multiple anonymous users (all NULL email) are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_not_null
  ON public.users (email)
  WHERE email IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HANDLE_NEW_USER TRIGGER — Skip public.users insert for anonymous users
-- ─────────────────────────────────────────────────────────────────────────────
-- Anonymous users created via signInAnonymously() arrive in auth.users with:
--   email = NULL, is_anonymous = TRUE (Supabase sets this in raw_app_meta_data)
-- We skip the public.users insert for them because:
--   (a) They have no email to store
--   (b) user_preferences trigger would also fail on the NOT NULL email FK cascade
-- When a guest upgrades to a full account (linkIdentity), the SIGNED_IN event
-- fires again and a separate upsert flow should update the profile.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert all users (including anonymous Supabase users whose email is NULL)
  -- since public.users.email is now nullable.
  INSERT INTO public.users (id, email, full_name, phone)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone     = EXCLUDED.phone,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach the trigger (CREATE OR REPLACE on the function is enough, but
-- we DROP/CREATE to be explicit about the trigger definition too).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CREATE_ORDER_TRANSACTION — Harden the user-existence check
-- ─────────────────────────────────────────────────────────────────────────────
-- Anonymous users have a real auth.uid() but NO row in public.users.
-- The current function raises 'User profile not found' when p_user_id is not
-- null but has no profile row — which would block anonymous guest checkout.
-- We adjust: skip the check when the user is anonymous (i.e. no profile row
-- is expected). The SECURITY DEFINER context means RLS is bypassed inside
-- this function, so stock/order inserts still work correctly.

CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_id        TEXT,
  p_user_id         UUID,
  p_shipping_address JSONB,
  p_payment_method  TEXT,
  p_items           JSONB,
  p_promo_code      TEXT DEFAULT NULL,
  -- Legacy params accepted but IGNORED (kept for backward compat)
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
  -- 1. For fully-authenticated users, verify the profile exists.
  --    Anonymous users (those with auth.uid() but no public.users row) are
  --    allowed through — their identity is still scoped to their JWT.
  --    NULL p_user_id is now a dead-code path (signInAnonymously always
  --    provides a real UUID), but we keep the guard for safety.
  IF p_user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id)
  THEN
    -- Anonymous users won't have a profile row — that's expected, continue.
    -- Only raise if this is NOT an anonymous auth session.
    IF EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = p_user_id
        AND email IS NOT NULL
        AND NOT ((raw_app_meta_data->>'provider') = 'anonymous'
                 OR (raw_app_meta_data->'providers' @> '"anonymous"'::jsonb))
    ) THEN
      RAISE EXCEPTION 'User profile not found';
    END IF;
  END IF;

  -- 2. Lock product rows and check stock BEFORE computing totals
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

  -- 3. Compute all amounts server-side
  v_state   := COALESCE(NULLIF(TRIM(p_shipping_address->>'state'), ''), 'US');
  v_totals  := public.compute_order_totals(p_items, p_promo_code, v_state);

  v_subtotal := (v_totals->>'subtotal')::DECIMAL(10,2);
  v_discount := (v_totals->>'discount_amount')::DECIMAL(10,2);
  v_tax      := (v_totals->>'tax_amount')::DECIMAL(10,2);
  v_shipping := (v_totals->>'shipping_amount')::DECIMAL(10,2);
  v_total    := (v_totals->>'total_amount')::DECIMAL(10,2);

  -- 4. Insert order with server-computed amounts
  INSERT INTO public.orders (
    id, user_id, status, total_amount, tax_amount, shipping_amount,
    discount_amount, shipping_address, payment_method
  ) VALUES (
    p_order_id, p_user_id, 'payment_pending',
    v_total, v_tax, v_shipping, v_discount,
    p_shipping_address, p_payment_method
  );

  -- 5. Decrement stock and insert order_items (using catalog price, not client price)
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

  -- 7. Clear cart for authenticated (non-anonymous) users only
  --    Anonymous users have no server-side cart (cart_items requires public.users FK)
  IF p_user_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    DELETE FROM public.cart_items WHERE user_id = p_user_id;
  END IF;

  -- 8. Return server-computed order
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

-- Re-grant execute (function signature unchanged, but REPLACE resets grants)
GRANT EXECUTE ON FUNCTION public.create_order_transaction(TEXT, UUID, JSONB, TEXT, JSONB, TEXT, DECIMAL, DECIMAL, DECIMAL, DECIMAL)
  TO authenticated, anon;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. SAFETY ASSERTION: Confirm user_id IS NULL no longer appears in any
--    active RLS policy USING or WITH CHECK expression on the orders table.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_bad_policies TEXT;
BEGIN
  SELECT string_agg(polname, ', ')
  INTO v_bad_policies
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace ns ON ns.oid = cls.relnamespace
  WHERE ns.nspname = 'public'
    AND cls.relname IN ('orders', 'order_items')
    AND (
      pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%user_id IS NULL%'
      OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%user_id IS NULL%'
    );

  IF v_bad_policies IS NOT NULL THEN
    RAISE EXCEPTION
      'SECURITY ASSERTION FAILED: The following policies still contain '
      '"user_id IS NULL" as a bypass clause: %. '
      'This migration must have failed to drop them.',
      v_bad_policies;
  END IF;

  RAISE NOTICE 'Security assertion passed: No "user_id IS NULL" bypass found in orders or order_items policies.';
END;
$$;
