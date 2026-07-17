-- Enable pgcrypto for password hashing if not already done
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- 1. SEED AUTH USERS & IDENTITIES
-- ==========================================================

-- Helper function to seed auth user and identity
CREATE OR REPLACE FUNCTION public.seed_user(
  p_id UUID,
  p_email TEXT,
  p_name TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    p_id,
    'authenticated',
    'authenticated',
    p_email,
    crypt('password123', gen_salt('bf')), -- bcrypt hash for password123
    now(),
    null,
    now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  ) ON CONFLICT (id) DO NOTHING;

  -- Insert identity
  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_id::text,
    p_id,
    jsonb_build_object('sub', p_id, 'email', p_email),
    'email',
    now(),
    now(),
    now()
  ) ON CONFLICT (provider_id, provider) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute user seeds
SELECT public.seed_user('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0', 'guest@glassskin.com', 'Guest User');
SELECT public.seed_user('00000000-0000-0000-0000-00000000000a', 'jane.doe@example.com', 'Jane Doe');
SELECT public.seed_user('00000000-0000-0000-0000-00000000000b', 'emily.smith@example.com', 'Emily Smith');
SELECT public.seed_user('00000000-0000-0000-0000-00000000000c', 'sophia.loren@example.com', 'Sophia Loren');
SELECT public.seed_user('00000000-0000-0000-0000-00000000000d', 'olivia.martinez@example.com', 'Olivia Martinez');

DROP FUNCTION public.seed_user(UUID, TEXT, TEXT);


-- ==========================================================
-- 2. SEED PRODUCTS
-- ==========================================================

INSERT INTO public.products (
  id,
  name,
  slug,
  description,
  price,
  compare_at_price,
  category,
  tags,
  images,
  stock_quantity,
  rating,
  review_count,
  skin_types,
  certifications,
  ingredients,
  usage
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Glass Skin Hydrating Serum',
  'glass-skin-hydrating-serum',
  'Achieve the ultimate translucent, glowing complexion. Infused with double molecular weight hyaluronic acid and nourishing botanical extracts, this serum sinks deep into the skin layers to lock in moisture, refine pores, and restore a youthful radiance.',
  38.00,
  48.00,
  'Skincare',
  ARRAY['Best Seller', 'Hydration', 'Glow'],
  ARRAY[
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1608248597481-496100c80836?w=600&auto=format&fit=crop&q=80'
  ],
  45,
  4.8,
  24,
  ARRAY['dry', 'sensitive', 'normal', 'combination'],
  ARRAY['organic', 'vegan', 'cruelty-free', 'toxin-free'],
  'Aloe Barbadensis Leaf Juice*, Sodium Hyaluronate, Niacinamide (Vitamin B3), Glycerin*, Centella Asiatica Extract*, Panthenol (Provitamin B5), Camellia Sinensis (Green Tea) Leaf Extract*, Phenethyl Alcohol, Ethylhexylglycerin. *Certified Organic',
  'Apply 2-3 drops to clean, damp face and neck morning and night. Gently pat into the skin until fully absorbed. Follow with your favorite moisturizer.'
),
(
  '00000000-0000-0000-0000-000000000002',
  'Clarifying Matcha Clay Mask',
  'clarifying-matcha-clay-mask',
  'Detoxify and refresh congested pores without stripping natural moisture. Formulated with organic ceremonial-grade Japanese matcha and creamy French green clay, this mask draws out impurities, absorbs excess sebum, and reduces redness.',
  32.00,
  NULL,
  'Skincare',
  ARRAY['Detox', 'Clarifying'],
  ARRAY[
    'https://images.unsplash.com/photo-1567894192231-d22d9c1349db?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&auto=format&fit=crop&q=80'
  ],
  30,
  4.6,
  18,
  ARRAY['oily', 'combination', 'acne-prone'],
  ARRAY['vegan', 'cruelty-free', 'toxin-free'],
  'French Green Clay (Illite), Kaolin, Uji Matcha Powder*, Aloe Barbadensis Leaf Juice Powder*, Melaleuca Alternifolia (Tea Tree) Essential Oil*, Salicylic Acid (0.5%), Licorice Root Extract*. *Certified Organic',
  'Smooth a generous layer over clean skin, avoiding the eye area. Leave on for 10-15 minutes until dry. Rinse thoroughly with warm water using circular motions to gently exfoliate. Use 1-2 times weekly.'
),
(
  '00000000-0000-0000-0000-000000000003',
  'Toxin-Free Whipped Body Butter',
  'toxin-free-whipped-body-butter',
  'An ultra-nourishing, decadent cream that melts on contact. Whipped to perfection with raw African shea butter, organic virgin coconut oil, and soothing lavender essential oil, it provides long-lasting, deep hydration for dry skin.',
  24.00,
  28.00,
  'Body Care',
  ARRAY['Nourishing', 'Hydration'],
  ARRAY[
    'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556229174-5e42a09e45af?w=600&auto=format&fit=crop&q=80'
  ],
  60,
  4.9,
  32,
  ARRAY['dry', 'normal', 'sensitive'],
  ARRAY['organic', 'cruelty-free', 'toxin-free'],
  'Butyrospermum Parkii (Shea) Butter*, Cocos Nucifera (Coconut) Oil*, Simmondsia Chinensis (Jojoba) Seed Oil*, Tocopherol (Vitamin E), Lavandula Angustifolia (Lavender) Oil*, Anthemis Nobilis (Chamomile) Flower Oil*. *Certified Organic',
  'Massage a small amount onto damp skin immediately after bathing or showering to lock in moisture. Focus on dry areas like elbows, knees, and heels.'
),
(
  '00000000-0000-0000-0000-000000000004',
  'Nourishing Rosemary Hair Oil',
  'nourishing-rosemary-hair-oil',
  'Rejuvenate your scalp and strengthen hair from root to tip. A lightweight, potent botanical blend of organic rosemary oil, stimulating peppermint, and nourishing castor oil that promotes hair health, luster, and thickness.',
  20.00,
  NULL,
  'Hair Care',
  ARRAY['Hair Health', 'Nourishing'],
  ARRAY[
    'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1527799842398-e6b72a632e84?w=600&auto=format&fit=crop&q=80'
  ],
  50,
  4.7,
  15,
  ARRAY['all'],
  ARRAY['organic', 'vegan', 'cruelty-free', 'toxin-free'],
  'Ricinus Communis (Castor) Seed Oil*, Rosmarinus Officinalis (Rosemary) Leaf Oil*, Mentha Piperita (Peppermint) Oil*, Argania Spinosa (Argan) Kernel Oil*, Simmondsia Chinensis (Jojoba) Oil*, Biotin. *Certified Organic',
  'Massage 5-10 drops gently into the scalp. Leave on for at least 30 minutes, or overnight for deep conditioning, then wash out with a gentle shampoo. Apply a few drops to hair ends to tame frizz.'
),
(
  '00000000-0000-0000-0000-000000000005',
  'Restorative Rosehip Facial Oil',
  'restorative-rosehip-facial-oil',
  'A pure, cold-pressed elixir that targets fine lines, uneven texture, and scarring. Organic Rosehip Seed Oil is naturally rich in essential fatty acids, Vitamin A, and Vitamin C, offering intense cellular repair and collagen boost.',
  45.00,
  52.00,
  'Skincare',
  ARRAY['Anti-Aging', 'Repair'],
  ARRAY[
    'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=600&auto=format&fit=crop&q=80'
  ],
  25,
  4.9,
  28,
  ARRAY['dry', 'mature', 'sensitive', 'normal'],
  ARRAY['organic', 'vegan', 'cruelty-free', 'toxin-free'],
  '100% Pure Cold-Pressed Rosa Canina (Rosehip) Seed Oil*. *Certified Organic',
  'Warm 2-3 drops between your palms and gently press onto clean face, neck, and decolletage as the final step in your evening skincare routine.'
),
(
  '00000000-0000-0000-0000-000000000006',
  'Soothing Centella Gel Cleanser',
  'soothing-centella-gel-cleanser',
  'A pH-balanced, non-foaming daily cleanser designed to remove impurities, excess oil, and makeup without disrupting the skin barrier. Formulated with 45% Centella Asiatica extract to instantly calm and soothe sensitive skin.',
  22.00,
  NULL,
  'Skincare',
  ARRAY['Cleanser', 'Gentle'],
  ARRAY[
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&auto=format&fit=crop&q=80'
  ],
  40,
  4.5,
  12,
  ARRAY['sensitive', 'dry', 'normal', 'combination'],
  ARRAY['vegan', 'cruelty-free', 'toxin-free'],
  'Centella Asiatica Leaf Water*, Water, Decyl Glucoside, Glycerin*, Calendula Officinalis Flower Extract*, Panthenol, Allantoin, Xanthan Gum, Citric Acid. *Certified Organic',
  'Massage 1-2 pumps onto damp face in gentle circular motions. Rinse thoroughly with lukewarm water. Pat dry and follow with toner.'
)
ON CONFLICT (id) DO NOTHING;


