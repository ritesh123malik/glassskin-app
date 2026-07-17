# Sentry & Analytics Monitoring Integration Guide

This guide details the setup and configuration of the production monitoring stack implemented in GLASSSKIN.

---

## 1. Sentry Crash Reporting (`@sentry/react-native`)

We use Sentry for error tracking, crash reporting, and performance monitoring. Sentry is initialized at the root of the app in [App.tsx](file:///Users/ritesh/Downloads/Mobile shopping app with-PRD-Package/App.tsx) and wrapped using the `Sentry.wrap` helper.

### Centralized PII & Payment Data Scrubbing
Sentry is configured with a strict, central `beforeSend` interceptor to scrub sensitive information. No card details, tokens, or auth headers are ever sent to Sentry:
- **Credit Cards**: A 16-digit credit card number regex replaces occurrences of PANs with `[REDACED_PAN]`.
- **Authorization Headers**: HTTP headers such as `Authorization`, `apikey`, `cookie` are replaced with `[SCRUBBED]`.
- **Bearer Tokens**: Any strings matching `"Bearer "` are redacted.
- **PII Scrubbing**: Recursive object sanitization intercepts keys containing `password`, `cvv`, `cvc`, `token`, `secret`, `key`, and values are overwritten with `[SCRUBBED_PII]`.
- **User Email Retention**: We explicitly retain `user.email` in Sentry context to allow support representatives to trace user session errors, but strip password metadata.

### Global Error Boundary
We wrap the application root in `Sentry.ErrorBoundary` which intercepts react component crashes, logs them to Sentry, and displays a premium Glassmorphic recovery/reload screen instead of rendering a blank crash screen.

### Stack Trace Source Maps upload
Source map generation is handled automatically using Sentry's Expo config plugin (`@sentry/react-native` in `app.json`). During EAS build processes, the plugin generates and uploads bundle source maps and debug symbols so stack traces are symbolicated and readable.

---

## 2. Analytics & funnels Abstraction (`analytics.ts`)

We choose **PostHog** as the underlying analytics provider over the legacy "Expo Analytics" segment/amplitude integrations:
- **Funnels Tracking**: PostHog supports rich behavioral funnel metrics (e.g. Add-to-Cart -> Purchase conversions) essential for e-commerce.
- **Privacy Controls**: Native opt-out and scrubbing out-of-the-box.
- **Sentry Integration**: Links analytics events and sessions to Sentry errors.

### Usage API
Call sites import `analytics` from [analytics.ts](file:///Users/ritesh/Downloads/Mobile shopping app with-PRD-Package/src/services/analytics.ts) without tying code directly to PostHog:

```typescript
import { analytics } from '../../services/analytics';

// Track screen navigation
analytics.trackScreenView('Cart');

// Track e-commerce funnels
analytics.trackSearch('Cleanser');
analytics.trackFilter({ category: 'Skincare' });
analytics.trackAddToCart(productId, name, qty, price);
analytics.trackCheckoutStep(1, 'Shipping Address Completed');
analytics.trackPaymentAttempt('Stripe', amount);
analytics.trackPurchase(orderId, total, itemsCount);
```

### Funnel Correlation Breadcrumbs
Every critical funnel event (e.g. `trackAddToCart`, `trackPaymentAttempt`, `trackPurchase`) automatically inserts a structured **Sentry breadcrumb** in Sentry's scope. If a user's purchase fails due to a network error or crash, Sentry logs the exact sequence of funnel steps leading up to the error.

---

## 3. Dev Test Instructions

To verify Sentry and Analytics in local development:
1. Ensure your `.env` contains:
   ```env
   EXPO_PUBLIC_SENTRY_DSN=https://your-dsn-key@sentry.io/project
   ```
2. Trigger a dev build crash by calling `throw new Error('Dev test error')` anywhere in a screen.
3. Observe Sentry dashboard:
   - Check the event payload is free of passwords, raw tokens, or payment PAN details.
   - Trace the exact navigation and purchase breadcrumbs leading up to the crash event.
