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
      ADD COLUMN role TEXT NOT NULL DEFAULT 'customer'
      CHECK (role IN ('customer', 'admin'));
  END IF;
END
$$;

-- Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role)
  WHERE role = 'admin';

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
      AND role = 'admin'
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
-- 11. Notifications — admin full access
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Admins can manage notifications"
  ON public.notifications FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 12. Seed a default admin account placeholder
--     (Replace email with your real admin email before running in production)
-- ---------------------------------------------------------------------------
-- NOTE: This only inserts the public.users row. The auth.users row must be
-- created via Supabase Dashboard → Authentication → Add User, then the
-- UUID from that row must match the one below.
-- Update the UUID after creating the auth user.
INSERT INTO public.users (id, email, full_name, role, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000099',  -- Replace with real auth user UUID
  'admin@glassskin.com',
  'GLASSSKIN Admin',
  'admin',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE
  SET role = 'admin',
      updated_at = NOW();

-- ---------------------------------------------------------------------------
-- Verification query (uncomment to test)
-- ---------------------------------------------------------------------------
-- SELECT id, email, role FROM public.users WHERE role = 'admin';
-- SELECT public.is_admin(); -- should return TRUE when called as admin user
