# Module 1 — Foundation & Auth

**Status:** `📋 In Review`
**Priority:** 1 of 8 — must be completed first; all other modules depend on it
**Back to index:** [Docs/README.md](./README.md)

---

## What This Module Delivers

- Next.js 14 project scaffold with TypeScript, Tailwind, shadcn/ui
- Supabase project wired up with typed client helpers
- Core database tables (`tenants`, `profiles`) with RLS
- Supabase Storage buckets provisioned
- Login, Signup, and Coach Invite pages
- `middleware.ts` — auth guard + role-based routing + tenant injection
- GitHub Actions CI pipeline (lint + typecheck)
- Vercel project connected to repo

---

## Database Tables

### `tenants`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID` PK | auto-generated |
| `name` | `TEXT NOT NULL` | Academy display name |
| `subdomain` | `TEXT UNIQUE NOT NULL` | URL slug, e.g. `tigers` |
| `logo_url` | `TEXT` | Supabase Storage public URL |
| `sports` | `TEXT[]` | e.g. `['cricket', 'football']` |
| `timezone` | `TEXT DEFAULT 'Asia/Kolkata'` | |
| `plan` | `TEXT DEFAULT 'free'` | `free` \| `pro` \| `enterprise` |
| `sms_credits` | `INT DEFAULT 0` | |
| `working_hours` | `JSONB` | `{ mon: [{start, end}], ... }` |
| `onboarding_complete` | `BOOL DEFAULT false` | triggers wizard on first login |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | mirrors `auth.users.id` exactly |
| `tenant_id` | `UUID FK → tenants` | |
| `role` | `TEXT NOT NULL` | `admin` \| `coach` \| `parent` \| `super_admin` |
| `full_name` | `TEXT` | |
| `mobile` | `TEXT` | E.164 format |
| `avatar_url` | `TEXT` | |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `inactive` |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### RLS Policy (apply to every table, always)

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON <table>
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```

### DB Trigger — Auto-create profile on signup

On insert into `auth.users` → create a `tenants` row + a `profiles` row with `role = 'admin'`.

---

## Storage Buckets

| Bucket | Access | Used by |
|---|---|---|
| `academy-logos` | Public read | Tenant branding |
| `profile-photos` | Signed URL | Coach / student photos |
| `receipts` | Signed URL | PDF fee receipts (Module 7) |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL          # Client + Server
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Client (safe to expose)
SUPABASE_SERVICE_ROLE_KEY         # Server only — NEVER in client code
SMS_GATEWAY_API_KEY               # Server only (Module 8)
SMS_GATEWAY_SENDER_ID             # Server only (Module 8)
SMS_WEBHOOK_SECRET                # Server only (Module 8)
```

---

## Pages & Routes

| Route | File | Description |
|---|---|---|
| `/signup` | `app/(auth)/signup/page.tsx` | New academy registration |
| `/login` | `app/(auth)/login/page.tsx` | Email + password login |
| `/invite/[token]` | `app/(auth)/invite/[token]/page.tsx` | Coach sets password via invite link |

---

## Signup Flow

1. Admin fills: Academy Name · Email · Mobile · Primary Sport
2. `supabase.auth.signUp()` → creates `auth.users` row
3. DB trigger fires → creates `tenants` row + `profiles` row (`role = 'admin'`)
4. Redirect to onboarding wizard (Module 2)

---

## Middleware (`middleware.ts`)

Runs on every request. Executes in this order:

1. Read JWT from cookie → decode user
2. If no valid session → redirect to `/login`
3. Look up `profiles.role` for the authenticated user
4. Route by role:
   - `admin` → allow access to `/(admin)/**`, redirect `/coach/**` → `/dashboard`
   - `coach` → allow access to `/(coach)/**`, redirect `/dashboard` → `/coach/calendar`
5. Read `Host` header → extract subdomain → look up tenant → inject `tenant_id` into request headers

---

## Supabase Client Helpers

**`lib/supabase/server.ts`** — Server Components, Route Handlers, middleware:
```ts
import { createServerClient } from '@supabase/ssr'
// reads cookies from Next.js request
```

**`lib/supabase/client.ts`** — Client Components only:
```ts
import { createBrowserClient } from '@supabase/ssr'
```

**`lib/supabase/types.ts`** — Generated via:
```bash
npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
```

---

## CLI Commands (in order)

```bash
# 1. Scaffold
npx create-next-app@latest coachpro --typescript --tailwind --app --eslint
cd coachpro

# 2. Component library
npx shadcn@latest init

# 3. Supabase
npm install @supabase/supabase-js @supabase/ssr

# 4. Apply first migration
npx supabase db push   # or run SQL in Supabase dashboard

# 5. Generate types
npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
```

---

## CI/CD

**`.github/workflows/ci.yml`** — runs on every push and PR:
```yaml
jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
```

Merge to `main` is blocked if either check fails.

---

## Completion Checklist

- [ ] Next.js project scaffolded and runs locally
- [ ] Tailwind + shadcn/ui initialised
- [ ] `.env.local` populated with Supabase keys
- [ ] Migration `001_foundation.sql` applied to Supabase project
- [ ] `tenants` and `profiles` tables exist with RLS enabled
- [ ] DB trigger creates profile on signup
- [ ] Storage buckets created
- [ ] `/signup` page creates a tenant + profile
- [ ] `/login` page signs in and redirects by role
- [ ] `/invite/[token]` page allows coach to set password
- [ ] `middleware.ts` blocks unauthenticated access
- [ ] Role-based redirect works (admin → `/dashboard`, coach → `/coach/calendar`)
- [ ] Supabase typed client helpers in `lib/supabase/`
- [ ] GitHub Actions CI passes on a test PR
- [ ] Vercel project connected and preview deploy works

---

## Depends On

Nothing — this is the foundation.

## Unlocks

[Module 2 — Tenant & Academy Setup](./02-tenant-academy-setup.md)
