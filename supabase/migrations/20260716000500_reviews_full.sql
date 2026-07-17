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
CREATE POLICY "Published reviews are viewable by everyone" ON public.reviews
  FOR SELECT USING (status = 'published');

-- Owners can update their own reviews (e.g. to add images post-upload)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Owners can delete their own reviews
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

CREATE POLICY "Users can manage own votes" ON public.review_votes
  FOR ALL USING (auth.uid() = user_id);

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
CREATE POLICY "Users upload to own review path" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'review-images'
    AND (storage.foldername(name))[1] = 'reviews'
    AND (storage.foldername(name))[2] = auth.uid()::TEXT
  );

-- Storage RLS: users can delete their own review images
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
CREATE POLICY "Public read review images" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-images');
