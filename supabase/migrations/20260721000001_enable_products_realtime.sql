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
