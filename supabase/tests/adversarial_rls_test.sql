-- =============================================================================
-- Adversarial RLS Test Suite — Full Cross-User Access Pass
-- Run against: local Supabase instance (supabase start) or staging
-- Context: Run AFTER applying migration 20260716000700_fix_guest_order_leak.sql
--
-- Tests every table that has RLS enabled, from the perspective of:
--   (A) An authenticated user trying to access another user's rows
--   (B) An anonymous/anon-role caller trying to access any private data
--   (C) Guest checkout introduced in Phase 12 — specifically testing that
--       the former "user_id IS NULL" bypass is truly gone.
--
-- Each test prints: [PASS] or [FAIL: <detail>]
-- A failure raises an EXCEPTION to halt the script immediately.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- Setup: Create two real auth users (A and B) and one anonymous user (G)
--        using auth.users directly (only possible with service role / superuser).
--        In a live test against supabase db execute, use the service-role connection.
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed test UUIDs (deterministic so we can clean up reliably)
DO $$
BEGIN
  -- User A
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_anonymous
  ) VALUES (
    'aaaaaaaa-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_a@rls-test.invalid',
    crypt('testpass123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Test User A"}', FALSE
  ) ON CONFLICT (id) DO NOTHING;

  -- User B
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_anonymous
  ) VALUES (
    'bbbbbbbb-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'user_b@rls-test.invalid',
    crypt('testpass123', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Test User B"}', FALSE
  ) ON CONFLICT (id) DO NOTHING;

  -- Anonymous user G (simulates signInAnonymously() session)
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_anonymous
  ) VALUES (
    '11111111-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    NULL, -- No email — anonymous
    NULL,
    NULL, NOW(), NOW(),
    '{"provider":"anonymous","providers":["anonymous"]}', '{}', TRUE
  ) ON CONFLICT (id) DO NOTHING;
END;
$$;

-- Manually insert public.users rows for A, B, and Guest G (trigger runs on INSERT, but
-- in test context the trigger may not fire; we insert directly to be safe).
INSERT INTO public.users (id, email, full_name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'user_a@rls-test.invalid', 'Test User A'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'user_b@rls-test.invalid', 'Test User B'),
  ('11111111-0000-0000-0000-000000000003', NULL, 'Test Guest G')
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed test data
-- ─────────────────────────────────────────────────────────────────────────────

-- Product (needed for order_items FK, but we can use SET NULL product_id)
INSERT INTO public.products (id, name, slug, price, stock_quantity)
VALUES ('cccccccc-0000-0000-0000-000000000099', 'RLS Test Product', 'rls-test-product', 10.00, 100)
ON CONFLICT (id) DO NOTHING;

-- Order A (owned by User A)
INSERT INTO public.orders (id, user_id, status, total_amount, tax_amount, shipping_amount,
                           discount_amount, shipping_address, payment_method)
VALUES (
  'RLS-TEST-ORDER-A',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'pending', 100.00, 7.00, 5.99, 0.00,
  '{"fullName":"User A","city":"LA","state":"CA"}', 'card'
) ON CONFLICT (id) DO NOTHING;

-- Order B (owned by User B)
INSERT INTO public.orders (id, user_id, status, total_amount, tax_amount, shipping_amount,
                           discount_amount, shipping_address, payment_method)
VALUES (
  'RLS-TEST-ORDER-B',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'pending', 200.00, 14.00, 5.99, 0.00,
  '{"fullName":"User B","city":"NY","state":"NY"}', 'paypal'
) ON CONFLICT (id) DO NOTHING;

-- Order G (owned by Guest/Anonymous user G — the critical case)
-- In the OLD schema this would have user_id = NULL. In the NEW schema, the
-- guest has a real auth.uid() from signInAnonymously().
INSERT INTO public.orders (id, user_id, status, total_amount, tax_amount, shipping_amount,
                           discount_amount, shipping_address, payment_method)
VALUES (
  'RLS-TEST-ORDER-G',
  '11111111-0000-0000-0000-000000000003',
  'pending', 150.00, 10.50, 5.99, 0.00,
  '{"fullName":"Guest User","city":"TX","state":"TX"}', 'card'
) ON CONFLICT (id) DO NOTHING;

