-- Migration: Stripe & PayPal Integration Database Schema Updates & Region validation
-- Date: 2026-07-16

-- 1. Update orders status check constraint to include 'payment_pending'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('payment_pending', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Set default order status to 'payment_pending'
ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'payment_pending';


-- 2. Create pluggable region-specific tax calculator
CREATE OR REPLACE FUNCTION public.get_tax_rate_by_region(p_state TEXT)
RETURNS DECIMAL(6,4)
LANGUAGE plpgsql
AS $$
BEGIN
  CASE UPPER(TRIM(p_state))
    WHEN 'CA', 'CALIFORNIA' THEN RETURN 0.0825;
    WHEN 'NY', 'NEW YORK'   THEN RETURN 0.08875;
    WHEN 'TX', 'TEXAS'      THEN RETURN 0.0625;
    WHEN 'FL', 'FLORIDA'    THEN RETURN 0.0600;
    ELSE RETURN 0.0700; -- Default flat rate (7.0%)
  END CASE;
END;
$$;


-- 3. Create pluggable region-specific shipping calculator
CREATE OR REPLACE FUNCTION public.get_shipping_rate_by_region(p_state TEXT)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
BEGIN
  CASE UPPER(TRIM(p_state))
    WHEN 'HI', 'HAWAII', 'AK', 'ALASKA' THEN RETURN 15.00; -- Non-continental flat shipping
    ELSE RETURN 5.99; -- Standard flat rate
  END CASE;
END;
$$;


-- 4. Redefine create_order_transaction to validate pricing/discounts and region tax/shipping server-side
CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_id TEXT,
  p_user_id UUID,
  p_total_amount DECIMAL(10,2),
  p_tax_amount DECIMAL(10,2),
  p_shipping_amount DECIMAL(10,2),
  p_discount_amount DECIMAL(10,2),
  p_shipping_address JSONB,
  p_payment_method TEXT,
  p_items JSONB,
  p_promo_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
  v_current_price DECIMAL(10,2);
  v_calculated_subtotal DECIMAL(10,2) := 0;
  v_expected_discount DECIMAL(10,2) := 0;
  v_expected_tax DECIMAL(10,2) := 0;
  v_expected_shipping DECIMAL(10,2) := 0;
  v_expected_total DECIMAL(10,2) := 0;
  v_is_free_shipping BOOLEAN;
  v_state TEXT;
  v_tax_rate DECIMAL(6,4);
  v_base_shipping DECIMAL(10,2);
BEGIN
  -- Verify user exists in public.users only if p_user_id is not null
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 1. Loop through items to calculate subtotal and lock product stock rows
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    product_name TEXT,
    price DECIMAL(10,2),
    quantity INTEGER
  ) LOOP
    -- Lock row FOR UPDATE to prevent race conditions
    SELECT stock_quantity, price INTO v_current_stock, v_current_price
    FROM public.products
    WHERE id = v_item.product_id
    FOR UPDATE;

    IF v_current_stock IS NULL THEN
      RAISE EXCEPTION 'Product with ID % not found', v_item.product_id;
    END IF;

    IF v_current_stock < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for product % (Available: %, Requested: %)', 
        v_item.product_name, v_current_stock, v_item.quantity;
    END IF;

    v_calculated_subtotal := v_calculated_subtotal + (v_current_price * v_item.quantity);

    -- Decrement stock level
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 2. Validate Promo Code and Discount
  IF p_promo_code IS NOT NULL AND p_promo_code <> '' THEN
    IF UPPER(TRIM(p_promo_code)) = 'GLASSSKIN20' THEN
      v_expected_discount := ROUND(v_calculated_subtotal * 0.20, 2);
    ELSIF UPPER(TRIM(p_promo_code)) = 'GLOW10' THEN
      v_expected_discount := ROUND(v_calculated_subtotal * 0.10, 2);
    ELSE
      RAISE EXCEPTION 'Invalid promo code: %', p_promo_code;
    END IF;
  END IF;

  IF ABS(p_discount_amount - v_expected_discount) > 0.05 THEN
    RAISE EXCEPTION 'Discount verification failed. Expected: %, Provided: %', v_expected_discount, p_discount_amount;
  END IF;

  -- 3. Extract region/state details to compute dynamic region-based tax and shipping
  v_state := p_shipping_address->>'state';
  IF v_state IS NULL OR v_state = '' THEN
    v_state := 'US'; -- Fallback
  END IF;

  v_tax_rate := public.get_tax_rate_by_region(v_state);
  v_base_shipping := public.get_shipping_rate_by_region(v_state);

  -- 4. Validate Shipping, Tax, and Grand Total
  v_is_free_shipping := (v_calculated_subtotal - v_expected_discount) >= 50.00;
  IF v_is_free_shipping THEN
    v_expected_shipping := 0.00;
  ELSE
    v_expected_shipping := v_base_shipping;
  END IF;

  v_expected_tax := ROUND((v_calculated_subtotal - v_expected_discount) * v_tax_rate, 2);
  v_expected_total := v_calculated_subtotal - v_expected_discount + v_expected_tax + v_expected_shipping;

  -- Verify tax correctness
  IF ABS(p_tax_amount - v_expected_tax) > 0.05 THEN
    RAISE EXCEPTION 'Tax calculation mismatch for state %. Expected: %, Client: %', v_state, v_expected_tax, p_tax_amount;
  END IF;

  -- Verify shipping correctness
  IF ABS(p_shipping_amount - v_expected_shipping) > 0.05 THEN
    RAISE EXCEPTION 'Shipping calculation mismatch for state %. Expected: %, Client: %', v_state, v_expected_shipping, p_shipping_amount;
  END IF;

  -- Verify grand total correctness
  IF ABS(p_total_amount - v_expected_total) > 0.05 THEN
    RAISE EXCEPTION 'Grand total verification failed. Expected: %, Provided: %', v_expected_total, p_total_amount;
  END IF;

  -- Insert order row with 'payment_pending' status
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
    p_total_amount,
    p_tax_amount,
    p_shipping_amount,
    p_discount_amount,
    p_shipping_address,
    p_payment_method
  );

  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    product_name TEXT,
    price DECIMAL(10,2),
    quantity INTEGER
  ) LOOP
    SELECT price INTO v_current_price FROM public.products WHERE id = v_item.product_id;
    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      price,
      quantity
    ) VALUES (
      p_order_id,
      v_item.product_id,
      v_item.product_name,
      v_current_price,
      v_item.quantity
    );
  END LOOP;

  -- Construct and return created order object
  RETURN jsonb_build_object(
    'id', p_order_id,
    'user_id', p_user_id,
    'status', 'payment_pending',
    'total_amount', p_total_amount,
    'tax_amount', p_tax_amount,
    'shipping_amount', p_shipping_amount,
    'discount_amount', p_discount_amount,
    'shipping_address', p_shipping_address,
    'payment_method', p_payment_method,
    'created_at', NOW()
  );
END;
$$;


-- 5. Create confirm_order_payment RPC to transition order to 'processing' and clear user's cart
CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Retrieve user_id associated with the order
  SELECT user_id INTO v_user_id
  FROM public.orders
  WHERE id = p_order_id;

  -- Transition status from 'payment_pending' to 'processing'
  UPDATE public.orders
  SET status = 'processing', updated_at = NOW()
  WHERE id = p_order_id AND status = 'payment_pending';

  -- Purge the shopping cart for this user (if logged in)
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.cart_items
    WHERE user_id = v_user_id;
  END IF;
END;
$$;


-- 6. Create fail_order_payment RPC to revert stock level and cancel the order
CREATE OR REPLACE FUNCTION public.fail_order_payment(p_order_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Revert stock levels if the order is currently payment_pending
  IF EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id AND status = 'payment_pending') THEN
    -- Increment product stock level back
    UPDATE public.products p
    SET stock_quantity = p.stock_quantity + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = p_order_id AND p.id = oi.product_id;

    -- Update order status to 'cancelled'
    UPDATE public.orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_order_id;
  END IF;
END;
$$;
