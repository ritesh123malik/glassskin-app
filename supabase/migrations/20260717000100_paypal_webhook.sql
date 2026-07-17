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
