# CoachPro

Multi-tenant SaaS platform for coaching academies and institutions — sports academies, tuition centres, dance schools, and more.

## Tech Stack

- **Framework:** Next.js (App Router) · TypeScript
- **UI:** Tailwind CSS · shadcn/ui (base-nova)
- **Backend:** Supabase (PostgreSQL · Auth · Storage · RLS)
- **Deploy:** Vercel

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create a `.env.local` file at the project root:

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # client (safe to expose)
SUPABASE_SERVICE_ROLE_KEY=                # server only — auth.admin.* / RLS bypass
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Transactional email (Resend) — coach/student invites
RESEND_API_KEY=
EMAIL_FROM=

# Dev DB tooling (npm run db:*) — session/direct connection string (NOT the :6543 pooler)
DATABASE_URL=postgresql://postgres:<pwd>@<host>:5432/postgres

# Optional — fee cron + messaging providers (default to no-op/mock if unset)
CRON_SECRET=                              # bearer for /api/cron/generate-ledger
SMS_PROVIDER=                             # e.g. msg91 (unset = mock, logs only)
WHATSAPP_PROVIDER=                        # e.g. meta  (unset = mock, logs only)
```

### Database

Migrations live in `supabase/migrations/` (a consolidated baseline `001`…`007`,
applied in filename order). The repo ships a small dev runner (`scripts/db.mjs`)
that bundles and applies them via `psql` using `DATABASE_URL`:

```bash
npm run db:bundle    # regenerate supabase/rebuild_all.sql from migrations/ (no DB)
npm run db:rebuild   # bundle, then apply the full schema
npm run db:reset     # drop & recreate the public schema
npm run db:clear     # truncate every table, keep the schema
npm run db:fresh     # reset + rebuild — wipe and recreate in one go
```

> Needs the `psql` client on PATH. Alternatively paste `supabase/rebuild_all.sql`
> into the Supabase SQL editor by hand. See `supabase/migrations/README.md` for the
> baseline-vs-forward-only migration rules.

Regenerate types after any migration:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

> Install the `supabase` CLI first (`npm i -D supabase`). Otherwise `npx`'s "Ok to proceed?" prompt is
> written into `types.ts` and corrupts it (build fails "types.ts is not a module"). Recover with
> `git restore lib/supabase/types.ts`.

## Project Structure

```
coach-pro-saas/
│
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Marketing site — home, features, pricing, stories
│   ├── (auth)/                   # Auth pages — no navbar/footer
│   │   ├── login/                # email/password or student code
│   │   ├── register/             # Institution admin signup
│   │   ├── signup/               # Student / coach signup
│   │   ├── forgot-password/  reset-password/
│   │   └── no-access/
│   ├── auth/callback/            # Supabase email confirmation handler
│   ├── onboarding/               # 4-step first-run wizard (admin)
│   ├── api/                      # Route handlers (e.g. cron/generate-ledger)
│   ├── dashboard/                # Protected — sidebar branches on the active_role cookie
│   │   ├── settings/  coaches/  availability/  students/
│   │   ├── batches/  calendar/  fees/  sms/
│   │   └── account/  profile/
│   └── layout.tsx                # Root layout
│
├── components/
│   ├── dashboard/                # Sidebar, mobile header, AvailabilityEditor, etc.
│   ├── marketing/                # Navbar, Hero, Features, Pricing, etc.
│   └── ui/                       # shadcn/ui primitives
│
├── lib/
│   ├── client.ts                 # Supabase browser client
│   ├── server.ts                 # Supabase server client (SSR)
│   ├── admin.ts                  # Supabase service-role client (server only — auth.admin.*)
│   ├── requireRole.ts            # Per-page role guard (reads active_role cookie)
│   ├── planGuard.ts              # Free-tier plan limit enforcement
│   ├── constants.ts              # Categories, timezones, availability/colour, plan limits
│   ├── activeSession.ts          # Active institution/role cookie helpers
│   ├── calendar.ts               # Batch-occurrence + session calendar helpers (Module 6)
│   ├── fees.ts                   # Ledger generation / fee helpers (Module 7)
│   ├── email.ts                  # Resend transactional email (invites)
│   ├── notify.ts  student.ts     # Notification + student helpers
│   ├── messaging/                # Channel/provider-aware SMS + WhatsApp (Module 8)
│   └── supabase/types.ts         # Generated DB types
│
├── supabase/
│   ├── migrations/               # Consolidated baseline, applied in filename order
│   │   ├── 001_foundation.sql    # institutions, profiles, members, allowlist, RPCs, RLS
│   │   ├── 002_coaches.sql       # coaches extension table + RLS
│   │   ├── 003_students.sql      # students records (+ fees, parent_*, student-code login)
│   │   ├── 004_batches.sql       # batches + enrolment + schedule JSONB
│   │   ├── 005_sessions.sql      # 1-to-1 sessions (calendar)
│   │   ├── 006_fees.sql          # fee_ledger + fee_payments (paise)
│   │   └── 007_sms.sql           # sms_logs + per-institution templates
│   ├── rebuild_all.sql           # Generated bundle of all migrations (npm run db:bundle)
│   ├── reset_dev.sql  clear_dev.sql   # Dev helpers (drop+recreate / truncate)
│   └── migrations/README.md      # Baseline vs. forward-only migration rules
│
├── scripts/db.mjs                # Dev DB runner (npm run db:bundle|rebuild|reset|clear|fresh)
├── proxy.ts                      # Auth guard + routing (replaces middleware.ts)
│
└── docs/                         # Project documentation
    ├── README.md                 # Module index + architecture reference
    ├── guides/                   # Numbered module dev guides (markdown)
    │   ├── 00-marketing-site.md
    │   ├── 01-foundation-and-auth.md
    │   ├── 02-tenant-academy-setup.md
    │   └── … 03–08
    ├── prd/                      # Product Requirements Documents (v1–v3)
    ├── hld/                      # High Level Design documents
    └── design/                   # Branding and pitch deck PDFs
```

## Module Roadmap

| # | Module | Status |
|---|---|---|
| 0 | Marketing Site | 🚧 In Progress |
| 1 | Foundation & Auth | 🚧 In Progress |
| 2 | Academy Onboarding & Settings | ✅ Done |
| 3 | Coach Management | ✅ Done |
| 4 | Student Management | ✅ Done |
| 5 | Batch Management | ✅ Done |
| 6 | Calendar & Scheduling | ✅ Done |
| 7 | Fee Management | ✅ Done |
| 8 | SMS Notifications | ✅ Done |

See [`docs/README.md`](./docs/README.md) for detailed module docs.