-- Order items for all three orders
INSERT INTO public.order_items (id, order_id, product_id, product_name, price, quantity) VALUES
  ('11111111-0000-0000-0000-aaaaaaaaaaaa', 'RLS-TEST-ORDER-A', 'cccccccc-0000-0000-0000-000000000099', 'RLS Test Product', 10.00, 5),
  ('22222222-0000-0000-0000-bbbbbbbbbbbb', 'RLS-TEST-ORDER-B', 'cccccccc-0000-0000-0000-000000000099', 'RLS Test Product', 10.00, 10),
  ('33333333-0000-0000-0000-111111111113', 'RLS-TEST-ORDER-G', 'cccccccc-0000-0000-0000-000000000099', 'RLS Test Product', 10.00, 7)
ON CONFLICT (id) DO NOTHING;

-- Addresses for A and B (not G — anonymous users have no profile)
INSERT INTO public.addresses (id, user_id, full_name, address_line1, city, state, postal_code, country)
VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001',
   'User A', '123 Main St', 'Los Angeles', 'CA', '90001', 'US'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002',
   'User B', '456 Elm St', 'New York', 'NY', '10001', 'US')
ON CONFLICT (id) DO NOTHING;

-- Push tokens for A and B
INSERT INTO public.push_tokens (id, user_id, token, platform)
VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'token-user-a', 'ios'),
  ('ffffffff-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'token-user-b', 'android')
ON CONFLICT (id) DO NOTHING;

-- User preferences for A and B
INSERT INTO public.user_preferences (user_id, order_notifications, promo_notifications, cart_reminders)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', TRUE, FALSE, TRUE),
  ('bbbbbbbb-0000-0000-0000-000000000002', TRUE, FALSE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- Cart items for A and B
INSERT INTO public.cart_items (id, user_id, product_id, quantity)
VALUES
  ('cacacaca-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000099', 2),
  ('cbcbcbcb-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000099', 3)
ON CONFLICT (id) DO NOTHING;

-- Wishlists for A and B
INSERT INTO public.wishlists (id, user_id, product_id)
VALUES
  ('1a1a1a1a-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000099'),
  ('1b1b1b1b-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000099')
ON CONFLICT (id) DO NOTHING;
DO $$
BEGIN
  RAISE NOTICE '=== TEST DATA SEEDED ===';
END;
$$;

-- =============================================================================
-- HELPER: Run a SELECT and assert the row count equals the expected value.
-- =============================================================================
CREATE OR REPLACE FUNCTION _rls_assert(
  p_test_name   TEXT,
  p_user_label  TEXT,
  p_table       TEXT,
  p_query       TEXT,
  p_expected    INTEGER,
  p_jwt_uid     UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INTEGER;
  v_sql   TEXT;
BEGIN
  -- Impersonate the given user by setting request.jwt.claims
  IF p_jwt_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claims',
      json_build_object('sub', p_jwt_uid, 'role', 'authenticated')::TEXT,
      TRUE);
    PERFORM set_config('role', 'authenticated', TRUE);
  ELSE
    -- Simulate anon (no session)
    PERFORM set_config('request.jwt.claims', '{}', TRUE);
    PERFORM set_config('role', 'anon', TRUE);
  END IF;

  EXECUTE 'SELECT COUNT(*) FROM (' || p_query || ') _q' INTO v_count;

  -- Reset to superuser context
  RESET role;

  IF v_count = p_expected THEN
    RAISE NOTICE '[PASS] % | User: % | Table: % | Expected % row(s), Got %',
      p_test_name, p_user_label, p_table, p_expected, v_count;
  ELSE
    RAISE EXCEPTION '[FAIL] % | User: % | Table: % | Expected % row(s), Got % | Query: %',
      p_test_name, p_user_label, p_table, p_expected, v_count, p_query;
  END IF;
END;
$$;

-- =============================================================================
-- TEST SUITE
-- =============================================================================

DO $$
BEGIN
RAISE NOTICE '';
RAISE NOTICE '========================================================';
RAISE NOTICE '  ADVERSARIAL RLS TEST SUITE — Phase 12 + Guest Checkout';
RAISE NOTICE '========================================================';
RAISE NOTICE '';

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: orders
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '--- TABLE: orders ---';

-- T01: User A reads their own order → ALLOWED (1 row)
PERFORM _rls_assert(
  'T01: Own order readable',
  'User A', 'orders',
  'SELECT id FROM public.orders WHERE id = ''RLS-TEST-ORDER-A''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T02: User A reads User B's order → DENIED (0 rows)
PERFORM _rls_assert(
  'T02: Cross-user order denied',
  'User A', 'orders',
  'SELECT id FROM public.orders WHERE id = ''RLS-TEST-ORDER-B''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T03 (CRITICAL): User A reads the guest order (now owned by anonymous uid G) → DENIED
PERFORM _rls_assert(
  'T03: Guest order not readable by User A (was the leak)',
  'User A', 'orders',
  'SELECT id FROM public.orders WHERE id = ''RLS-TEST-ORDER-G''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T04 (CRITICAL): Unauthenticated anon reads ANY order → DENIED (0 rows total)
PERFORM _rls_assert(
  'T04: Anon role cannot read any order',
  'anon (no session)', 'orders',
  'SELECT id FROM public.orders',
  0,
  NULL
);

-- T05: User A cannot read all orders (only sees their own)
PERFORM _rls_assert(
  'T05: User A sees only their own orders in full scan',
  'User A', 'orders',
  'SELECT id FROM public.orders',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T06: Anonymous user G reads their own guest order → ALLOWED (1 row)
PERFORM _rls_assert(
  'T06: Anonymous user reads own guest order',
  'Anonymous User G', 'orders',
  'SELECT id FROM public.orders WHERE id = ''RLS-TEST-ORDER-G''',
  1,
  '11111111-0000-0000-0000-000000000003'
);

-- T07: Anonymous user G cannot read User A's order → DENIED
PERFORM _rls_assert(
  'T07: Anonymous user cannot read User A order',
  'Anonymous User G', 'orders',
  'SELECT id FROM public.orders WHERE id = ''RLS-TEST-ORDER-A''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: order_items
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: order_items ---';

-- T08: User A reads their own order items → ALLOWED
PERFORM _rls_assert(
  'T08: Own order_items readable',
  'User A', 'order_items',
  'SELECT id FROM public.order_items WHERE order_id = ''RLS-TEST-ORDER-A''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T09: User A reads User B's order items → DENIED
PERFORM _rls_assert(
  'T09: Cross-user order_items denied',
  'User A', 'order_items',
  'SELECT id FROM public.order_items WHERE order_id = ''RLS-TEST-ORDER-B''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T10 (CRITICAL): User A reads guest order items → DENIED
PERFORM _rls_assert(
  'T10: Guest order_items not readable by User A',
  'User A', 'order_items',
  'SELECT id FROM public.order_items WHERE order_id = ''RLS-TEST-ORDER-G''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T11: Anon reads any order_items → DENIED
PERFORM _rls_assert(
  'T11: Anon role cannot read any order_items',
  'anon (no session)', 'order_items',
  'SELECT id FROM public.order_items',
  0,
  NULL
);

-- T12: Anonymous user G reads own order items → ALLOWED
PERFORM _rls_assert(
  'T12: Anonymous user reads own order_items',
  'Anonymous User G', 'order_items',
  'SELECT id FROM public.order_items WHERE order_id = ''RLS-TEST-ORDER-G''',
  1,
  '11111111-0000-0000-0000-000000000003'
);

-- T13: Anonymous user G cannot read User A's order items → DENIED
PERFORM _rls_assert(
  'T13: Anonymous user cannot read User A order_items',
  'Anonymous User G', 'order_items',
  'SELECT id FROM public.order_items WHERE order_id = ''RLS-TEST-ORDER-A''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: push_tokens
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: push_tokens ---';

-- T14: User A reads own push token → ALLOWED
PERFORM _rls_assert(
  'T14: Own push_token readable',
  'User A', 'push_tokens',
  'SELECT id FROM public.push_tokens WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T15: User A reads User B's push token → DENIED
PERFORM _rls_assert(
  'T15: Cross-user push_token denied',
  'User A', 'push_tokens',
  'SELECT id FROM public.push_tokens WHERE user_id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T16: Anon reads any push_token → DENIED
PERFORM _rls_assert(
  'T16: Anon role cannot read push_tokens',
  'anon (no session)', 'push_tokens',
  'SELECT id FROM public.push_tokens',
  0,
  NULL
);

-- T17: Anonymous guest G cannot read User A's push token (no profile, no token)
PERFORM _rls_assert(
  'T17: Anonymous user cannot read User A push_token',
  'Anonymous User G', 'push_tokens',
  'SELECT id FROM public.push_tokens WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: user_preferences
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: user_preferences ---';

-- T18: User A reads own preferences → ALLOWED
PERFORM _rls_assert(
  'T18: Own user_preferences readable',
  'User A', 'user_preferences',
  'SELECT user_id FROM public.user_preferences WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T19: User A reads User B's preferences → DENIED
PERFORM _rls_assert(
  'T19: Cross-user user_preferences denied',
  'User A', 'user_preferences',
  'SELECT user_id FROM public.user_preferences WHERE user_id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T20: Anon reads any user_preferences → DENIED
PERFORM _rls_assert(
  'T20: Anon role cannot read user_preferences',
  'anon (no session)', 'user_preferences',
  'SELECT user_id FROM public.user_preferences',
  0,
  NULL
);

-- T21: Anonymous user G cannot read User A's preferences
PERFORM _rls_assert(
  'T21: Anonymous user cannot read User A preferences',
  'Anonymous User G', 'user_preferences',
  'SELECT user_id FROM public.user_preferences WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: addresses
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: addresses ---';

-- T22: User A reads own addresses → ALLOWED
PERFORM _rls_assert(
  'T22: Own addresses readable',
  'User A', 'addresses',
  'SELECT id FROM public.addresses WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T23: User A reads User B's addresses → DENIED
PERFORM _rls_assert(
  'T23: Cross-user addresses denied',
  'User A', 'addresses',
  'SELECT id FROM public.addresses WHERE user_id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T24: Anon reads any addresses → DENIED
PERFORM _rls_assert(
  'T24: Anon role cannot read addresses',
  'anon (no session)', 'addresses',
  'SELECT id FROM public.addresses',
  0,
  NULL
);

-- T25: Anonymous user G cannot read any address row
PERFORM _rls_assert(
  'T25: Anonymous user cannot read User A addresses',
  'Anonymous User G', 'addresses',
  'SELECT id FROM public.addresses WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: cart_items
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: cart_items ---';

-- T26: User A reads own cart → ALLOWED
PERFORM _rls_assert(
  'T26: Own cart_items readable',
  'User A', 'cart_items',
  'SELECT id FROM public.cart_items WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T27: User A reads User B's cart → DENIED
PERFORM _rls_assert(
  'T27: Cross-user cart_items denied',
  'User A', 'cart_items',
  'SELECT id FROM public.cart_items WHERE user_id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T28: Anon reads any cart_items → DENIED
PERFORM _rls_assert(
  'T28: Anon role cannot read cart_items',
  'anon (no session)', 'cart_items',
  'SELECT id FROM public.cart_items',
  0,
  NULL
);

-- T29: Anonymous user G cannot read any cart_items (has no cart rows and no access)
PERFORM _rls_assert(
  'T29: Anonymous user cannot read User A cart_items',
  'Anonymous User G', 'cart_items',
  'SELECT id FROM public.cart_items WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: wishlists
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: wishlists ---';

-- T30: User A reads own wishlist → ALLOWED
PERFORM _rls_assert(
  'T30: Own wishlists readable',
  'User A', 'wishlists',
  'SELECT id FROM public.wishlists WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T31: User A reads User B's wishlist → DENIED
PERFORM _rls_assert(
  'T31: Cross-user wishlists denied',
  'User A', 'wishlists',
  'SELECT id FROM public.wishlists WHERE user_id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T32: Anon reads any wishlists → DENIED
PERFORM _rls_assert(
  'T32: Anon role cannot read wishlists',
  'anon (no session)', 'wishlists',
  'SELECT id FROM public.wishlists',
  0,
  NULL
);

-- T33: Anonymous user G cannot read User A wishlists
PERFORM _rls_assert(
  'T33: Anonymous user cannot read User A wishlists',
  'Anonymous User G', 'wishlists',
  'SELECT id FROM public.wishlists WHERE user_id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TABLE: users
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- TABLE: users (profiles) ---';

-- T34: User A reads own profile → ALLOWED
PERFORM _rls_assert(
  'T34: Own user profile readable',
  'User A', 'users',
  'SELECT id FROM public.users WHERE id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  1,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T35: User A reads User B's profile → DENIED
PERFORM _rls_assert(
  'T35: Cross-user profile denied',
  'User A', 'users',
  'SELECT id FROM public.users WHERE id = ''bbbbbbbb-0000-0000-0000-000000000002''',
  0,
  'aaaaaaaa-0000-0000-0000-000000000001'
);

-- T36: Anon reads any user profiles → DENIED
PERFORM _rls_assert(
  'T36: Anon role cannot read user profiles',
  'anon (no session)', 'users',
  'SELECT id FROM public.users',
  0,
  NULL
);

-- T37: Anonymous user G cannot read User A's profile (G has no profile row)
PERFORM _rls_assert(
  'T37: Anonymous user cannot read User A profile',
  'Anonymous User G', 'users',
  'SELECT id FROM public.users WHERE id = ''aaaaaaaa-0000-0000-0000-000000000001''',
  0,
  '11111111-0000-0000-0000-000000000003'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- POLICY GREP ASSERTION: No active policy contains "user_id IS NULL" bypass
-- ─────────────────────────────────────────────────────────────────────────────
RAISE NOTICE '';
RAISE NOTICE '--- POLICY EXPRESSION AUDIT ---';

DECLARE
  v_bad_count INTEGER;
  v_bad_list  TEXT;
BEGIN
  SELECT COUNT(*), string_agg(polname || ' ON ' || cls.relname, ', ')
  INTO v_bad_count, v_bad_list
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace ns ON ns.oid = cls.relnamespace
  WHERE ns.nspname = 'public'
    AND (
      pg_get_expr(pol.polqual, pol.polrelid) ILIKE '%user_id IS NULL%'
      OR pg_get_expr(pol.polwithcheck, pol.polrelid) ILIKE '%user_id IS NULL%'
    );

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION '[FAIL] T38: Found % policy/policies with "user_id IS NULL" bypass: %',
      v_bad_count, v_bad_list;
  ELSE
    RAISE NOTICE '[PASS] T38: No active RLS policy contains "user_id IS NULL" as a bypass clause.';
  END IF;
END;

RAISE NOTICE '';
RAISE NOTICE '========================================================';
RAISE NOTICE '  ALL TESTS PASSED';
RAISE NOTICE '========================================================';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cleanup: Remove test data
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  DELETE FROM public.wishlists   WHERE user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
  DELETE FROM public.cart_items  WHERE user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
  DELETE FROM public.addresses   WHERE user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
  DELETE FROM public.push_tokens WHERE user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
  DELETE FROM public.user_preferences WHERE user_id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002');
  DELETE FROM public.order_items WHERE order_id IN ('RLS-TEST-ORDER-A','RLS-TEST-ORDER-B','RLS-TEST-ORDER-G');
  DELETE FROM public.orders      WHERE id IN ('RLS-TEST-ORDER-A','RLS-TEST-ORDER-B','RLS-TEST-ORDER-G');
  DELETE FROM public.users       WHERE id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003');
  DELETE FROM auth.users         WHERE id IN ('aaaaaaaa-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','11111111-0000-0000-0000-000000000003');
  DELETE FROM public.products    WHERE id = 'cccccccc-0000-0000-0000-000000000099';
  DROP FUNCTION IF EXISTS _rls_assert(TEXT, TEXT, TEXT, TEXT, INTEGER, UUID);
  RAISE NOTICE 'Test data cleaned up.';
END;
$$;

ROLLBACK; -- Roll back all data changes; this script is read-only for production state.
          -- Remove ROLLBACK and use COMMIT if you want to persist test data for manual inspection.
