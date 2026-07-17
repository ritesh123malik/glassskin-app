# Social Login Setup

GLASSSKIN supports Supabase OAuth for Google and Apple.

## Redirect URLs

Add these URLs in Supabase Auth provider settings:

```text
glassskin://auth-callback
exp://127.0.0.1:8081/--/auth-callback
```

Use the Expo development URL that matches your local device or simulator when testing through Expo Go.

## Providers

Google:
- Configure OAuth consent in Google Cloud.
- Add the Supabase callback URL shown in Supabase Auth > Providers > Google.
- Enable Google in Supabase.

Apple:
- Configure Sign in with Apple in Apple Developer.
- Add the Supabase callback URL shown in Supabase Auth > Providers > Apple.
- Enable Apple in Supabase.

## Account Linking Policy

Supabase links identities by verified email when provider settings allow it. If an OAuth email matches an existing password account, treat the provider login as the same customer identity and preserve cart/order history.
