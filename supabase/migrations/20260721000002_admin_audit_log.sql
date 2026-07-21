-- =============================================================================
-- Migration: 20260721000002_admin_audit_log.sql
--
-- Creates the admin_audit_log table for tracking admin actions.
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
