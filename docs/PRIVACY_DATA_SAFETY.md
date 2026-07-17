# App Privacy & Data Safety Mapping Guide

Use this guide when filling out the **App Store Privacy Questionnaire** (App Store Connect) and the **Data Safety Form** (Google Play Console). Mismatches between your answers and the app's actual behavior are a primary cause for rejection.

This document traces every data type collected to the actual code implementation in GLASSSKIN.

---

## 1. Data Collection Mapping

### Personal Info
- **Name:** Collected during signup (`auth.users`, `public.users`). 
  - **Purpose:** App Functionality, Personalization.
  - **Linked to User:** Yes.
- **Email Address:** Collected during signup and login. 
  - **Purpose:** App Functionality, Account Management, Developer Communications.
  - **Linked to User:** Yes.
- **Physical Address:** Collected during checkout (`orders.shipping_address`). 
  - **Purpose:** App Functionality (Fulfilling orders).
  - **Linked to User:** Yes.
- **Phone Number:** (Optional) Collected in user profile.
  - **Purpose:** App Functionality (Shipping contact).
  - **Linked to User:** Yes.

### Financial Info
- **Payment Info:** 
  - **Important:** We use `@stripe/stripe-react-native`. The app itself *does not* collect or store credit card numbers. 
  - **How to answer:** You must still declare that the app facilitates payments/purchases, but clarify that payment info is processed securely by a third-party gateway (Stripe) and not stored on your servers.

### User Content
- **Photos or Videos:** Users can upload photos for product reviews (`expo-image-picker` uploading to Supabase Storage).
  - **Purpose:** App Functionality, User Generated Content.
  - **Linked to User:** Yes.
- **Customer Support:** If users email support, their emails are retained (via Sentry crash logs or direct email).

### Purchases
- **Purchase History:** Collected and stored in `orders` and `order_items` tables.
  - **Purpose:** App Functionality (Order tracking), Analytics.
  - **Linked to User:** Yes.

### Identifiers
- **User IDs:** Supabase UUIDs are used to link data internally.
  - **Purpose:** App Functionality.
  - **Linked to User:** Yes.
- **Device IDs:** Expo Push Tokens are collected via `expo-notifications` for order updates.
  - **Purpose:** App Functionality (Push Notifications).
  - **Linked to User:** Yes.

### Diagnostics & Usage Data
- **Crash Data:** Collected via `@sentry/react-native`.
  - **Purpose:** Analytics, App Functionality (Bug fixing).
  - **Linked to User:** Yes (Sentry retains `user.email` for support tracing, but scrubs PII/passwords).
- **Product Interaction / Analytics:** Funnel metrics (Search, Add to Cart, View Product) collected via PostHog (`analytics.ts`).
  - **Purpose:** Analytics.
  - **Linked to User:** Yes.

---

## 2. Key Form Questions (And How to Answer Them)

### Q: Does your app collect or share any of the required user data types?
**A: Yes.** (See mapping above).

### Q: Is this data encrypted in transit?
**A: Yes.** All data is sent over HTTPS to Supabase, Stripe, Sentry, and PostHog. The app configuration enforces this (no cleartext exceptions are present in `app.json`).

### Q: Do you provide a way for users to request that their data be deleted?
**A: Yes.** The app contains a "Delete Account" button in the Profile screen that securely deletes the user from the database and anonymizes their orders via a backend Edge Function. 

### Q: Do you share data with third parties for their own marketing purposes?
**A: No.** Data is only shared with service providers (Stripe, Supabase, PostHog, Sentry) strictly to facilitate app functionality and internal analytics.

### Q: Do you use data for "Tracking" (as defined by Apple)?
**A: No.** PostHog and Sentry are used for first-party analytics and crash reporting. You are not linking data collected in GLASSSKIN with third-party data for targeted advertising, nor are you using a data broker. (Ensure PostHog is configured not to use cross-site tracking cookies).
