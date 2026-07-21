-- Migration: Allow guest checkout orders (nullable user_id)
-- Date: 2026-07-16

-- 1. Redefine create_order_transaction to bypass the user exists check if p_user_id is NULL
CREATE OR REPLACE FUNCTION public.create_order_transaction(
  p_order_id TEXT,
  p_user_id UUID,
  p_total_amount DECIMAL(10,2),
  p_tax_amount DECIMAL(10,2),
  p_shipping_amount DECIMAL(10,2),
  p_discount_amount DECIMAL(10,2),
  p_shipping_address JSONB,
  p_payment_method TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_current_stock INTEGER;
BEGIN
  -- Verify user exists in public.users only if p_user_id is not null (for logged in checkouts)
  IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Insert order row
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
    'pending',
    p_total_amount,
    p_tax_amount,
    p_shipping_amount,
    p_discount_amount,
    p_shipping_address,
    p_payment_method
  );

  -- Loop through order items, lock product rows, check stock, decrement and insert order_item
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    product_name TEXT,
    price DECIMAL(10,2),
    quantity INTEGER
  ) LOOP
    -- Lock row FOR UPDATE to prevent race conditions from concurrent sessions
    SELECT stock_quantity INTO v_current_stock
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

    -- Decrement stock level
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id;

    -- Create order item
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
      v_item.price,
      v_item.quantity
    );
  END LOOP;

  -- Delete items from user's shopping cart if they are logged in
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.cart_items
    WHERE user_id = p_user_id;
  END IF;

  -- Construct and return created order object
  RETURN jsonb_build_object(
    'id', p_order_id,
    'user_id', p_user_id,
    'status', 'pending',
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

-- 2. Update SELECT RLS policies on orders to allow guest users to read their orders by exact order ID (since user_id is NULL)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
