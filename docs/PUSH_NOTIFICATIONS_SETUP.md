# Push Notifications Configuration Guide

This document describes how to configure Apple Push Notification Service (APNs) for iOS and Firebase Cloud Messaging (FCM) for Android in the GLASSSKIN application using EAS.

---

## 1. Expo Application Configuration

Ensure your `app.json` contains appropriate configuration hooks under the `expo` object:

```json
{
  "expo": {
    "name": "GLASSSKIN",
    "slug": "temp-app",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6",
          "sounds": []
        }
      ]
    ]
  }
}
```

---

## 2. Setting Up Android (Firebase Cloud Messaging)

1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**. Name it `glassskin`.
2. Register an Android app using your package name (e.g. `com.ritesh.glassskin` or the name defined in `app.json`).
3. Download the `google-services.json` file and place it in the root directory of your project.
4. Add the local path configuration in `app.json`:
   ```json
   "android": {
     "googleServicesFile": "./google-services.json",
     "package": "com.ritesh.glassskin"
   }
   ```
5. Go to Project Settings -> Cloud Messaging in the Firebase Console and copy the **Server Key** or set up Firebase Cloud Messaging API (V1).
6. Link credentials using EAS CLI:
   ```bash
   eas credentials
   ```
   Select `Android` -> `production/development` -> Set FCM Server Key or upload service account JSON from Firebase.

---

## 3. Setting Up iOS (Apple Push Notification service)

1. You will need a paid **Apple Developer Account**.
2. Run EAS Credentials configuration:
   ```bash
   eas credentials
   ```
   Select `iOS` -> Log in to your Apple Developer Account.
3. EAS will automatically generate:
   - App ID with Push Notifications entitlement enabled.
   - APNs Key (`.p8` file) to authenticate push dispatches from Expo's servers to Apple.
4. If you prefer manual setup:
   - Go to [Apple Developer Portal](https://developer.apple.com/).
   - Generate an **Apple Push Notification service SSL Certificate** (Sandbox & Production) under Certificates, Identifiers & Profiles.
   - Upload the certificate or Key inside EAS Dashboard under credentials options.

---

## 4. Supabase Push Notification Dispatch

To dispatch push alerts from Edge Functions:
We call Expo's Push API endpoint `https://exp.host/--/api/v2/push/send` using the registered Expo Push Tokens stored inside `public.push_tokens`.

Request structure:
```bash
curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send -d '{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Order Shipped!",
  "body": "Your order GS-123456 is on its way!",
  "data": { "screen": "OrderTracking", "params": { "orderId": "GS-123456" } }
}'
```

---

## 5. EAS Secrets for Edge Functions

Do NOT commit any secrets. Configure them via EAS:

```bash
# Required by create-payment-intent and stripe-webhook
eas secret:create --scope project --name STRIPE_SECRET_KEY --value sk_live_...
eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value pk_live_...
eas secret:create --scope project --name STRIPE_WEBHOOK_SECRET --value whsec_...

# Required by paypal-checkout
eas secret:create --scope project --name PAYPAL_CLIENT_ID --value ...
eas secret:create --scope project --name PAYPAL_CLIENT_SECRET --value ...
eas secret:create --scope project --name PAYPAL_ENV --value sandbox
```

For Supabase Edge Functions, set secrets via the Supabase CLI:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set PAYPAL_CLIENT_ID=...
supabase secrets set PAYPAL_CLIENT_SECRET=...
supabase secrets set PAYPAL_ENV=sandbox
```

---

## 6. Supabase Database Webhook Setup (Order Notifications)

1. Go to **Supabase Dashboard → Database → Webhooks**.
2. Click **Create a new hook**.
3. Configure:
   - **Name**: `order-status-change`
   - **Table**: `public.orders`
   - **Events**: `UPDATE`
   - **Webhook URL**: `https://<your-project-ref>.supabase.co/functions/v1/send-order-notification`
   - **HTTP Headers**:
     - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
     - `Content-Type: application/json`
4. Click **Save**.

> [!TIP]
> Alternatively, the migration `20260716000400_notification_cron_and_triggers.sql` installs
> a PostgreSQL trigger using `pg_net` to call the Edge Function directly from the database.
> Use whichever approach matches your Supabase plan.

---

## 7. Supabase Cron for Abandoned Cart Reminders

Schedule the `abandoned-cart-reminder` function to run every 2 hours:

**Option A — Supabase Dashboard** (recommended):
1. Go to **Database → Scheduled Functions**.
2. Create a new schedule:
   - **Function URL**: `/functions/v1/abandoned-cart-reminder`
   - **Schedule**: `0 */2 * * *` (every 2 hours)
   - **Auth**: Service role token

**Option B — pg_cron** (if available on your plan):
```sql
SELECT cron.schedule(
  'abandoned-cart-reminder',
  '0 */2 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.edge_function_url') || '/abandoned-cart-reminder',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key')),
      body    := '{}'::jsonb
    );
  $$
);
```

The window and cooldown period are configurable via environment variables:
- `ABANDONED_CART_HOURS` — how long a cart must be inactive (default: `2`)
- `ABANDONED_CART_COOLDOWN_HOURS` — minimum gap between reminders per user (default: `24`)

---

## 8. Testing Push Notifications

### Using the Expo Push Notification Tool
1. Open https://expo.dev/notifications
2. Enter the Expo push token for your device (visible in the console log after login).
3. Set `data` to:
   ```json
   { "screen": "OrderTracking", "params": { "orderId": "GS-123456" } }
   ```
4. Send and verify the notification arrives, and tapping it opens the Order Tracking screen.

### Cold-Start Test
1. Force-kill the app.
2. Send a push via the Expo tool with `screen: "OrderTracking"`.
3. Tap the system notification.
4. The app should open directly to Order Tracking for the specified order ID.

### Preference Gate Test
1. Disable **Order Status Updates** in Profile → Settings.
2. Update an order's status to `shipped` in Supabase.
3. Verify no push is received — the `send-order-notification` function logs
   `"User has disabled order notifications — skipping"`.
