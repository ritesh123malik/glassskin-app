# Local Backend Setup Guide (Supabase)

This document guides you through running a local instance of the Supabase backend for GLASSSKIN, applying migrations, running the seed script, and configuring your environment variables.

## Prerequisites

1. **Docker**: Since the Supabase CLI orchestrates database and API services inside containerized environments, you must have **Docker Desktop** installed and running on your machine.
   - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **Node.js**: Ensure you are using Node.js 18+ (LTS).

---

## 1. Start the Supabase Server

Run the following command from the root of the project to download the local Supabase docker images and spin up the database and services:

```bash
npx supabase start
```

*Note: This might take a few minutes on the first run as Docker images are downloaded.*

Once the startup completes successfully, it will print your local configuration credentials to the console:

```text
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Configure Environment Variables

1. Copy the template `.env.example` to create your active `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in the `anon key` you copied from the console output above:
   ```env
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. Configure the `EXPO_PUBLIC_SUPABASE_URL` depending on where you are running the app:
   - **iOS Simulator**: `http://127.0.0.1:54321` (default)
   - **Android Emulator**: `http://10.0.2.2:54321` (maps to your host machine's localhost)
   - **Web Browser / Expo Web**: `http://localhost:54321`

---

## 3. Database Migrations & Seeding

- **Automatic Application**: When running `supabase start`, the CLI automatically applies the schema migrations in `supabase/migrations/` and executes the seed data script in `supabase/seed.sql`.
- **Manual Reset**: If you need to wipe and reset the local database back to its seeded state (e.g. to test clean order flows), run:
  ```bash
  npx supabase db reset
  ```

---

## 4. Local Seed Data & Testing Accounts

The database is seeded with a default set of products, initial reviews, and pre-configured test users.

### Developer Accounts (Auth & Profiles)
You can log in to these accounts in the app. The password for all seeded accounts is **`password123`**:

- **Guest User** (used for guest checkout):
  - Email: `guest@glassskin.com`
- **Seeded Review Authors**:
  - Email: `jane.doe@example.com`
  - Email: `emily.smith@example.com`
  - Email: `sophia.loren@example.com`
  - Email: `olivia.martinez@example.com`

### Admin Console (Supabase Studio)
You can view the tables, rows, auth users, and execute raw SQL queries through the local Supabase Studio in your web browser:
- **Studio URL**: [http://127.0.0.1:54323](http://127.0.0.1:54323)
