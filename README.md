# GLASSSKIN

> **GLASSSKIN** is a native/cross-platform mobile shopping app (iOS, Android, Web) for a clean-beauty/skincare brand. Built with **Expo (React Native) + TypeScript** on the frontend and **Supabase** (Postgres + Auth + Storage + Edge Functions) on the backend, with **Stripe** and **PayPal** for payments.

---

## 📦 Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| App Framework | Expo SDK | 57 |
| React Native | React Native | 0.86 |
| Language | TypeScript | 19.2 |
| State Management | Zustand | 5 |
| Styling | NativeWind (Tailwind for RN) | 4 |
| Navigation | React Navigation | 7 |
| Backend | Supabase | Latest |
| Payments | Stripe, PayPal | Latest |

---

## 🗂️ Project Structure

```
glassskin-app/
├── App.tsx                      # Root: providers, Sentry, navigation
├── app.json                     # Expo configuration
├── eas.json                     # EAS Build profiles
├── .env.example                 # Environment variables template
├── .github/
│   └── workflows/
│       ├── ci.yml               # Typecheck, lint, unit tests
│       ├── e2e.yml              # Detox E2E tests
│       └── eas-build.yml        # EAS build & submit pipeline
├── src/
│   ├── screens/                 # All app screens
│   │   ├── auth/                # Login, Signup, Password reset
│   │   ├── home/                # Home, Products, Details, Wishlist
│   │   ├── cart/                # Cart, Checkout, Confirmation
│   │   ├── orders/              # Order tracking
│   │   ├── profile/             # User profile
│   │   └── dev/                 # ComponentGallery (dev-only)
│   ├── components/              # Reusable UI components
│   ├── navigation/              # App navigation config
│   ├── store/                   # Zustand store (auth, cart, orders)
│   ├── services/                # Supabase, cache, analytics
│   ├── theme/                   # Design tokens & typography
│   ├── types/                   # TypeScript types
│   └── utils/                   # Utility functions
├── admin/                       # Next.js admin back office
├── supabase/
│   ├── migrations/              # Database migrations
│   ├── functions/               # Edge Functions (Deno)
│   └── tests/                   # SQL adversarial tests
├── e2e/                         # Detox end-to-end tests
├── scripts/                     # Utility scripts
├── docs/                        # Documentation
└── assets/                      # Icons, splash screens
```

---

## 🏗️ Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher (repo uses npm)
- **Expo CLI**: `npm install -g expo-cli eas-cli`
- **Supabase CLI**: `npm install -g supabase`
- **Mobile**: Xcode (iOS) / Android Studio (Android)

---

## ⚙️ Local Setup

### 1. Clone & Install

```bash
git clone https://github.com/ritesh123malik/glassskin-app.git
cd glassskin-app
npm install --legacy-peer-deps
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your actual values
```

### 3. Start Local Supabase

```bash
npm install -g supabase
supabase start
supabase db push
psql -h localhost -p 54321 -U postgres -f supabase/seed.sql
```

### 4. Run the App

```bash
# Development (Expo Go)
npx expo start

# Native
npx expo run:ios
npx expo run:android
```

---

## 🔐 Environment Variables

### Client-Side (`EXPO_PUBLIC_*`)

| Variable | Description | Source |
|----------|-------------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase URL | Supabase Dashboard → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Supabase Dashboard → API |
| `EXPO_PUBLIC_USE_MOCKS` | Mock mode | `false` for production |
| `EXPO_PUBLIC_PROJECT_ID` | Expo project ID | expo.dev dashboard |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps key | Google Cloud |

### Server-Side (Edge Functions)

| Variable | Description | Source |
|----------|-------------|--------|
| `SUPABASE_URL` | Supabase URL | Same as client |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key | Supabase Dashboard → API |
| `STRIPE_SECRET_KEY` | Stripe secret | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Webhook secret | Stripe Dashboard |
| `PAYPAL_CLIENT_ID` | PayPal client ID | PayPal Developer |
| `PAYPAL_CLIENT_SECRET` | PayPal secret | PayPal Developer |
| `PAYPAL_ENV` | Environment | `sandbox` or `live` |

### EAS Secrets Setup

```bash
eas secret:create --name STRIPE_SECRET_KEY --value sk_live_...
eas secret:create --name PAYPAL_CLIENT_ID --value your-id
eas secret:create --name SUPABASE_SERVICE_ROLE_KEY --value your-key
```

---

## 🧪 Testing

```bash
# Unit + Integration tests
npm test
npm test -- --coverage

# E2E tests (Detox)
npm install -g detox-cli
npx detox build --configuration ios.simulator
npx detox test --configuration ios.simulator
```

> **Note**: Tests require dummy env vars. CI provides these automatically.

---

## 🚀 EAS Builds

```bash
# Development
eas build --profile development --platform all

# Preview
eas build --profile preview --platform all

# Production (gated)
eas build --profile production --platform all
```

---

## 🛠️ Admin Back Office

A Next.js 14 admin panel lives in the `admin/` directory.

```bash
cd admin
npm install
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

To reuse the mobile app Supabase values:

```bash
awk -F= '/^EXPO_PUBLIC_SUPABASE_URL=/{print "NEXT_PUBLIC_SUPABASE_URL="$2} /^EXPO_PUBLIC_SUPABASE_ANON_KEY=/{print "NEXT_PUBLIC_SUPABASE_ANON_KEY="$2}' .env > admin/.env.local
```

Access at `http://localhost:3001` after running.

---

## 📚 Documentation

| File | Description |
|------|-------------|
| `docs/BACKEND_SETUP.md` | Local Supabase setup |
| `docs/DESIGN_SYSTEM.md` | Glassmorphism design system |
| `docs/RELEASE_PROCESS.md` | Release process |
| `docs/SENTRY_MONITORING_SETUP.md` | Sentry setup |
| `docs/PUSH_NOTIFICATIONS_SETUP.md` | Push notifications |
| `docs/PRIVACY_DATA_SAFETY.md` | GDPR/CCPA |
| `docs/STORE_LISTING.md` | App store metadata |

---

> Built with ❤️ using Expo, React Native, and Supabase
