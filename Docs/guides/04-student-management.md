# Module 4 — Student Management

**Status:** `🚧 In Progress`
**Priority:** 4 of 8
**Back to index:** [docs/README.md](../README.md)

---

## What This Module Delivers

- Admin student CRUD as **academy-owned records** (personal, guardian, jersey details)
- Soft duplicate detection on create (never a hard fail)
- Soft-deactivate (status flip), never hard delete
- Search + status filtering; a per-student detail view
- The foundation Module 5 (Batches) builds on — a student must exist before it can be enrolled in a batch

### Deferred to fast-follows (not in this build)

| Deferred | Why / when |
|---|---|
| **CSV bulk import** (template, preview, error report) | Ship after the record model is proven (Module 4.1) |
| **Photo upload** | No Supabase Storage pattern exists yet anywhere; `photo_url` column ships, upload wired with the academy-logo bucket work |
| **14+ "invite to log in"** | Records-only for now; both nullable login FKs ship so it (and the parent portal) need no later migration |
| **Batch assignment** (`batch_students`) | Needs the `batches` table from Module 5 |

---

## ⚠️ Architecture note — read before coding

The generic "`students` keyed on `tenant_id`, REST `/api/students`, `middleware.ts`" design **does not
match this codebase**. The real model (Modules 1–3) is:

| Generic design (ignore) | This codebase (use) |
|---|---|
| `tenants` table, `tenant_id` FK | `institutions` table, `institution_id` FK |
| REST `/api/students*` routes | **Server actions** (`'use server'`), the Module 1–3 pattern |
| `middleware.ts` role-gating | **`proxy.ts`** + per-page `requireRole('admin')` (`lib/requireRole.ts`) |
| Separate `/students` route group | Single **`/dashboard`** group; admin nav links to `/dashboard/students` |
| App-level tenant filtering | **RLS** via `is_admin_of()` / `get_my_institution_ids()` (`001_foundation.sql`) |

This module mirrors **`app/dashboard/coaches/*`** almost exactly (page → client list → `[id]` detail →
`actions.ts`).

---

## Identity Model — a student is a *record*, not a login

This is the most important design rule of the module. A `students` row is a profile **owned by the
academy**, not an auth account. Login identity and enrolment are decoupled, which solves the real-world
problem that **under-14 kids have no email** and a parent often enrols multiple siblings under the
**same email**.

| Concept | Where it lives | Email rule |
|---|---|---|
| **Login identity** (admin, coach, 14+ student, parent) | `auth.users` → `profiles` | **Unique** — Supabase Auth enforces one account per email |
| **Student** (the kid being coached) | `students` | **No login required.** `guardian_email` is a shared contact field |

A parent with two kids = **one** auth account (their email) that owns **two** `students` rows, both
carrying the same `guardian_email`. No collision, because no auth user is created for the kids.

### The two nullable identity links

- **`user_id`** — set only when the student has their *own* login (typically 14+). Deferred; the column
  ships now.
- **`guardian_user_id`** — set when the parent has a login (future parent portal). Deferred; the column
  ships now, so the portal is later just `SELECT * FROM students WHERE guardian_user_id = auth.uid()`.

Both are `NULL` for the common admin-managed under-14 student. The age gate (threshold `STUDENT_LOGIN_AGE
= 14`) is a **product policy enforced in the server action, never a DB constraint.**

### Keep the two paths strictly separate

| Path | Who | Notes |
|---|---|---|
| `institution_allowed_emails` + signup trigger | admins, coaches, **14+ students** (later) | Email uniqueness is correct here. |
| Direct `students` insert (this module) | **under-14 kids** | Never touches the allowlist/signup flow, so the shared-email collision can't happen. |

---

## Database — migration `supabase/migrations/006_students.sql`

`students` keyed on `institution_id` (mirrors `005_coaches.sql`). Key columns: `full_name`,
`calling_name`, `dob`, `gender`, `guardian_name`, `guardian_mobile`, `guardian_email` (**no unique
constraint**), `sports TEXT[]`, `enrolment_date`, `status` (`active`/`inactive`), `student_code`,
jersey fields, `sms_opt_in`, and the two nullable login FKs.

Migration `007_student_fees.sql` adds two **optional** per-student fee fields captured at enrolment:
`monthly_fee` and `deposit_amount` (one-time advance / security deposit). Both are `INT` in **paise**
(the money convention) and nullable. These are student-level defaults; the payment ledger (invoices,
receipts) is Module 7. The student schema is expected to keep growing with real-world feedback — additive
migrations like this are the pattern.

**Uniqueness & duplicates** — students have no email/login, so none of the email keys apply:
- **No** hard `UNIQUE` on `(institution_id, full_name, dob)` — names collide; a hard key would reject
  legitimate students. A non-unique detection index backs the soft prompt.
