# Module 1 — Foundation & Auth

**Status:** `🚧 In Progress`
**Priority:** 1 of 8 — must be completed first; all other modules depend on it
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

- Next.js 16 project scaffold with TypeScript, Tailwind, shadcn/ui
- Supabase project wired up with typed client helpers
- Core database tables (`institutions`, `profiles`, `institution_members`, `institution_allowed_emails`) with RLS
- Supabase Storage buckets provisioned
- Institution registration, student self-signup, and login pages
- Institution chooser modal (shown when user belongs to multiple institutions)
- `proxy.ts` — auth guard + routing (replaces `middleware.ts`)
- GitHub Actions CI pipeline (lint + typecheck)
- Vercel project connected to repo

---

## Database Tables

### `institutions`

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | auto-generated |
| `name` | `TEXT NOT NULL UNIQUE` | Globally unique institution name |
| `slug` | `TEXT UNIQUE NOT NULL` | URL-friendly name, e.g. `tigers-academy` |
| `logo_url` | `TEXT` | Supabase Storage public URL |
| `category` | `TEXT` | Academy type (e.g. `cricket`, `multi-activity`) |
| `address` | `TEXT` | Full address |
| `contact_email` | `TEXT` | Public contact email |
| `contact_mobile` | `TEXT` | Public contact mobile (E.164) |
| `programs` | `TEXT[]` | e.g. `['cricket', 'football']` |
| `timezone` | `TEXT DEFAULT 'Asia/Kolkata'` | |
| `plan` | `TEXT DEFAULT 'free'` | `free` \| `pro` \| `enterprise` |
| `sms_credits` | `INT DEFAULT 0` | |
| `working_hours` | `JSONB DEFAULT '{}'` | `{ mon: [{start, end}], ... }` |
| `fee_config` | `JSONB DEFAULT '{}'` | Fee rules (grace period, late-fee penalty, payment modes) |
| `onboarding_complete` | `BOOL DEFAULT false` | triggers wizard on first login |
| `code` | `TEXT UNIQUE` | auto-generated academy code (e.g. `MVA`); prefixes every student code |
| `student_seq` | `INT DEFAULT 0` | atomic per-institution counter; bumped by `next_student_code()` |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

### `profiles`

Global user record — one per person regardless of how many institutions they belong to.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | mirrors `auth.users.id` exactly |
| `email` | `TEXT NOT NULL` | |
| `full_name` | `TEXT` | |
| `mobile` | `TEXT` | E.164 format |
| `avatar_url` | `TEXT` | |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

No `institution_id` or `role` here — those live in `institution_members`.

### `institution_members`

Join table linking users to institutions. A user can appear multiple times (once per institution).

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | auto-generated |
| `institution_id` | `UUID FK → institutions` | |
| `user_id` | `UUID FK → profiles` | |
| `role` | `TEXT NOT NULL` | `admin` \| `coach` \| `student` |
| `status` | `TEXT DEFAULT 'active'` | `active` \| `inactive` |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

**Unique constraint:** `(institution_id, user_id)`

### `institution_allowed_emails`

Admin pre-approves emails before a student or coach can self-sign-up. Gate-keeps who can join.

| Column | Type | Notes |
|---|---|---|
| `id` | `UUID PK` | auto-generated |
| `institution_id` | `UUID FK → institutions` | |
| `email` | `TEXT NOT NULL` | |
| `role` | `TEXT NOT NULL` | `student` \| `coach` — role to assign on signup |
| `added_by` | `UUID FK → profiles` | the admin who added this entry |
| `status` | `TEXT DEFAULT 'pending'` | `pending` \| `joined` |
| `created_at` | `TIMESTAMPTZ DEFAULT now()` | |

**Unique constraint:** `(institution_id, email)` — same email cannot be added twice to the same institution.

### RLS Policy Pattern (apply to every table, always)

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

-- Users can only access rows belonging to institutions they are a member of
CREATE POLICY institution_isolation ON <table>
  USING (
    institution_id IN (
      SELECT institution_id FROM institution_members
      WHERE user_id = auth.uid()
    )
  );
```

### DB Triggers

**Trigger 1 — Institution admin signup**

On insert into `auth.users` with `raw_user_meta_data->>'signup_type' = 'institution_admin'`:
- Creates `profiles` row
- Creates `institutions` row (name + slug from metadata)
- Creates `institution_members` row with `role = 'admin'`

**Trigger 2 — Student / coach self-signup**

On insert into `auth.users` with `raw_user_meta_data->>'signup_type' = 'student'`:
- Creates `profiles` row
- Queries `institution_allowed_emails WHERE email = new user's email AND status = 'pending'`
- For each matching row: inserts into `institution_members` with the pre-set role, updates `institution_allowed_emails.status = 'joined'`
- If no match: profile is created but user has no institution (shown a "no access" page after login)

**Admin adds an existing user (immediate link)**

