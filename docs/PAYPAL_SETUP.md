# PayPal Setup

PayPal checkout is implemented with a mobile WebView flow plus Edge Functions.

## Required Secrets

Set these in Supabase Edge Function secrets:

```bash
supabase secrets set PAYPAL_CLIENT_ID=...
supabase secrets set PAYPAL_CLIENT_SECRET=...
supabase secrets set PAYPAL_ENV=sandbox
supabase secrets set PAYPAL_WEBHOOK_ID=...
```

Use `PAYPAL_ENV=live` only after sandbox checkout and webhook verification pass.

## Local Edge Function Run

The mobile app calls `supabase.functions.invoke('paypal-checkout/create')` and
`supabase.functions.invoke('paypal-checkout/capture')`. A
`FunctionsFetchError` means the Edge Function endpoint is not reachable from the
configured `EXPO_PUBLIC_SUPABASE_URL`, or the function was not deployed/running.

For local development:

```bash
cd "/Users/ritesh/Downloads/Mobile shopping app with-PRD-Package"
npx supabase start
npx supabase db reset
cp supabase/functions/.env.example supabase/functions/.env.local
# Fill supabase/functions/.env.local with the local service role key from `npx supabase start`
# and PayPal sandbox credentials.
npx supabase functions serve paypal-checkout --env-file supabase/functions/.env.local
```

In a second terminal, point Expo at local Supabase:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321 \
EXPO_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key-from-supabase-start> \
EXPO_PUBLIC_USE_MOCKS=false \
npx expo start --web --clear --port 8089
```

For hosted Supabase:

```bash
npx supabase functions deploy paypal-checkout
npx supabase functions deploy paypal-webhook
supabase secrets set PAYPAL_CLIENT_ID=...
supabase secrets set PAYPAL_CLIENT_SECRET=...
supabase secrets set PAYPAL_ENV=sandbox
supabase secrets set PAYPAL_WEBHOOK_ID=...
```

## Functions

- `paypal-checkout/create` creates a PayPal order after verifying the caller owns the GLASSSKIN order.
- `paypal-checkout/capture` captures the PayPal order and confirms payment.
- `paypal-webhook` verifies PayPal signatures, logs events, and confirms or fails matching orders.

## Sandbox Test

1. Create a pending PayPal order from checkout.
2. Complete payment with a PayPal sandbox buyer.
3. Confirm the GLASSSKIN order transitions from `payment_pending` to `processing`.
4. Confirm a row appears in `paypal_webhook_events`.
