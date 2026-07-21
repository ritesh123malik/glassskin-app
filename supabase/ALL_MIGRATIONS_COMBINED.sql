-- =============================================================================
-- ARCHIVED REFERENCE — DO NOT APPLY THIS FILE DIRECTLY
-- =============================================================================
--
-- This file is a concatenated snapshot of all migrations for reference only.
-- The canonical, source-of-truth migrations are the individual files in the
-- migrations/ directory, named with Supabase's standard convention:
--   YYYYMMDDHHMMSS_description.sql
--
-- Applying this file as a single migration will fail because it contains
-- duplicate CREATE TABLE / CREATE FUNCTION / CREATE TRIGGER statements that
-- already exist in earlier individual migrations.
--
-- To rebuild the database schema, apply the individual migration files in
-- lexical order (oldest first). Supabase applies them automatically in this
-- order based on their timestamp prefix.
--
-- Last updated: 2026-07-21
-- =============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- Add extensions schema to search path so gen_random_uuid() is found
SELECT set_config('search_path', 'public,extensions', false);

-- ==========================================
-- 1. TABLES DEFINITIONS
-- ==========================================

-- Public Users profile table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  "role" TEXT NOT NULL DEFAULT 'customer' CHECK ("role" IN ('customer', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  category TEXT,
  tags TEXT[],
  images TEXT[],
  stock_quantity INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  skin_types TEXT[],
  certifications TEXT[],
  ingredients TEXT,
  usage TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cart items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wishlist table
CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY, -- Custom tracking IDs like GS-123456
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  total_amount DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  shipping_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  shipping_address JSONB NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  images TEXT[],
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  provider TEXT NOT NULL,
  last_four TEXT NOT NULL,
  expiry_month INTEGER,
  expiry_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ==========================================
-- 2. INDEXES FOR PERFORMANCE
-- ==========================================

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

-- Order items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Cart
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);

-- Wishlist
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);

-- Payment methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);


-- ==========================================
-- 3. UPDATED_AT TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users; CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products; CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders; CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses; CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON public.payment_methods; CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ==========================================
-- 4. PROFILE SYNCRONIZATION TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, "role")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone,
    'customer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==========================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- users policies
-- Justification: A user can only view and update their own profile details to protect personal identity data.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- products policies
-- Justification: Product catalogs must be publicly readable by guest and authenticated users alike. Only admins (direct DB/API write access) can edit products.
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);

-- cart_items policies
-- Justification: Cart items represent a private shopping session; users must not be able to view, add, edit, or delete another user's cart.
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL USING (auth.uid() = user_id);

-- wishlists policies
-- Justification: Wishlist items are private; users must not be able to view, add, or delete another user's wishlist.
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlists;
CREATE POLICY "Users can manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- orders policies
-- Justification: Orders contain financial and address details; users can view and insert only their own orders. Modification is blocked.
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- order_items policies
-- Justification: Order items belong to parent orders; users can view order items only if they own the parent order.
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders WHERE public.orders.id = order_items.order_id AND public.orders.user_id = auth.uid()
  )
);
DROP POLICY IF EXISTS "Users can insert own order items" ON public.order_items;
CREATE POLICY "Users can insert own order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders WHERE public.orders.id = order_items.order_id AND public.orders.user_id = auth.uid()
  )
);

-- reviews policies
-- Justification: Reviews are public consumer content, readable by all. Creating reviews is limited to authenticated users posting under their own name.
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- addresses policies
-- Justification: Address listings contain private residence info; users can only perform read/write actions on their own addresses.
DROP POLICY IF EXISTS "Users can manage own addresses" ON public.addresses;
CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- payment_methods policies
-- Justification: Saved credit card tokens or billing setups are highly sensitive; users can only perform read/write actions on their own payment settings.
DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.payment_methods;
CREATE POLICY "Users can manage own payment methods" ON public.payment_methods FOR ALL USING (auth.uid() = user_id);


