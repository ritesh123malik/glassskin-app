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
