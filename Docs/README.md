# CoachPro — Feature Documentation

Multi-tenant academy & class management SaaS (sports, tuition, dance, music, and more). This index is the single entry point for all feature docs.
Navigate to any module below for implementation details, API contracts, and status.

---

## Status Legend

| Badge | Meaning |
|---|---|
| `🔲 Pending` | Not yet started — waiting in queue |
| `📋 In Review` | Spec / design being reviewed before dev begins |
| `🚧 In Progress` | Actively being developed |
| `✅ Done` | Development + testing complete |

---

## Module Index (Development Priority Order)

| # | Module | Status | Doc |
|---|---|---|---|
| 0 | Marketing Site | `🚧 In Progress` | [→ details](./guides/00-marketing-site.md) |
| 1 | Foundation & Auth | `🚧 In Progress` | [→ details](./guides/01-foundation-and-auth.md) |
| 2 | Academy Onboarding & Settings | `✅ Done` | [→ details](./guides/02-tenant-academy-setup.md) |
| 3 | Coach Management | `✅ Done` | [→ details](./guides/03-coach-management.md) |
| 4 | Student Management | `✅ Done` | [→ details](./guides/04-student-management.md) |
| 5 | Batch Management | `✅ Done` | [→ details](./guides/05-batch-management.md) |
| 6 | Calendar & Scheduling | `✅ Done` | [→ details](./guides/06-calendar-scheduling.md) |
| 7 | Fee Management | `🔲 Pending` | [→ details](./guides/07-fee-management.md) |
| 8 | SMS Notifications | `🔲 Pending` | [→ details](./guides/08-sms-notifications.md) |

> Module 0 (Marketing Site) is independent and can be built in parallel with Module 1.
> Modules 1–8 must be completed in sequence — each depends on the one before it.

---

## Architecture Quick Reference

| Decision | Rule |
|---|---|
| Multi-tenancy | Every tenant table has `institution_id` + Supabase RLS (via `get_my_institution_ids()` / `is_admin_of()` helpers) — no app-level filtering needed |
| Money | Stored as `INT` in **paise** (1 INR = 100 paise), never floats |
| Auth → Role | Role lives in `institution_members.role` (not `profiles`); the active role is held in the httpOnly `active_role` cookie. One `/dashboard` route group — the sidebar branches on role |
| Student login | Opt-in per student: a globally-unique **student code** (`MVA0007`) maps to a synthetic Supabase Auth email — login with code + password, no custom auth. Created via the service-role client (`lib/admin.ts`). See Module 4 |
| Batch occurrences | Computed on-the-fly from schedule, not stored as rows (Phase 2) |
| SMS gateway | Pluggable via env var — default MSG91 |
| Plan limits | Enforced server-side by `planGuard()` — Free: 15 students, 2 batches, 1 coach |

---

## Tech Stack

- **Frontend:** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · shadcn/ui (base-nova / @base-ui/react)
- **Backend:** Next.js Server Actions · Supabase RPCs (route handlers added per-need)
- **Database:** Supabase PostgreSQL · Row Level Security
- **Auth:** Supabase Auth (email/password) — admins/coaches via an email allowlist + signup trigger; **students via an opt-in student code** mapped to a synthetic email (no custom auth)
- **Storage:** Supabase Storage (logos · photos · PDF receipts)
- **Deploy:** Vercel (CI/CD · preview deploys · cron jobs)
- **SMS:** MSG91 (swappable via `SMS_GATEWAY` env var)

---

## Repository Structure

```
app/
  (marketing)/           home, features, pricing, stories, how-it-works
  (auth)/                login  register  signup  forgot/reset-password  no-access
  auth/callback/         Supabase email-confirmation handler
  onboarding/            4-step first-run wizard (admin)
  dashboard/             one protected group; sidebar branches on the active_role cookie
    settings/  coaches/  coaches/[id]/  availability/  students/  students/[id]/
    batches/  calendar/  fees/  account/  profile/
components/
  dashboard/             sidebar, mobile header, AvailabilityEditor
  marketing/  ui/
lib/
  server.ts  client.ts  admin.ts  types.ts (supabase/)
  requireRole.ts  planGuard.ts  constants.ts  utils.ts
proxy.ts                 auth guard + routing (replaces middleware.ts)
supabase/migrations/     001 … 007 (apply in order); reset_dev.sql / clear_dev.sql dev helpers
docs/
  README.md              ← you are here
  guides/                ← numbered module dev guides
  prd/                   ← product requirements documents
  hld/                   ← high level design documents
  design/                ← branding and pitch deck
```

> **Conventions:** server actions read the institution from the httpOnly `active_institution_id`
> cookie (never form fields); money is stored in paise; root guard is `proxy.ts` (not `middleware.ts`).
> Each module guide leads with an architecture note where the real schema differs from the generic spec.
