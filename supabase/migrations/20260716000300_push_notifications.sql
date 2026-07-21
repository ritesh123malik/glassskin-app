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