Handled in the app (not a trigger). When admin adds an email:
- Check if email already exists in `profiles`
- If **yes** → insert directly into `institution_members` + insert into `institution_allowed_emails` with `status = 'joined'`
- If **no** → insert into `institution_allowed_emails` with `status = 'pending'` (trigger handles linking when they sign up)

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
NEXT_PUBLIC_SUPABASE_URL                  # Client + Server
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY      # Client (safe to expose) — NOT ANON_KEY
SUPABASE_SERVICE_ROLE_KEY                 # Server only — NEVER in client code
SMS_GATEWAY_API_KEY                       # Server only (Module 8)
SMS_GATEWAY_SENDER_ID                     # Server only (Module 8)
SMS_WEBHOOK_SECRET                        # Server only (Module 8)
```

---

## Pages & Routes

| Route | File | Description |
|---|---|---|
| `/register` | `app/(auth)/register/page.tsx` | New institution registration (admin) |
| `/login` | `app/(auth)/login/page.tsx` | Email **or student code** + password login |
| `/signup` | `app/(auth)/signup/page.tsx` | Student / coach self-signup |
| `/no-access` | `app/(auth)/no-access/page.tsx` | Shown when user has no institution |

---

## Institution Admin Registration Flow

1. Admin fills: Institution Name (unique-checked live) · Full Name · Email · Mobile · Institution Type (category)
2. `supabase.auth.signUp()` called with `options.data = { signup_type: 'institution_admin', institution_name, slug }`
3. DB trigger fires → creates `institutions` row + `profiles` row + `institution_members` row (`role = 'admin'`)
4. Redirect to onboarding wizard (Module 2)

---

## Student Self-Signup Flow

1. Student fills: Full Name · Email · Password
2. `supabase.auth.signUp()` called with `options.data = { signup_type: 'student' }`
3. DB trigger fires → creates `profiles` row → checks `institution_allowed_emails`
   - Match found → creates `institution_members` row(s), updates status to `joined`
   - No match → profile created, no institution linked
4. Redirect to `/login` to sign in

---

## Login Flow

1. User enters **email or student code** + password. An identifier without `@` is treated as a student
   code and mapped to its synthetic email (`studentLoginEmail()`) before `supabase.auth.signInWithPassword()`
   — see [Module 4 — Student-Code Login](./04-student-management.md#student-code-login--migration-008)
2. App queries `institution_members WHERE user_id = auth.uid()`
3. **0 institutions** → redirect to `/no-access`
4. **1 institution** → store `active_institution_id` + `active_role` in cookie → redirect to `/(dashboard)`
5. **2+ institutions** → show "Choose Institution" modal:
   - Lists each institution with name and user's role in it
   - User picks one → store `active_institution_id` + `active_role` in cookie → redirect to `/(dashboard)`

### Institution Switcher (post-login)

A switcher in the app navbar allows switching institutions without re-logging in:
- Click institution name → dropdown lists all the user's institutions
- Pick another → update `active_institution_id` cookie → page reloads scoped to new institution

### Active Institution Session

```ts
// Stored in a secure httpOnly cookie via middleware
active_institution_id: string  // UUID of chosen institution
active_role: 'admin' | 'coach' | 'student'
```

Every server component, route handler, and API call reads `active_institution_id` from the cookie to scope queries.

---

## Auth Guard (`proxy.ts`)

Runs on every request. Executes in this order:

1. Read JWT from cookie → decode user
2. If no valid session → redirect to `/login`
3. Read `active_institution_id` from cookie
4. If cookie missing → query `institution_members` count for user:
   - 0 → redirect to `/no-access`
   - 1 → auto-set cookie and continue
   - 2+ → redirect to `/login` (triggers institution chooser)
5. Verify user is still an active member of `active_institution_id` (guard against removal)
6. Read `active_role` from cookie → inject into request headers for downstream use
7. Route by role:
   - `admin` → allow `/(admin)/**`
   - `coach` → allow `/(coach)/**`
   - `student` → allow `/(student)/**`

---

## Supabase Client Helpers

**`lib/server.ts`** — Server Components, Route Handlers, middleware:
```ts
import { createServerClient } from '@supabase/ssr'
// reads cookies from Next.js request
```

**`lib/client.ts`** — Client Components only:
```ts
import { createBrowserClient } from '@supabase/ssr'
```

**`lib/supabase/types.ts`** — Generated via Bash (not PowerShell — PowerShell writes UTF-16+BOM):
```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
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

- [x] Next.js project scaffolded and runs locally
- [x] Tailwind + shadcn/ui initialised
- [x] `.env.local` populated with Supabase keys
- [x] Migration `001_foundation.sql` applied to Supabase project
- [x] `institutions`, `profiles`, `institution_members`, `institution_allowed_emails` tables exist with RLS enabled
- [x] Unique constraint on `institutions.name` (globally unique)
- [x] Unique constraint on `(institution_id, email)` in `institution_allowed_emails`
- [x] Unique constraint on `(institution_id, user_id)` in `institution_members`
- [x] DB trigger — institution admin signup creates institution + profile + member row
- [x] DB trigger — student signup checks allowed emails and links to institutions
- [x] Admin add-existing-user flow immediately inserts into `institution_members` (via `link_user_to_institution` RPC)
- [ ] Storage buckets created (`academy-logos`, `profile-photos`, `receipts`)
- [x] `/register` page creates institution + admin profile
- [ ] `/signup` page creates student profile and auto-links via trigger
- [x] `/login` page signs in, queries institution count, redirects correctly
- [x] Institution chooser shown when user belongs to 2+ institutions
- [x] `/no-access` page shown when user has 0 institutions
- [x] `active_institution_id` + `active_role` stored in httpOnly cookie after institution selection
- [ ] Institution switcher in navbar updates active institution without re-login
- [ ] `proxy.ts` blocks unauthenticated access
- [ ] Auth guard validates user is still a member of `active_institution_id`
- [ ] Role-based routing works (admin / coach / student route groups)
- [x] Supabase typed client helpers (`lib/server.ts`, `lib/client.ts`, `lib/supabase/types.ts`)
- [ ] GitHub Actions CI passes on a test PR
- [ ] Vercel project connected and preview deploy works

---

## Depends On

Nothing — this is the foundation.

## Unlocks

[Module 2 — Tenant & Academy Setup](./02-tenant-academy-setup.md)
