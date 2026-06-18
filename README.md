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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Database

Apply migrations in order from `supabase/migrations/`:

```bash
# Run each file in the Supabase dashboard SQL editor, or via CLI:
npx supabase db push
```

Regenerate types after any migration:

```bash
npx supabase gen types typescript --project-id zuxylgzmdyynmzsacaqk > lib/supabase/types.ts
```

> Install the `supabase` CLI first (`npm i -D supabase`). Otherwise `npx`'s "Ok to proceed?" prompt is
> written into `types.ts` and corrupts it (build fails "types.ts is not a module"). Recover with
> `git restore lib/supabase/types.ts`.

## Project Structure

```
coach-pro-saas/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages — no navbar/footer
│   │   ├── login/
│   │   ├── register/             # Institution admin signup
│   │   ├── signup/               # Student / coach signup
│   │   └── no-access/
│   ├── auth/callback/            # Supabase email confirmation handler
│   ├── dashboard/                # Protected — requires active institution cookie
│   └── layout.tsx / page.tsx     # Marketing site root
│
├── components/
│   ├── dashboard/                # Sidebar, mobile header, institution switcher
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
│   └── supabase/types.ts        # Generated DB types
│
├── supabase/
│   └── migrations/               # SQL migrations (apply in order)
│       ├── 001_foundation.sql              # institutions, profiles, members, allowlist
│       ├── 002_email_allowlist_check.sql
│       ├── 003_case_insensitive_email_linking.sql
│       ├── 003_institution_profile.sql     # category, address, contact, fee_config
│       ├── 004_institution_name_check.sql
│       ├── 005_coaches.sql                 # coaches extension table + RLS
│       ├── 006_students.sql                # students records table + RLS
│       ├── 007_student_fees.sql            # optional per-student monthly_fee + deposit (paise)
│       └── 008_student_login.sql           # institution code + auto student_code + student-code login
│
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
| 5 | Batch Management | 🔲 Pending |
| 6 | Calendar & Scheduling | 🔲 Pending |
| 7 | Fee Management | 🔲 Pending |
| 8 | SMS Notifications | 🔲 Pending |

See [`docs/README.md`](./docs/README.md) for detailed module docs.