-- ==========================================
-- 6. ATOMIC CHECKOUT TRANSACTION (RPC)
-- ==========================================

-- Justification: Transactional order submission must run server-side to guarantee atomicity of stock decrements,
-- order record inserts, and cart purges. This prevents races and partial failures.
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
  -- 1. Verify user exists in public.users (triggers might have a small race, but generally should be ready)
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- 2. Insert order row
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

  -- 3. Loop through order items, lock product rows, check stock, decrement and insert order_item
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

  -- 4. Delete items from user's shopping cart
  DELETE FROM public.cart_items
  WHERE user_id = p_user_id;

  -- 5. Construct and return created order object
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
    'created_at', now()
  );
END;
$$;
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
-- Migration: Push Notification Registration and Preferences
-- Date: 2026-07-16

-- 1. Create push_tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on push_tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Admins can read push tokens" ON public.push_tokens;
CREATE POLICY "Admins can read push tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage push tokens" ON public.push_tokens;
CREATE POLICY "Admins can manage push tokens"
  ON public.push_tokens FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update push tokens" ON public.push_tokens;
CREATE POLICY "Admins can update push tokens"
  ON public.push_tokens FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete push tokens" ON public.push_tokens;
CREATE POLICY "Admins can delete push tokens"
  ON public.push_tokens FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Users can manage their own tokens
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own tokens"
  ON public.push_tokens FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 2. Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  order_notifications BOOLEAN DEFAULT true,
  promo_notifications BOOLEAN DEFAULT false,
  cart_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Admin policies
DROP POLICY IF EXISTS "Admins can read user preferences" ON public.user_preferences;
CREATE POLICY "Admins can read user preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage user preferences" ON public.user_preferences;
CREATE POLICY "Admins can manage user preferences"
  ON public.user_preferences FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update user preferences" ON public.user_preferences;
CREATE POLICY "Admins can update user preferences"
  ON public.user_preferences FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete user preferences" ON public.user_preferences;
CREATE POLICY "Admins can delete user preferences"
  ON public.user_preferences FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Users can manage their own preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- 3. Create database trigger to auto-initialize default preferences for new users
