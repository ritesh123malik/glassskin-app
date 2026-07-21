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