-- ==========================================================
-- 3. SEED REVIEWS
-- ==========================================================

INSERT INTO public.reviews (
  id,
  user_id,
  product_id,
  rating,
  comment,
  images,
  helpful_count,
  created_at
) VALUES
(
  '00000000-0000-0000-0000-0000000000f1',
  '00000000-0000-0000-0000-00000000000a', -- Jane Doe
  '00000000-0000-0000-0000-000000000001', -- Glass Skin Hydrating Serum
  5,
  'This serum is actual magic! My skin has never looked so plump and hydrated. The glassmorphic bottle it comes in matches my aesthetic perfectly too.',
  NULL,
  14,
  '2026-06-15T12:00:00Z'
),
(
  '00000000-0000-0000-0000-0000000000f2',
  '00000000-0000-0000-0000-00000000000b', -- Emily Smith
  '00000000-0000-0000-0000-000000000001', -- Glass Skin Hydrating Serum
  4,
  'Very hydrating and doesnt break me out. Only downside is it takes a minute to sink in, but the glow is worth the wait!',
  NULL,
  6,
  '2026-07-02T15:30:00Z'
),
(
  '00000000-0000-0000-0000-0000000000f3',
  '00000000-0000-0000-0000-00000000000c', -- Sophia Loren
  '00000000-0000-0000-0000-000000000002', -- Clarifying Matcha Clay Mask
  5,
  'Normally clay masks leave my skin feeling super tight and dry, but this matcha one is so creamy and soft. It really clean out my pores and leaves my face feeling fresh.',
  NULL,
  8,
  '2026-07-10T09:15:00Z'
),
(
  '00000000-0000-0000-0000-0000000000f4',
  '00000000-0000-0000-0000-00000000000d', -- Olivia Martinez
  '00000000-0000-0000-0000-000000000003', -- Toxin-Free Whipped Body Butter
  5,
  'The smell of lavender is so soothing, and the texture is like whipped cream. I use it every night after showering and my dry elbows are completely healed!',
  NULL,
  22,
  '2026-05-20T21:40:00Z'
)
ON CONFLICT (id) DO NOTHING;
