# CoachPro — Feature Documentation

Multi-tenant sports academy SaaS. This index is the single entry point for all feature docs.
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
| 0 | Marketing Site | `🔲 Pending` | [→ details](./guides/00-marketing-site.md) |
| 1 | Foundation & Auth | `🚧 In Progress` | [→ details](./guides/01-foundation-and-auth.md) |
| 2 | Academy Onboarding & Settings | `🔲 Pending` | [→ details](./guides/02-tenant-academy-setup.md) |
| 3 | Coach Management | `🔲 Pending` | [→ details](./guides/03-coach-management.md) |
| 4 | Student Management | `🔲 Pending` | [→ details](./guides/04-student-management.md) |
| 5 | Batch Management | `🔲 Pending` | [→ details](./guides/05-batch-management.md) |
| 6 | Calendar & Scheduling | `🔲 Pending` | [→ details](./guides/06-calendar-scheduling.md) |
| 7 | Fee Management | `🔲 Pending` | [→ details](./guides/07-fee-management.md) |
| 8 | SMS Notifications | `🔲 Pending` | [→ details](./guides/08-sms-notifications.md) |

> Module 0 (Marketing Site) is independent and can be built in parallel with Module 1.
> Modules 1–8 must be completed in sequence — each depends on the one before it.

---

## Architecture Quick Reference

| Decision | Rule |
|---|---|
| Multi-tenancy | Every table has `tenant_id` + Supabase RLS — no app-level filtering needed |
| Money | Stored as `INT` in **paise** (1 INR = 100 paise), never floats |
| Auth → Route | Role read from `profiles.role` → `/dashboard` (admin) or `/coach` (coach) |
| Batch occurrences | Computed on-the-fly from schedule, not stored as rows (Phase 2) |
| SMS gateway | Pluggable via env var — default MSG91 |
| Plan limits | Enforced server-side by `planGuard()` — Free: 15 students, 2 batches, 1 coach |

---

## Tech Stack

- **Frontend:** Next.js 14 App Router · TypeScript · Tailwind CSS · shadcn/ui
- **Backend:** Next.js Route Handlers · Supabase Edge Functions
- **Database:** Supabase PostgreSQL · Row Level Security
- **Auth:** Supabase Auth (email/password · magic link · invite token)
- **Storage:** Supabase Storage (logos · photos · PDF receipts)
- **Deploy:** Vercel (CI/CD · preview deploys · cron jobs)
- **SMS:** MSG91 (swappable via `SMS_GATEWAY` env var)

---

## Repository Structure

```
app/
  (auth)/login  /signup  /invite/[token]
  (admin)/dashboard  /students  /coaches  /batches  /calendar  /fees  /settings
  (coach)/coach/calendar  /coach/students
  api/
components/
lib/
  supabase/server.ts  client.ts  types.ts
  sms/index.ts
  pdf/index.ts
proxy.ts
supabase/migrations/
docs/
  README.md              ← you are here
  guides/                ← numbered module dev guides
  prd/                   ← product requirements documents
  hld/                   ← high level design documents
  design/                ← branding and pitch deck
```
