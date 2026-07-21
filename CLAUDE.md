# GLASSSKIN App — AI Agent Context

## Stack

| Layer | Tech |
|-------|------|
| Framework | Expo SDK 57 (React Native 0.86) |
| Language | TypeScript (strict) |
| State | Zustand (src/store/useAppStore.ts) |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Backend | Supabase (auth, Postgres, Edge Functions, Realtime) |
| Payments | Stripe (PaymentSheet) + PayPal Checkout |
| Analytics | PostHog (`posthog-js`) + Sentry breadcrumbs |
| Styling | NativeWind 4 + custom `tokens` theme (src/theme/tokens.ts) |
| 3D / Media | expo-image, react-native-reanimated, GLB models |
| Testing | Jest + @testing-library/react-native |
| E2E | Detox |

## Folder Structure

```
├── App.tsx                    # Root: Sentry init, navigation, deep links
├── global.css                 # Tailwind directives + custom base layers
├── tailwind.config.js         # NativeWind preset + theme extension
├── tsconfig.json              # extends expo/tsconfig.base, strict: true
├── CLAUDE.md                  # This file
├── AGENTS.md                  # "Expo HAS CHANGED" — read v57 docs
├── .env.example               # All required/optional env vars
├── .env                       # Local secrets (gitignored)
│
├── src/
│   ├── components/
│   │   ├── common/            # GlassCard, GlassButton, GlassInput, Skeleton, Marquee, RevealOnScroll, ModelViewer3D
│   │   └── product/           # ProductCard
│   ├── navigation/
│   │   └── AppNavigator.tsx   # Root stack + tab navigator
│   ├── screens/
│   │   ├── auth/              # Onboarding, Login, Signup, ForgotPassword, ResetPassword
│   │   ├── cart/              # CartScreen, CheckoutScreen, OrderConfirmationScreen
│   │   ├── home/              # HomeScreen, ProductListingScreen, ProductDetailScreen, Showroom3DScreen, WishlistScreen
│   │   ├── orders/            # OrderTrackingScreen
│   │   ├── profile/           # ProfileScreen
│   │   └── dev/               # ComponentGalleryScreen (__DEV__ only)
│   ├── services/
│   │   ├── analytics.ts       # PostHog wrapper (trackScreenView, trackPurchase, etc.)
│   │   ├── supabaseClient.ts  # Supabase client + SecureStore chunking adapter
│   │   ├── reviewService.ts   # Review CRUD + voting
│   │   └── productCacheService.ts
│   ├── store/
│   │   └── useAppStore.ts     # Zustand store (auth, cart, wishlist, orders, products, checkout)
│   ├── theme/
│   │   ├── tokens.ts          # Design tokens (colors, spacing, radius, shadows)
│   │   └── typography.ts      # Font families + text styles
│   ├── types/
│   │   ├── index.ts           # Shared types (User, Product, Order, ShippingAddress, etc.)
│   │   └── database.types.ts  # Generated Supabase Database types
│   ├── utils/
│   │   ├── stripe.native.ts   # Stripe native hook
│   │   ├── stripe.web.tsx     # Stripe web hook
│   │   └── helpers.ts         # Currency formatting, date helpers
│   └── __tests__/             # Top-level unit tests
│
├── admin/                     # Next.js admin dashboard (separate app)
│   ├── app/
│   │   ├── api/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── supabase.ts
│   │   └── auth.tsx
│   └── .env.local             # Admin Supabase creds
│
├── supabase/
│   ├── migrations/            # Versioned SQL migrations
│   ├── seed.sql               # Development seed data
│   └── functions/             # Edge Functions (Deno)
│       ├── _shared/           # Shared CORS + JWT utilities
│       ├── create-payment-intent/
│       ├── paypal-checkout/
│       ├── paypal-webhook/
│       ├── stripe-webhook/
│       ├── send-order-notification/
│       ├── abandoned-cart-reminder/
│       ├── export-user-data/
│       ├── delete-user-data/
│       └── google-places-autocomplete/
│
└── e2e/                       # Detox end-to-end tests
```

## Key Conventions

### State (Zustand)
- Single store: `src/store/useAppStore.ts`
- Selectors: `useAppStore(state => state.someField)`
- Avoid `useAppStore.getState()` inside render; use `useEffect` or selectors
- Async actions live in the store (e.g. `createOrder`, `fetchCart`, `checkAuth`)

### Navigation
- `RootStackParamList` in `src/navigation/AppNavigator.tsx`
- Screen components receive `{ navigation, route }` as props
- Deep links handled in `App.tsx` via `Linking.addEventListener`

### Theme
- **Never hardcode colors.** Use `tokens.colors.*` (src/theme/tokens.ts)
- Typography: `typography.display`, `typography.body`, etc.
- Shadows: `tokens.shadows.glass`
- Glass cards: `GlassCard` component with `variant="float-card" | "product-card" | "bento-item"`

### Supabase
- Client: `supabaseClient` from `src/services/supabaseClient.ts`
- RPC calls: `supabaseClient.rpc('function_name', { args })`
- Auth: `supabaseClient.auth.signInWithPassword`, `onAuthStateChange`
- Realtime: `supabaseClient.channel(...).on(...).subscribe()`

### Edge Functions
- CORS: use `getCorsHeaders(requestOrigin)` from `supabase/functions/_shared/cors.ts`
- Auth: use `requireAuthenticatedUser(req)` from `supabase/functions/_shared/verifyJwt.ts`
- All state-changing functions must validate JWT + origin

### Payments
- Stripe: `useStripe()` hook + `initPaymentSheet` + `presentPaymentSheet`
- PayPal: Edge Function `paypal-checkout` (create → capture flow)
- Server-calculated totals: `compute_order_totals` RPC
- Never trust client-side totals for order creation

### Testing
- Unit: `jest` with `@testing-library/react-native`
- E2E: `detox` (config in package.json scripts)
- Tests live alongside source in `__tests__/` folders

## Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Web
npm run web

# Typecheck
npm run typecheck

# Lint
npm run lint

# Unit tests
npm test

# E2E tests (requires build)
npm run test:ios   # or test:android
```

## Environment Variables

See `.env.example` for all required variables. Key ones:
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (optional)
- `POSTHOG_API_KEY` (optional)
- `EXPO_PUBLIC_SENTRY_DSN` (optional)

Admin dashboard uses `admin/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Important Notes

- **Expo v57 docs**: Always check https://docs.expo.dev/versions/v57.0.0/ for API changes
- **Supabase migrations**: Run via Dashboard SQL Editor (remote project `afevhbneeoqzmccwhkyx`)
- **Edge Function secrets**: Set via `supabase secrets set` (never commit to repo)
- **Guest checkout**: Users sign in anonymously via `signInAnonymously()` before checkout
- **Admin middleware**: `admin/middleware.ts` protects `/dashboard/*` routes server-side
- **SecureStore chunking**: `SecureStoreAdapter` in `supabaseClient.ts` handles 2KB Android limit with per-key write locks
