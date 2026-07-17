# Admin Setup

The admin back office lives in `admin/` and uses the same Supabase project as the mobile app.

## Local Run

```bash
cd admin
npm install
cp .env.local.example .env.local
npm run dev
```

Open `http://localhost:3001`.

If you already configured the mobile app `.env`, generate the admin env from it:

```bash
cd "/Users/ritesh/Downloads/Mobile shopping app with-PRD-Package"
awk -F= '/^EXPO_PUBLIC_SUPABASE_URL=/{print "NEXT_PUBLIC_SUPABASE_URL="$2} /^EXPO_PUBLIC_SUPABASE_ANON_KEY=/{print "NEXT_PUBLIC_SUPABASE_ANON_KEY="$2}' .env > admin/.env.local
```

For local Supabase after `npx supabase db reset`, the seeded admin login is:

```text
Email: admin@glassskin.com
Password: password123
```

For a hosted Supabase project, create a real Supabase Auth user first, then set
that user's `public.users.role` to `admin`. Do not rely on the local seed
password in production.

## Access Model

Admins are normal Supabase Auth users with `public.users.role = 'admin'`. The admin UI uses the public anon key and the logged-in user's JWT. It does not use the service role key in the browser.

To grant access, create the user in Supabase Auth, then update the linked `public.users` row:

```sql
update public.users
set role = 'admin'
where email = 'admin@example.com';
```

## Security Checks

- Product, order, user, promo, notification, and webhook admin access is controlled by RLS through `public.is_admin()`.
- Service-role keys are only for Edge Functions and CI/server environments.
- Revoke admin access by setting `role = 'customer'`.
