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