CREATE OR REPLACE FUNCTION public.handle_user_preferences_init()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, order_notifications, promo_notifications, cart_reminders)
  VALUES (NEW.id, true, false, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_public_user_created ON public.users;
CREATE TRIGGER on_public_user_created
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_preferences_init();


-- 4. Backfill preferences for existing users in the public.users table
INSERT INTO public.user_preferences (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;
-- Migration: Push Notification Supporting Schema
-- Date: 2026-07-16
-- Adds: cart_reminder_log, abandoned cart RPC, pg_cron job, DB webhook trigger

-- 1. Create cart_reminder_log table
--    Tracks the last time each user received an abandoned-cart reminder.
--    Used to enforce the per-user cooldown window (default: 24 hours).
CREATE TABLE IF NOT EXISTS public.cart_reminder_log (
  user_id  UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  last_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cart_reminder_log ENABLE ROW LEVEL SECURITY;

-- Service-role only (cron function uses service role)
DROP POLICY IF EXISTS "Service role manages reminder log" ON public.cart_reminder_log;
DROP POLICY IF EXISTS "Service role manages reminder log" ON public.cart_reminder_log;
CREATE POLICY "Service role manages reminder log" ON public.cart_reminder_log
  USING (false)           -- no SELECT for regular users
  WITH CHECK (false);     -- no INSERT/UPDATE for regular users


-- 2. RPC: get_abandoned_cart_users
--    Returns user_ids who:
--      (a) have at least one cart_item older than p_abandonment_cutoff
--      (b) have NOT received a reminder since p_cooldown_cutoff
CREATE OR REPLACE FUNCTION public.get_abandoned_cart_users(
  p_abandonment_cutoff TIMESTAMP WITH TIME ZONE,
  p_cooldown_cutoff    TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(user_id UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT DISTINCT ci.user_id
  FROM public.cart_items ci
  WHERE
    ci.user_id IS NOT NULL
    AND ci.created_at <= p_abandonment_cutoff
    -- Exclude users who already got a reminder within the cooldown window
    AND ci.user_id NOT IN (
      SELECT crl.user_id
      FROM public.cart_reminder_log crl
      WHERE crl.last_sent_at >= p_cooldown_cutoff
    );
$$;


-- 3. Enable pg_cron extension (requires Supabase Pro or pg_cron extension enabled)
--    Run this manually in SQL editor if you're on a plan that supports it.
--    Uncomment and execute separately if pg_cron is available:
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
--
-- SELECT cron.schedule(
--   'abandoned-cart-reminder',   -- job name
--   '0 */2 * * *',              -- every 2 hours
--   $$
--     SELECT net.http_post(
--       url      := current_setting('app.edge_function_url') || '/abandoned-cart-reminder',
--       headers  := jsonb_build_object(
--                     'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--                     'Content-Type',  'application/json'
--                   ),
--       body     := '{}'::jsonb
--     );
--   $$
-- );
--
-- NOTE: Alternatively schedule via the Supabase Dashboard under
--       Database -> Scheduled Functions (no code deployment needed).


-- 4. Database Webhook for order status changes
--    This is configured via Supabase Dashboard -> Database -> Webhooks.
--    The webhook should POST to:
--      <SUPABASE_URL>/functions/v1/send-order-notification
--    With header: Authorization: Bearer <SUPABASE_ANON_KEY>
--    Trigger on: UPDATE on public.orders, all columns
--
-- For pure SQL trigger alternative (if HTTP extension is available):
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only fire when status column actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_url := current_setting('app.supabase_url', true) || '/functions/v1/send-order-notification';
  v_service_role_key := current_setting('app.service_role_key', true);

  -- Fire-and-forget async HTTP call to Edge Function
  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_service_role_key
               ),
    body    := jsonb_build_object(
                 'record',     row_to_json(NEW),
                 'old_record', row_to_json(OLD)
               )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders; CREATE TRIGGER on_order_status_change
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();
-- Migration: Full Review System — Photo Storage, Voting, Moderation, Purchase Gating
-- Date: 2026-07-16

-- ─── 1. Extend reviews table ──────────────────────────────────────────────────

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'
    CHECK (status IN ('pending', 'published', 'flagged')),
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reported_by UUID[] NOT NULL DEFAULT '{}';

-- Filter: only published reviews shown publicly
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
DROP POLICY IF EXISTS "Published reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Published reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (status = 'published');

-- Owners can update their own reviews (e.g. to add images post-upload)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Owners can delete their own reviews
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);


-- ─── 2. review_votes table ────────────────────────────────────────────────────
-- UNIQUE (user_id, review_id) prevents double-voting.
-- direction = 'helpful' | 'not_helpful'

CREATE TABLE IF NOT EXISTS public.review_votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  review_id   UUID NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  direction   TEXT NOT NULL CHECK (direction IN ('helpful', 'not_helpful')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, review_id)
);

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own votes" ON public.review_votes;
CREATE POLICY "Users can manage own votes" ON public.review_votes
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Votes are readable by authenticated users" ON public.review_votes;
CREATE POLICY "Votes are readable by authenticated users" ON public.review_votes
  FOR SELECT USING (auth.role() = 'authenticated');


-- ─── 3. moderation_config table ───────────────────────────────────────────────
-- Stores the configurable blocked-word list and report threshold.
-- Only the service role can modify this (admin-only).

CREATE TABLE IF NOT EXISTS public.moderation_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE public.moderation_config ENABLE ROW LEVEL SECURITY;

-- No user-facing SELECT — service role bypasses RLS
DROP POLICY IF EXISTS "No public access to moderation config" ON public.moderation_config;
CREATE POLICY "No public access to moderation config" ON public.moderation_config
  USING (false);

-- Seed initial moderation config
INSERT INTO public.moderation_config (key, value) VALUES
  ('blocked_words', '["spam","scam","fake","fraud","phishing","xxx","casino","bitcoin","crypto","click here","free money","make money fast"]'::jsonb),
  ('report_threshold', '3'::jsonb),
  ('require_purchase_verification', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ─── 4. check_verified_purchase RPC ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_verified_purchase(
  p_user_id   UUID,
  p_product_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    JOIN public.order_items oi ON oi.order_id = o.id
    WHERE o.user_id = p_user_id
      AND oi.product_id = p_product_id
      AND o.status = 'delivered'
  );
$$;


-- ─── 5. submit_review RPC ─────────────────────────────────────────────────────
-- Validates purchase (if enabled), runs profanity filter, inserts review,
-- updates products.rating + products.review_count atomically.

CREATE OR REPLACE FUNCTION public.submit_review(
  p_user_id    UUID,
  p_product_id UUID,
  p_rating     INTEGER,
  p_comment    TEXT,
  p_image_urls TEXT[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_require_purchase BOOLEAN;
  v_is_verified      BOOLEAN;
  v_blocked_words    JSONB;
  v_word             TEXT;
  v_status           TEXT := 'published';
  v_review_id        UUID;
  v_avg_rating       DECIMAL(3,2);
  v_review_count     INTEGER;
  v_comment_lower    TEXT;
  v_existing_review  UUID;
BEGIN
  -- Validate rating
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  -- Validate comment length
  IF LENGTH(TRIM(p_comment)) < 10 THEN
    RAISE EXCEPTION 'Review comment must be at least 10 characters';
  END IF;

  IF LENGTH(TRIM(p_comment)) > 2000 THEN
    RAISE EXCEPTION 'Review comment cannot exceed 2000 characters';
  END IF;

  -- Check for duplicate review (one review per user per product)
  SELECT id INTO v_existing_review
  FROM public.reviews
  WHERE user_id = p_user_id AND product_id = p_product_id
  LIMIT 1;

  IF v_existing_review IS NOT NULL THEN
    RAISE EXCEPTION 'You have already reviewed this product';
  END IF;

  -- Purchase verification gate
  SELECT (value::TEXT)::BOOLEAN INTO v_require_purchase
  FROM public.moderation_config WHERE key = 'require_purchase_verification';

  IF v_require_purchase THEN
    v_is_verified := public.check_verified_purchase(p_user_id, p_product_id);
    IF NOT v_is_verified THEN
      RAISE EXCEPTION 'PURCHASE_REQUIRED: You can only review products from delivered orders';
    END IF;
  END IF;

  -- Profanity / spam filter (server-side)
  SELECT value INTO v_blocked_words
  FROM public.moderation_config WHERE key = 'blocked_words';

  v_comment_lower := LOWER(p_comment);

  FOR v_word IN SELECT jsonb_array_elements_text(v_blocked_words) LOOP
    IF v_comment_lower LIKE '%' || v_word || '%' THEN
      v_status := 'pending'; -- Hold for human review rather than hard-reject
      EXIT;
    END IF;
  END LOOP;

  -- Insert review
  INSERT INTO public.reviews (
    user_id, product_id, rating, comment, images, status, verified_purchase, helpful_count
  ) VALUES (
    p_user_id, p_product_id, p_rating, p_comment,
    p_image_urls, v_status, COALESCE(v_is_verified, false), 0
  )
  RETURNING id INTO v_review_id;

  -- Recompute product rating from published reviews only
  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM public.reviews
  WHERE product_id = p_product_id AND status = 'published';

  UPDATE public.products
  SET rating = COALESCE(v_avg_rating, 0),
      review_count = v_review_count,
      updated_at = NOW()
  WHERE id = p_product_id;

  RETURN jsonb_build_object(
    'id', v_review_id,
    'status', v_status,
    'verified_purchase', COALESCE(v_is_verified, false),
    'moderated', v_status = 'pending'
  );
END;
$$;


-- ─── 6. vote_review RPC ───────────────────────────────────────────────────────
-- p_direction = 'helpful' | 'not_helpful' | NULL (retract)

CREATE OR REPLACE FUNCTION public.vote_review(
  p_user_id   UUID,
  p_review_id UUID,
  p_direction TEXT  -- 'helpful', 'not_helpful', or NULL to retract
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_direction TEXT;
  v_delta         INTEGER;
BEGIN
  -- Get existing vote direction if any
  SELECT direction INTO v_old_direction
  FROM public.review_votes
  WHERE user_id = p_user_id AND review_id = p_review_id;

  IF p_direction IS NULL THEN
    -- Retract vote
    DELETE FROM public.review_votes
    WHERE user_id = p_user_id AND review_id = p_review_id;

    -- Adjust helpful_count if old vote was 'helpful'
    IF v_old_direction = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = GREATEST(0, helpful_count - 1)
      WHERE id = p_review_id;
    END IF;

  ELSIF v_old_direction IS NULL THEN
    -- New vote
    INSERT INTO public.review_votes (user_id, review_id, direction)
    VALUES (p_user_id, p_review_id, p_direction);

    IF p_direction = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    END IF;

  ELSIF v_old_direction <> p_direction THEN
    -- Change direction
    UPDATE public.review_votes
    SET direction = p_direction
    WHERE user_id = p_user_id AND review_id = p_review_id;

    -- Adjust helpful_count
    IF p_direction = 'helpful' THEN
      UPDATE public.reviews SET helpful_count = helpful_count + 1 WHERE id = p_review_id;
    ELSE
      UPDATE public.reviews SET helpful_count = GREATEST(0, helpful_count - 1) WHERE id = p_review_id;
    END IF;
  END IF;
  -- If direction unchanged, no-op
END;
$$;


-- ─── 7. flag_review RPC ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.flag_review(
  p_user_id   UUID,
  p_review_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threshold     INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Prevent self-flagging
  IF EXISTS (SELECT 1 FROM public.reviews WHERE id = p_review_id AND user_id = p_user_id) THEN
    RAISE EXCEPTION 'You cannot flag your own review';
  END IF;

  -- Prevent duplicate flags from the same user
  IF EXISTS (
    SELECT 1 FROM public.reviews
    WHERE id = p_review_id AND p_user_id = ANY(reported_by)
  ) THEN
    RETURN; -- Silently ignore duplicate reports
  END IF;

  -- Append reporter to reported_by array
  UPDATE public.reviews
  SET reported_by = array_append(reported_by, p_user_id)
  WHERE id = p_review_id;

  -- Get report threshold from config
  SELECT (value::TEXT)::INTEGER INTO v_threshold
  FROM public.moderation_config WHERE key = 'report_threshold';

  -- Count current reporters
  SELECT array_length(reported_by, 1) INTO v_current_count
  FROM public.reviews WHERE id = p_review_id;

  -- Auto-flag once threshold reached
  IF v_current_count >= COALESCE(v_threshold, 3) THEN
    UPDATE public.reviews SET status = 'flagged' WHERE id = p_review_id;
    -- Recompute product rating excluding now-flagged review
    WITH stats AS (
      SELECT ROUND(AVG(rating)::NUMERIC, 2) AS avg_r, COUNT(*) AS cnt
      FROM public.reviews r2
      JOIN public.reviews r3 ON r3.id = p_review_id
      WHERE r2.product_id = r3.product_id AND r2.status = 'published'
    )
    UPDATE public.products
    SET rating = COALESCE((SELECT avg_r FROM stats), 0),
        review_count = (SELECT cnt FROM stats),
        updated_at = NOW()
    WHERE id = (SELECT product_id FROM public.reviews WHERE id = p_review_id);
  END IF;
END;
$$;


-- ─── 8. Helper: fetch user vote for a review ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_user_review_vote(
  p_user_id   UUID,
  p_review_id UUID
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT direction FROM public.review_votes
  WHERE user_id = p_user_id AND review_id = p_review_id;
$$;


-- ─── 9. Storage bucket setup (run via Supabase Dashboard or CLI) ──────────────
-- The SQL below creates the bucket and policies. In Supabase Studio you can
-- also do this via Storage -> New Bucket -> "review-images" (public: true).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'review-images',
  'review-images',
  true,    -- public read
  2097152, -- 2 MB server-side limit (client-side enforced to same)
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS: authenticated users can upload to their own path only
DROP POLICY IF EXISTS "Users upload to own review path" ON storage.objects;
DROP POLICY IF EXISTS "Users upload to own review path" ON storage.objects;
CREATE POLICY "Users upload to own review path" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = 'reviews'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

-- Storage RLS: users can delete their own review images
DROP POLICY IF EXISTS "Users delete own review images" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own review images" ON storage.objects;
CREATE POLICY "Users delete own review images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = 'reviews'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

-- Storage RLS: public read for all review images
DROP POLICY IF EXISTS "Public read review images" ON storage.objects;
DROP POLICY IF EXISTS "Public read review images" ON storage.objects;
CREATE POLICY "Public read review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');
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
-- Admin panel needs full CRUD to manage promo codes.
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Admin full CRUD
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- No direct SELECT policy for regular users — clients must call validate_promo_code() RPC
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
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

-- The INSERT policy from the init migration is still correct; ensure it exists.
-- A guest calling create_order_transaction RPC (SECURITY DEFINER) inserts with
-- the server-side p_user_id = auth.uid() of the anonymous session, so no bypass.
-- The direct INSERT policy remains scoped:
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
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
  INSERT INTO public.users (id, email, full_name, phone, "role")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone,
    'customer'
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
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users; CREATE OR REPLACE TRIGGER on_auth_user_created
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
-- =============================================================================
-- Migration: 20260716000800_admin_role_and_rls.sql
--
-- Adds:
--   1. admin role column to public.users
--   2. Row Level Security policies that grant admin users full read/write
--      access to all tables (products, orders, order_items, reviews,
--      cart_items, wishlist_items, users, push_tokens, user_preferences,
--      promo_codes, notifications)
--   3. Helper function is_admin() for use in all policies
--
-- Security model:
--   - Admins are identified by public.users.role = 'admin'
--   - The admin panel uses the anon key + user JWT (not service role)
--   - All admin access goes through RLS, never bypasses it
--   - Service role is only used in Edge Functions (server-side)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add role column to users table (if not already present)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN "role" TEXT NOT NULL DEFAULT 'customer'
      CHECK ("role" IN ('customer', 'admin'));
  END IF;
END
$$;

-- Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users ("role")
  WHERE "role" = 'admin';

-- ---------------------------------------------------------------------------
-- 2. Helper function: is_admin()
--    Returns TRUE if the current JWT user has role = 'admin' in public.users.
--    SECURITY DEFINER so it can read public.users without triggering RLS loops.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND "role" = 'admin'
  );
$$;

-- Grant execute to authenticated role so policies can call it
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Products — admin full access
-- ---------------------------------------------------------------------------
-- Existing public read policy should already exist from init migration.
-- Add admin write policies.

DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON public.products;
CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Orders — admin can read all orders (users can only read their own)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all orders" ON public.orders;
CREATE POLICY "Admins can read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 5. Order Items — admin can read all
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all order items" ON public.order_items;
CREATE POLICY "Admins can read all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 6. Reviews — admin can read all (including pending/flagged), update, delete
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all reviews" ON public.reviews;
CREATE POLICY "Admins can read all reviews"
  ON public.reviews FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 7. Users table — admin can read all user records
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
CREATE POLICY "Admins can read all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update users" ON public.users;
CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Promo codes — admin full CRUD
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes"
  ON public.promo_codes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 9. Push tokens — admin can read for notification management
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read push tokens" ON public.push_tokens;
CREATE POLICY "Admins can read push tokens"
  ON public.push_tokens FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- 10. User preferences — admin can read for support purposes
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can read user preferences" ON public.user_preferences;
CREATE POLICY "Admins can read user preferences"
  ON public.user_preferences FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- ---------------------------------------------------------------------------
-- Create notifications table if it doesn't exist (referenced by admin RLS policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can insert notifications (used by edge functions)
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);




-- ---------------------------------------------------------------------------
-- Verification query (uncomment to test)
-- ---------------------------------------------------------------------------
-- SELECT id, email, role FROM public.users WHERE role = 'admin';
-- SELECT public.is_admin(); -- should return TRUE when called as admin user
CREATE TABLE IF NOT EXISTS public.paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  paypal_order_id TEXT,
  order_id TEXT REFERENCES public.orders(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.paypal_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read PayPal webhook events" ON public.paypal_webhook_events;
CREATE POLICY "Admins can read PayPal webhook events"
  ON public.paypal_webhook_events FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_order_id
  ON public.paypal_webhook_events(order_id);

CREATE INDEX IF NOT EXISTS idx_paypal_webhook_events_event_type
  ON public.paypal_webhook_events(event_type);
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

-- =============================================================================
-- 20260720000000_backfill_user_roles.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill existing NULL roles
-- ---------------------------------------------------------------------------
UPDATE public.users
SET "role" = 'customer'
WHERE "role" IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Ensure column has NOT NULL DEFAULT 'customer'
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  ALTER TABLE public.users ALTER COLUMN "role" DROP DEFAULT;

  ALTER TABLE public.users
    ALTER COLUMN "role" SET DEFAULT 'customer',
    ALTER COLUMN "role" SET NOT NULL;

  ALTER TABLE public.users
    DROP CONSTRAINT IF EXISTS users_role_check;

  ALTER TABLE public.users
    ADD CONSTRAINT users_role_check
    CHECK ("role" IN ('customer', 'admin'));
END
$$;

-- ---------------------------------------------------------------------------
-- 3. Update the trigger to explicitly set role = 'customer'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, "role")
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.phone,
    'customer'
  )
  ON CONFLICT (id) DO UPDATE
    SET email     = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone     = EXCLUDED.phone,
        updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- 20260721000000_admin_login_rate_limiting.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create login_attempts table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by IP + email
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_email ON public.login_attempts(ip, email, created_at);

-- Index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON public.login_attempts(created_at);

-- ---------------------------------------------------------------------------
-- 2. Enable RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only service role can manage login attempts (admin app uses service role in API routes)
DROP POLICY IF EXISTS "Service role manages login attempts" ON public.login_attempts;
CREATE POLICY "Service role manages login attempts"
  ON public.login_attempts
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 3. Cleanup old attempts (older than 24 hours) to prevent table bloat
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- =============================================================================
-- 20260721000001_enable_products_realtime.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ensure products table is in the Supabase Realtime publication
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'products'
  ) INTO v_exists;

  IF NOT v_exists THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.products';
    RAISE NOTICE 'Added public.products to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'public.products is already in supabase_realtime publication';
  END IF;
END
$$;

-- =============================================================================
-- 20260721000002_admin_audit_log.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON public.admin_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON public.admin_audit_log(target_table, target_id);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit log" ON public.admin_audit_log;
CREATE POLICY "Admins can read audit log"
  ON public.admin_audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Service role manages audit log" ON public.admin_audit_log;
CREATE POLICY "Service role manages audit log"
  ON public.admin_audit_log FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);