- The only hard key is **`UNIQUE (institution_id, student_code)` as a *partial* index** (when
  `student_code` is non-null) — the academy-controlled roll number.

**RLS** (call the `001` helpers — never query `institution_members` inside a policy):

| Action | `USING` / `WITH CHECK` |
|---|---|
| `SELECT` | `institution_id = ANY(get_my_institution_ids()) OR user_id = auth.uid() OR guardian_user_id = auth.uid()` — members read the roster; the self/guardian clauses are forward-compatible for the future portal |
| `INSERT` / `UPDATE` / `DELETE` | `is_admin_of(institution_id)` — admins only; deletes rare (prefer soft-delete) |

After running the migration, **regenerate types via Bash** (PowerShell writes UTF-16+BOM):
`npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts`

---

## `planGuard` change

`planGuard(supabase, institutionId, 'student')` must count the **`students`** table (active rows), **not**
`institution_members` — students aren't members, so otherwise the Free-tier limit (15) never fires. The
`coach` branch still counts members. (`lib/planGuard.ts`.)

---

## Server Actions — `app/dashboard/students/actions.ts`

`'use server'`, `ActionState`, institution id from the `active_institution_id` cookie (never FormData).

| Action | Purpose |
|---|---|
| `createStudent(prev, fd)` | Validate required fields (zod); soft dup-check on `(institution_id, lower(full_name), dob)` → returns `{ duplicate, existingId }` unless `confirm='1'`; `planGuard('student')` → insert. |
| `updateStudent(prev, fd)` | Patch one student by `id` + institution. A hidden `section` field (`profile`/`guardian`/`jersey`) scopes which columns each tab writes, so tabs don't clobber each other. |
| `deactivateStudent(fd)` / `reactivateStudent(fd)` | Toggle `students.status` (soft-delete; row kept). |

---

## Pages & Components

### `/dashboard/students` — list (`page.tsx` + `StudentsClient.tsx`)
- `requireRole('admin')`. Search (name / calling name / guardian mobile) + status filter (All / Active /
  Inactive). **Add Student** opens a side sheet (`components/ui/sheet`) with the full create form, wired
  to `createStudent` via `useActionState`. On a duplicate, the footer swaps to **Add anyway / View
  existing / Cancel** ("Add anyway" resubmits with `confirm=1`). Cards link to the detail page.

### `/dashboard/students/[id]` — detail (`page.tsx` + `StudentDetail.tsx`)
- `requireRole('admin')`. Native button tabs (Tabs primitive not installed):
  1. **Profile** — name, calling name, dob, gender, student code, enrolment date, sports.
  2. **Guardian** — name, mobile, email, `sms_opt_in` toggle.
  3. **Jersey** — size, number, name.
  4. **Fees** — monthly fee + advance/deposit (₹ inputs → stored in paise); note that the full ledger is Module 7.
  5. **Batches** — placeholder (Module 5).

The **Add Student** sheet also has an optional "Fees" section so monthly fee + deposit can be set at
enrolment time.
- **Deactivate / Reactivate** button toggles status.

Sports use the shared `components/dashboard/SportsField.tsx` (chip multi-select → hidden `sports` inputs),
seeded from `institutions.sports`.

### Nav
- `components/dashboard/DashboardSidebar.tsx` — `ADMIN_NAV` now links **Students → `/dashboard/students`**
  (replacing the old unused "Members" link).

---

## Completion Checklist

- [x] `students` table + RLS, nullable `user_id` / `guardian_user_id`, `guardian_email` with no unique key
- [x] No hard `UNIQUE` on `(institution_id, full_name, dob)`; partial `UNIQUE (institution_id, student_code)`
- [x] `planGuard('student')` counts the `students` table; blocks the 16th active student on Free tier
- [x] `requireRole('admin')` gates `/dashboard/students*`
- [x] Student list with search + status filter; **Add Student** sheet creates a record
- [x] Single create returns a soft "possible duplicate" prompt (Add anyway / View existing / Cancel)
- [x] Detail page: Profile / Guardian / Jersey tabs save; Batches + Fee History placeholders
- [x] Soft-delete sets `status='inactive'` (row kept); Reactivate restores
- [x] Under-14 students are records only — never routed through `institution_allowed_emails`
- [ ] Types regenerated via **Bash** after running the migration
- [ ] _(fast-follow)_ CSV import · photo upload · 14+ login invite · batch assignment

---

## Depends On

[Module 3 — Coach Management](./03-coach-management.md)

## Unlocks

[Module 5 — Batch Management](./05-batch-management.md)
